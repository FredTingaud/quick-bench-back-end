var exec = require('child_process').exec;
var fs = require('fs');
const tools = require('./tools');
var sha1 = require('sha1');
const docker = require('./docker');

var AVAILABLE_CONTAINERS = [];

const MAX_CODE_LENGTH = process.env.BB_CODE_LIMIT || 20000;
const TIMEOUT = process.env.BB_TIMEOUT < 0 ? 0 : (process.env.BB_TIMEOUT + 10 || 70);

const WRITE_PATH = '/data';

function listContainers() {
    AVAILABLE_CONTAINERS = [];
    docker.listContainers(AVAILABLE_CONTAINERS);
}

function cleanFilename(text) {
    if (text === '')
        return '_';
    return text.replace(/[^\w-]/gi, '_');
}

function runDockerCommand(fileName, request, force) {
    return `./run-docker-builder ${fileName} ${request.compiler} ${request.optim} ${request.cppVersion} ${(request.isAnnotated || false)} ${(force || false)} ${(request.lib || 'gnu')} ${cleanFilename(request.title)} ${(request.asm || 'none')} ${(request.withPP || false)}`;
}

function optionsToString(request, protocolVersion) {
    let options = {
        "protocolVersion": protocolVersion,
        "compiler": request.compiler,
        "optim": request.optim,
        "cppVersion": request.cppVersion,
        "lib": request.lib,
        "asm": request.asm,
        "preprocessed": request.withPP
    };
    return JSON.stringify(options);
}

function execute(fileName, request, protocolVersion, force) {
    let options = {
        timeout: TIMEOUT * 1000,
        killSignal: 'SIGKILL'
    };
    return new Promise((resolve, reject) => {
        console.time(fileName);
        return exec(runDockerCommand(fileName, request, force), options, function (err, stdout, stderr) {
            if (err) {
                console.timeEnd(fileName);
                console.log('Bench failed ' + fileName);
                exec("./kill-docker " + fileName);
                reject("\u001b[0m\u001b[0;1;31mError or timeout\u001b[0m\u001b[1m<br>" + stdout + "<br>" + stderr);
            } else {
                console.timeEnd(fileName);
                console.log('Bench done ' + fileName + (stderr.indexOf('cached results') > -1 ? ' from cache' : ''));
                resolve({
                    res: fs.readFileSync(fileName + '.build', 'utf8'),
                    includes: fs.readFileSync(fileName + '.inc', 'utf8'),
                    asm: request.asm && request.asm.length > 0 ? fs.readFileSync(fileName + '.s', 'utf8') : null,
                    preprocessed: request.withPP ? fs.readFileSync(fileName + '.i', 'utf8') : null,
                    stdout: stderr,
                    id: tools.encodeName(makeCodeName(request, protocolVersion)),
                    title: request.title
                });
            }
        });
    });
}

function groupResults(results, id, name) {
    let code = results[0];
    let options = results[1];
    let graph = results[2];
    let includes = results[3];
    let preprocessed = results[4];
    let asm = results[5];
    return { code: code, options: JSON.parse(options), graph: graph, id: id, title: name, includes: includes, preprocessed: preprocessed, asm: asm };
}

function makeCodeName(tab, protocolVersion) {
    return sha1(tab.code + tab.compiler + tab.optim + tab.cppVersion + tab.lib + tab.withPP + tab.asm + protocolVersion);
}
function makeName(request) {
    return sha1(request.tabs.reduce(u, curr => u + makeCodeName(curr, request.protocolVersion)) + request.protocolVersion);
}

function filename(name) {
    let dir = WRITE_PATH + '/' + name.substr(0, 2);
    return dir + '/' + name;
}

async function benchmarkOneBuild(tab, protocolVersion, force) {
    try {
        if (MAX_CODE_LENGTH > 0 && tab.code.length > MAX_CODE_LENGTH) {
            return Promise.reject(`\u001b[0m\u001b[0;1;31mError: Unauthorized code length in {$unit.title}.\u001b[0m\u001b[1m`);
        }
        let name = makeCodeName(tab, protocolVersion);
        console.log('Bench ' + name + ' < ' + optionsToString(tab, protocolVersion));
        let fileName = filename(name);
        await tools.write(fileName + '.cpp', tab.code);
        await tools.write(fileName + '.opt', optionsToString(tab, protocolVersion));
        return await execute(fileName, tab, protocolVersion, force);
    } catch (e) {
        return { stdout: e };
    }
}

async function benchmark(request, header) {
    return await Promise.all(request.tabs.map(u => benchmarkOneBuild(u, request.protocolVersion, request.force)));
}

async function reloadOne(id, name) {
    const fileName = filename(id);
    const values = await Promise.all([tools.read(fileName + '.cpp'), tools.read(fileName + '.opt'), tools.read(fileName + '.build'), tools.read(fileName + '.inc'), tools.read(fileName + '.i', true), tools.read(fileName + '.s', true)]);
    return groupResults(values, id, name);
}

async function reload(encodedName) {
    let fileName = filename(tools.decodeName(encodedName));
    const ids = await tools.read(fileName + '.res');
    return await Promise.all(ids.split("\n").map(s => {
        const info = s.split("\t");
        return reloadOne(tools.decodeName(info[0]), info[1]);
    }));
}

function readBuildResults(values) {
    if (!values.res) return {};
    let results = values.res.split('\n');
    let times = [];
    let memories = [];
    let inputs = [];
    let outputs = [];
    let pagefaults = [];
    for (let i = 0; i < results.length; i++) {
        let s = results[i].split('\t');
        if (s.length === 7) {
            times.push({ user: s[0], kernel: s[1] });
            memories.push(s[2]);
            inputs.push(s[3]);
            outputs.push(s[4]);
            pagefaults.push({ major: s[5], minor: s[6] });
        }
    }
    return {
        times: times,
        memories: memories,
        inputs: inputs,
        outputs: outputs,
        pagefaults: pagefaults
    };
}

function makeBuildGraphResult(values) {
    let result = values.map(v => readBuildResults(v));
    let messages = values.map(v => v.stdout);
    let includes = values.map(v => v.includes);
    let asm = values.map(v => v.asm);
    let preprocessed = values.map(v => v.preprocessed);
    let idsList = values.map(v => `${v.id}\t${v.title}`).reduce((r, v) => r + '\n' + v);
    let id = sha1(idsList);
    tools.write(filename(id) + '.res', idsList);
    return {
        result: result,
        messages: messages,
        includes: includes,
        asm: asm,
        preprocessed: preprocessed,
        id: tools.encodeName(id)
    };
}

function makeOneRequest(done) {
    return {
        code: done.code,
        compiler: done.options.compiler,
        optim: done.options.optim,
        cppVersion: done.options.cppVersion,
        lib: done.options.lib,
        protocolVersion: done.options.protocolVersion,
        title: done.title
    };
}

function getRequestAndResult(done) {
    return Object.assign({ tabs: done.map(d => makeOneRequest(d)) }, makeBuildGraphResult(done.map(d => {
        return {
            res: d.graph,
            stdout: '',
            includes: d.includes,
            asm: d.asm,
            preprocessed: d.preprocessed,
            id: tools.encodeName(d.id)
        };
    })));
}

function getEnv() {
    return {
        maxCodeLength: MAX_CODE_LENGTH,
        timeout: TIMEOUT,
        containers: AVAILABLE_CONTAINERS
    };
}

exports.listContainers = listContainers;
exports.makeName = makeName;
exports.groupResults = groupResults;
exports.optionsToString = optionsToString;
exports.execute = execute;
exports.cleanFilename = cleanFilename;
exports.makeBuildGraphResult = makeBuildGraphResult;
exports.benchmark = benchmark;
exports.reload = reload;
exports.getRequestAndResult = getRequestAndResult;
exports.getEnv = getEnv;
