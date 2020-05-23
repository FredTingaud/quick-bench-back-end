#!/usr/bin/env node

var express = require('express');
var cors = require('cors');
var fs = require('fs');
const path = require('path');
var app = express();
app.use(express.static(path.join(__dirname, 'quick-bench-front-end', 'build')));
var exec = require('child_process').exec;
var sha1 = require('sha1');
var bodyParser = require('body-parser');
var multer = require('multer');
const PORT = process.env.BB_PORT | 4000;

var upload = multer();

const MAX_CODE_LENGTH = 20000;
const WRITE_PATH = '/data';

app.use(bodyParser.json());
app.use(cors());

function write(fileName, code) {
    return new Promise((resolve, reject) => {
        fs.writeFile(fileName, code, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function read(fileName, acceptMissing) {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, 'utf8', (err, data) => {
            if (err) {
                if (acceptMissing && err.code === 'ENOENT') {
                    resolve(null);
                } else {
                    reject(err);
                }
            } else {
                resolve(data);
            }
        });
    });
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
        timeout: 60000,
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
                    res: fs.readFileSync(fileName + '.build'),
                    includes: fs.readFileSync(fileName + '.inc'),
                    asm: request.asm && request.asm.length > 0 ? fs.readFileSync(fileName + '.s') : null,
                    preprocessed: request.withPP ? fs.readFileSync(fileName + '.i') : null,
                    stdout: stderr,
                    id: encodeName(makeCodeName(request, protocolVersion)),
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

function encodeName(id) {
    let short = new Buffer(id, 'hex').toString('base64');
    short = short.replace(new RegExp('/', 'g'), '-').replace(new RegExp('\\+', 'g'), '_');
    return short.slice(0, -1);
}

function decodeName(short) {
    short = short.replace(new RegExp('\\-', 'g'), '/').replace(new RegExp('_', 'g'), '+ ') + '=';
    return new Buffer(short, 'base64').toString('hex');
}

function filename(name) {
    let dir = WRITE_PATH + '/' + name.substr(0, 2);
    return dir + '/' + name;
}

async function benchmarkOneBuild(tab, protocolVersion, force) {
    try {
        if (tab.code.length > MAX_CODE_LENGTH) {
            return Promise.reject(`\u001b[0m\u001b[0;1;31mError: Unauthorized code length in {$unit.title}.\u001b[0m\u001b[1m`);
        }
        let name = makeCodeName(tab, protocolVersion);
        console.log('Bench ' + name + ' < ' + optionsToString(tab, protocolVersion));
        let fileName = filename(name);
        await write(fileName + '.cpp', tab.code);
        await write(fileName + '.opt', optionsToString(tab, protocolVersion));
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
    const values = await Promise.all([read(fileName + '.cpp'), read(fileName + '.opt'), read(fileName + '.build'), read(fileName + '.inc'), read(fileName + '.i', true), read(fileName + '.s', true)]);
    return groupResults(values, id, name);
}

async function reload(encodedName) {
    let fileName = filename(decodeName(encodedName));
    const ids = await read(fileName + '.res');
    return await Promise.all(ids.split("\n").map(s => {
        const info = s.split("\t");
        return reloadOne(decodeName(info[0]), info[1]);
    }));
}

function readBuildResults(values) {
    if (!values.res) return {};
    let results = values.res.toString().split('\n');
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
        else {
            console.error(`unexpected number of values in ${results[i]}`);
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
    write(filename(id) + '.res', idsList);
    return {
        result: result,
        messages: messages,
        includes: includes,
        asm: asm,
        preprocessed: preprocessed,
        id: encodeName(id)
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

function makeRequestAndReply(done) {
    return Object.assign({ tabs: done.map(d => makeOneRequest(d)) }, makeBuildGraphResult(done.map(d => {
        return {
            res: d.graph,
            stdout: '',
            includes: d.includes,
            asm: d.asm,
            preprocessed: d.preprocessed,
            id: encodeName(d.id)
        };
    })));
}

app.post('/build', upload.array(), function (req, res) {
    Promise.resolve(benchmark(req.body, req.headers))
        .then((done) => res.json(makeBuildGraphResult(done)))
        .catch((err) => res.json({ messages: [err] }));
});

app.get('/build/:id', upload.array(), function (req, res) {
    console.log('Get ' + req.params.id + ' ' + JSON.stringify(req.headers));
    Promise.resolve(reload(req.params.id))
        .then((done) => res.json(makeRequestAndReply(done)))
        .catch(() => res.json({ messages: [`Could not load ${req.params.id}`] }));
});

app.get('/:id', upload.array(), function (req, res) {
    res.redirect(`/b/${req.params.id}`);
});

app.get('/b/:id', upload.array(), function (req, res) {
    res.sendFile(path.join(__dirname, 'quick-bench-front-end', 'build', 'index.html'));
});

app.listen(PORT, function () {
    console.log(`Listening to commands on port ${PORT}`);
});

exports.makeName = makeName;
exports.encodeName = encodeName;
exports.decodeName = decodeName;
exports.groupResults = groupResults;
exports.optionsToString = optionsToString;
exports.execute = execute;
exports.cleanFilename = cleanFilename;
