var express = require('express')
var cors = require('cors')
var fs = require('fs');
var app = express();
var exec = require('child_process').exec;
var sha1 = require('sha1');
var bodyParser = require('body-parser');
var multer = require('multer');

var upload = multer();

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

function execute(fileName) {
    return new Promise((resolve, reject) => {
	exec("./run-docker " + fileName, function(err, stdout, stderr) {
	    if (err) {
		reject(stdout);
	    } else if (stderr){
		reject(stderr);
	    } else {
		resolve(stdout);
	    }
	});
    });
}

function treat(code) {
    var fileName = '/tmp/' + sha1(code);
    return Promise.resolve(write(fileName, code)).then(() => execute(fileName));
}

app.post('/',  upload.array(), function(req, res) {
    Promise.resolve(treat(req.body.code)).then((done)=> res.json({result: done})).catch((err)=> res.json({error: err}));
})

app.listen(3000, function() {
    console.log('Listening to commands');
});
