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

function runDockerCommand(fileName, request) {
    return './run-docker-builder ' + fileName + ' ' + request.compiler + ' ' + request.optim + ' ' + request.cppVersion + ' ' + (request.isAnnotated || false) + ' ' + (request.force || false) + ' ' + (request.lib || 'gnu');
}

function optionsToString(request) {
    let options = {
        "protocolVersion": request.protocolVersion,
        "compiler": request.compiler,
        "optim": request.optim,
        "cppVersion": request.cppVersion,
        "isAnnotated": request.isAnnotated,
        "lib": request.lib
    };
    return JSON.stringify(options);
}

function execute(fileName, request) {
    let options = {
        timeout: 60000,
        killSignal: 'SIGKILL'
    };
    return new Promise((resolve, reject) => {
        console.time(fileName);
        return exec(runDockerCommand(fileName, request), options, function (err, stdout, stderr) {
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
                });
            }
        });
    });
}

function groupResults(results) {
    return new Promise((resolve, reject) => {
        let code = unwrapCode(results[0]);
        let options = results[1];
        let graph = results[2];
        let annotation = results[3];
        resolve({ code: code, options: JSON.parse(options), graph: JSON.parse(graph), annotation: annotation });
    });
}

function makeCodesName(unit) {
    return sha1(unit.code + unit.compiler + unit.optim + unit.cppVersion + unit.lib);
}
function makeName(request) {
    return sha1(request.units.reduce(u => makeCodesName(u)) + request.protocolVersion);
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

async function benchmarkOneBuild(unit) {
    try {
    if (unit.code.length > MAX_CODE_LENGTH) {
        return Promise.reject(`\u001b[0m\u001b[0;1;31mError: Unauthorized code length in {$unit.title}.\u001b[0m\u001b[1m`);
    }
    let name = makeCodesName(unit);
    console.log('Bench ' + name + ' < ' + optionsToString(unit));
    var dir = WRITE_PATH + '/' + name.substr(0, 2);
    var fileName = dir + '/' + name;
	await Promise.resolve(write(fileName + '.cpp', unit.code));
	await write(fileName + '.opt', optionsToString(unit));
	return await execute(fileName, unit);
    } catch (e) {
	return { stdout: e };
    }
}

async function benchmark(request, header) {
    return request.units.map(u => benchmarkOneBuild(u));
}

async function reload(encodedName) {
    let name = decodeName(encodedName);
    var dir = WRITE_PATH + '/' + name.substr(0, 2);
    var fileName = dir + '/' + name;
    const values = await Promise.all([read(fileName + '.cpp'), read(fileName + '.opt'), read(fileName + '.out'), read(fileName + '.perf', true)]);
    return await groupResults(values);
}

function makeGraphResult(values, message, id, annotation) {
    let result = { context: values.context };
    let noopTime = values.benchmarks[values.benchmarks.length - 1].cpu_time;
    result.benchmarks = values.benchmarks.map(obj => {
        return {
            name: obj.name,
            cpu_time: obj.cpu_time / noopTime
        };
    });
    return { result: result, message: message, id: id, annotation: annotation };
}

function makeWholeResult(done) {
    let result = {
        code: done.code,
        compiler: done.options.compiler,
        optim: done.options.optim,
        cppVersion: done.options.cppVersion,
        isAnnotated: done.options.isAnnotated,
        lib: done.options.lib,
        protocolVersion: done.options.protocolVersion
    };

    return Object.assign(result, makeGraphResult(done.graph, '', encodeName(makeName(result)), done.annotation));
}

app.post('/', upload.array(), function (req, res) {
    Promise.resolve(benchmark(req.body, req.headers))
        .then((done) => res.json(makeGraphResult(JSON.parse(done.res), done.stdout, done.id, done.annotation)))
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
