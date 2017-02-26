var express = require('express')
var fs = require('fs');
var app = express();
var exec = require('child_process').exec;

var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();

app.use(bodyParser.json());

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

function execute(fileName) {
    return new Promise((resolve, reject) => {
	exec("./run-docker " + fileName, function(err, stdout, stderr) {
	    if (err) {
		reject(err);
	    } else if (stderr){
		reject(stderr);
	    } else {
		resolve(stdout);
	    }
	});
    });
}

function treat(code) {
    var fileName = "/tmp/test";
    return Promise.resolve(write(fileName, code)).then(() => execute(fileName));
}

app.post('/',  upload.array(), function(req, res) {
    Promise.resolve(treat(req.body.code)).then((done)=> res.json(done));
})

app.listen(3000, function() {
    console.log('Listening to commands');
});
