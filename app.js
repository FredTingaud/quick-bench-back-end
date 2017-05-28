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

function runDockerCommand(fileName, request) {
    return './run-docker ' + fileName + ' ' + request.compiler + ' ' + request.optim + ' ' + request.cppVersion + (request.force ? ' -f' : '');
}

function optionsToString(request) {
    let options = {
        "protocolVersion": request.protocolVersion,
        "compiler": request.compiler,
        "optim": request.optim,
        "cppVersion": request.cppVersion
    };
    return JSON.stringify(options);
}

function execute(fileName, request) {
    let options = {
        timeout: 30000,
        killSignal: 'SIGKILL'
    }
    return new Promise((resolve, reject) => {
        exec(runDockerCommand(fileName, request), options, function (err, stdout, stderr) {
            if (err) {
                exec("./kill-docker " + fileName);
                reject("\u001b[0m\u001b[0;1;31mError or timeout\u001b[0m\u001b[1m<br>" + stdout);
            } else {
                resolve({ res: fs.readFileSync(fileName + '.out'), stdout: stderr, id: makeName(request) });
            }
        });
    });
}

function makeName(request) {
    return sha1(request.code + request.compiler + request.optim + request.cppVersion + request.protocolVersion);
}

function makeCode(inputCode) {
    return `#include <benchmark/benchmark_api.h>
${inputCode}

static void Noop(benchmark::State& state) {
  while (state.KeepRunning());
}
BENCHMARK(Noop);
BENCHMARK_MAIN()`;
}

function treat(request) {
    if (request.code.length > MAX_CODE_LENGTH) {
        return Promise.reject('\u001b[0m\u001b[0;1;31mError: Unauthorized code length.\u001b[0m\u001b[1m');
    }
    let name = makeName(request);
    var dir = WRITE_PATH + '/' + name.substr(0, 2);
    var fileName = dir + '/' + name;
    return Promise.resolve(write(fileName + '.cpp', makeCode(request.code)))
        .then(() => write(fileName + '.opt', optionsToString(request)))
        .then(() => execute(fileName, request));
}

function makeResult(done) {
    let values = JSON.parse(done.res);
    let result = { context: values.context };
    let noopTime = values.benchmarks[values.benchmarks.length - 1].cpu_time;
    result.benchmarks = values.benchmarks.map(obj => {
        return {
            name: obj.name,
            cpu_time: obj.cpu_time / noopTime
        }
    });
    return { result: result, message: done.stdout, id: done.id }
}

app.post('/', upload.array(), function (req, res) {
    Promise.resolve(treat(req.body))
        .then((done) => res.json(makeResult(done)))
        .catch((err) => res.json({ message: err }));
})

app.listen(3000, function() {
    console.log('Listening to commands');
});
