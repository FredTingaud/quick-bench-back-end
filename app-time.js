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

var upload = multer();

const MAX_CODE_LENGTH = 20000;
const WRITE_PATH = '/data';
const PREFIX_CODE_1 = `#include <benchmark/benchmark_api.h>
`;
const SUFFIX_CODE_1 = `

static void Noop(benchmark::State& state) {
  while (state.KeepRunning());
}
BENCHMARK(Noop);
BENCHMARK_MAIN()`;
const PREFIX_CODE_2 = `#include <benchmark/benchmark.h>
`;
const SUFFIX_CODE_2 = `

static void Noop(benchmark::State& state) {
  for (auto _ : state) benchmark::DoNotOptimize(0);
}
BENCHMARK(Noop);
BENCHMARK_MAIN()`;
const SUFFIX_CODE_3 = `

static void Noop(benchmark::State& state) {
  for (auto _ : state) benchmark::DoNotOptimize(0);
}
BENCHMARK(Noop);
BENCHMARK_MAIN();`;

const NOOP_BUILD = 'int main() {return 0;}';

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

function runDockerCommand(fileName, request, force) {
    return './run-docker-builder ' + fileName + ' ' + request.compiler + ' ' + request.optim + ' ' + request.cppVersion + ' ' + (request.isAnnotated || false) + ' ' + (force || false) + ' ' + (request.lib || 'gnu');
}

function optionsToString(request, protocolVersion) {
    let options = {
        "protocolVersion": protocolVersion,
        "compiler": request.compiler,
        "optim": request.optim,
        "cppVersion": request.cppVersion,
        "isAnnotated": request.isAnnotated,
        "lib": request.lib
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
                    res: fs.readFileSync(fileName + '.out'),
                    stdout: stderr,
                    id: encodeName(makeCodeName(request, protocolVersion))
                });
            }
        });
    });
}

function groupResults(results, id) {
    let code = results[0];
    let options = results[1];
    let graph = results[2];
    return { code: code, options: JSON.parse(options), graph: graph, id: id };
}

function makeCodeName(tab, protocolVersion) {
    return sha1(tab.code + tab.compiler + tab.optim + tab.cppVersion + tab.lib + protocolVersion);
}
function makeName(request) {
    return sha1(request.tabs.reduce(u => makeCodeName(u, request.protocolVersion)) + request.protocolVersion);
}

function wrapCode(inputCode) {
    return PREFIX_CODE_2 + inputCode + SUFFIX_CODE_3;
}

function unwrapCode(inputCode) {
    if (inputCode.startsWith(PREFIX_CODE_1)) {
        inputCode = inputCode.slice(PREFIX_CODE_1.length);
    }
    if (inputCode.endsWith(SUFFIX_CODE_1)) {
        inputCode = inputCode.slice(0, -SUFFIX_CODE_1.length);
    }
    if (inputCode.startsWith(PREFIX_CODE_2)) {
        inputCode = inputCode.slice(PREFIX_CODE_2.length);
    }
    if (inputCode.endsWith(SUFFIX_CODE_2)) {
        inputCode = inputCode.slice(0, -SUFFIX_CODE_2.length);
    }
    if (inputCode.endsWith(SUFFIX_CODE_3)) {
        inputCode = inputCode.slice(0, -SUFFIX_CODE_3.length);
    }
    return inputCode;
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

function getFunctions(code) {
    RE = /BENCHMARK\s*\(\s*([A-Za-z0-9_]+)\s*\)/g;
    let content='';
    let res;
    while ((res = RE.exec(code)) !== null) {
        content+= res[1] + '\n';
    }
    return content;
}

function filename(name) {
    let dir = WRITE_PATH + '/' + name.substr(0, 2);
    return  dir + '/' + name;
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

async function reloadOne(id) {
    const fileName = filename(id);
    const values = await Promise.all([read(fileName + '.cpp'), read(fileName + '.opt'), read(fileName + '.out')]);
    return groupResults(values, id);
}

async function reload(encodedName) {
    let fileName = filename(decodeName(encodedName));
    const ids = await read(fileName + '.res');
    return await Promise.all(ids.split("\n").map(id => reloadOne(decodeName(id))));
}

function readBuildResults(values) {
    if (values.res == null) return {};
    let results = values.res.toString().split('\n');
    let times = [];
    let memories = [];
    for (let i = 0; i < results.length; i++) {
	let s = results[i].split('\t');
	if (s.length === 2) {
	    times.push(s[0]);
	    memories.push(s[1]);
	}
    }
    return {
	times: times,
	memories: memories,
    };
}

function makeBuildGraphResult(values) {
    let result = values.map(v => readBuildResults(v));
    let message = values.map(v => v.stdout).reduce((r, v) => r + '\n' + v);
    let idsList = values.map(v => v.id).reduce((r, v) => r + '\n' + v);
    let id = sha1(idsList);
    write(filename(id) + '.res', idsList);
    return {
        result: result,
        message: message,
        id: encodeName(id)
    };
}

function makeOneResult(done) {
    return {
        code: done.code,
        compiler: done.options.compiler,
        optim: done.options.optim,
        cppVersion: done.options.cppVersion,
        lib: done.options.lib,
        protocolVersion: done.options.protocolVersion
    };
}

function makeWholeResult(done) {
    return Object.assign({ tabs: done.map(d => makeOneResult(d)) }, makeBuildGraphResult(done.map(d => {
        return {
            res: d.graph,
            stdout: '',
            id: encodeName(d.id)
        };
    })));
}

app.post('/', upload.array(), function (req, res) {
    Promise.resolve(benchmark(req.body, req.headers))
        .then((done) => res.json(makeBuildGraphResult(done)))
        .catch((err) => res.json({ message: err }));
});

app.get('/get/:id', upload.array(), function (req, res) {
    console.log('Get ' + req.params.id + ' ' + JSON.stringify(req.headers));
    Promise.resolve(reload(req.params.id))
        .then((done) => res.json(makeWholeResult(done)))
        .catch(() => res.json({ message: 'Could not load given id' }));
});

app.listen(3000, function () {
    console.log('Listening to commands');
});

exports.makeName = makeName;
exports.encodeName = encodeName;
exports.decodeName = decodeName;
exports.wrapCode = wrapCode;
exports.unwrapCode = unwrapCode;
exports.groupResults = groupResults;
exports.getFunctions = getFunctions;
exports.optionsToString = optionsToString;
exports.execute = execute;
