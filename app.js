#!/usr/bin/env node

var express = require('express')
var cors = require('cors')
var fs = require('fs');
var app = express();
var exec = require('child_process').exec;
var sha1 = require('sha1');
var bodyParser = require('body-parser');
var multer = require('multer');

var upload = multer();

const MAX_CODE_LENGTH = 20000;
const WRITE_PATH = '/data';
const PREFIX_CODE_1 = `#include <benchmark/benchmark.h>
`;
const SUFFIX_CODE_1 = `

static void Noop(benchmark::State& state) {
  while (state.KeepRunning());
}
BENCHMARK(Noop);
BENCHMARK_MAIN()`;

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
    return './run-docker ' + fileName + ' ' + request.compiler + ' ' + request.optim + ' ' + request.cppVersion + ' ' + (request.isAnnotated || false) + ' ' + request.force;
}

function optionsToString(request) {
    let options = {
        "protocolVersion": request.protocolVersion,
        "compiler": request.compiler,
        "optim": request.optim,
        "cppVersion": request.cppVersion,
        "isAnnotated": request.isAnnotated
    };
    return JSON.stringify(options);
}

function execute(fileName, request) {
    let options = {
        timeout: 60000,
        killSignal: 'SIGKILL'
    }
    return new Promise((resolve, reject) => {
        exec(runDockerCommand(fileName, request), options, function (err, stdout, stderr) {
            if (err) {
                exec("./kill-docker " + fileName);
                reject("\u001b[0m\u001b[0;1;31mError or timeout\u001b[0m\u001b[1m<br>" + stdout + "<br>" + stderr);
            } else {
                resolve({
                    res: fs.readFileSync(fileName + '.out'),
                    stdout: stderr,
                    id: encodeName(makeName(request)),
                    annotation: request.isAnnotated ? fs.readFileSync(fileName + '.perf', 'utf8') : null
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

function makeName(request) {
    if (request.protocolVersion === 1)
        return sha1(request.code + request.compiler + request.optim + request.cppVersion + request.protocolVersion);
    return sha1(request.code + request.compiler + request.optim + request.cppVersion + request.isAnnotated + request.protocolVersion);
}

function wrapCode(inputCode) {
    return PREFIX_CODE_1 + inputCode + SUFFIX_CODE_1;
}

function unwrapCode(inputCode) {
    if (inputCode.startsWith(PREFIX_CODE_1)) {
        inputCode = inputCode.slice(PREFIX_CODE_1.length);
    }
    if (inputCode.endsWith(SUFFIX_CODE_1)) {
        inputCode = inputCode.slice(0, -SUFFIX_CODE_1.length);
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

function benchmark(request) {
    if (request.code.length > MAX_CODE_LENGTH) {
        return Promise.reject('\u001b[0m\u001b[0;1;31mError: Unauthorized code length.\u001b[0m\u001b[1m');
    }
    let name = makeName(request);
    var dir = WRITE_PATH + '/' + name.substr(0, 2);
    var fileName = dir + '/' + name;
    return Promise.resolve(write(fileName + '.cpp', wrapCode(request.code)))
        .then(() => write(fileName + '.func', getFunctions(request.code)))
        .then(() => write(fileName + '.opt', optionsToString(request)))
        .then(() => execute(fileName, request));
}

function reload(encodedName) {
    let name = decodeName(encodedName);
    var dir = WRITE_PATH + '/' + name.substr(0, 2);
    var fileName = dir + '/' + name;
    return Promise.all([read(fileName + '.cpp'), read(fileName + '.opt'), read(fileName + '.out'), read(fileName + '.perf', true)])
        .then((values) => groupResults(values));
}

function makeGraphResult(values, message, id, annotation) {
    let result = { context: values.context };
    let noopTime = values.benchmarks[values.benchmarks.length - 1].cpu_time;
    result.benchmarks = values.benchmarks.map(obj => {
        return {
            name: obj.name,
            cpu_time: obj.cpu_time / noopTime
        }
    });
    return { result: result, message: message, id: id, annotation: annotation }
}

function makeWholeResult(done) {
    let result = {
        code: done.code,
        compiler: done.options.compiler,
        optim: done.options.optim,
        cppVersion: done.options.cppVersion,
        isAnnotated: done.options.isAnnotated,
        protocolVersion: done.options.protocolVersion
    };

    return Object.assign(result, makeGraphResult(done.graph, '', encodeName(makeName(result)), done.annotation));
}

app.post('/', upload.array(), function (req, res) {
    Promise.resolve(benchmark(req.body))
        .then((done) => res.json(makeGraphResult(JSON.parse(done.res), done.stdout, done.id, done.annotation)))
        .catch((err) => res.json({ message: err }));
});

app.get('/get/:id', upload.array(), function (req, res) {
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
