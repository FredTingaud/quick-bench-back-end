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

function execute(fileName, compiler, optim, version) {
    let options = {
        timeout: 30000,
        killSignal: 'SIGKILL'
    }
    return new Promise((resolve, reject) => {
        exec('./run-docker ' + fileName + ' ' + compiler + ' ' + optim + ' ' + version, options, function (err, stdout, stderr) {
            if (err) {
                exec("./kill-docker " + fileName);
                reject("\u001b[0m\u001b[0;1;31mError or timeout\u001b[0m\u001b[1m<br>" + stdout);
            } else {
                resolve({ res: fs.readFileSync(fileName + '.out'), stdout: stderr});
            }
        });
    });
}

function treat(code, compiler, optim, version) {
    if (code.length > MAX_CODE_LENGTH) {
        return Promise.reject('\u001b[0m\u001b[0;1;31mError: Unauthorized code length.\u001b[0m\u001b[1m');
    }
    var fileName = '/tmp/' + sha1(code + compiler + optim + version);
    code = '#include <benchmark/benchmark_api.h>\n' + code + '\nBENCHMARK_MAIN()';
    return Promise.resolve(write(fileName, code)).then(() => execute(fileName, compiler, optim, version));
}

app.post('/', upload.array(), function (req, res) {
    Promise.resolve(treat(req.body.code, req.body.compiler, req.body.optim, req.body.version))
	.then((done) => res.json({ result: JSON.parse(done.res), message: done.stdout })).catch((err) => res.json({ message: err }));
})

app.listen(3000, function() {
    console.log('Listening to commands');
});
