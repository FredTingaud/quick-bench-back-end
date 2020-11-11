#!/usr/bin/env node

var express = require('express');
var cors = require('cors');
const path = require('path');
var app = express();
app.use(express.static(path.join(__dirname, 'quick-bench-front-end', 'quick-bench', 'build')));
var bodyParser = require('body-parser');
var multer = require('multer');
var libquick = require('./src/libquick');

const PORT = process.env.QB_PORT | 4000;

var upload = multer();


app.use(bodyParser.json());
app.use(cors());

app.get('/quick-env', upload.array(), function (req, res) {
    res.json(libquick.getEnv());
});

app.post('/quick', upload.array(), function (req, res) {
    Promise.resolve(libquick.benchmark(req.body, req.headers))
        .then((done) => res.json(libquick.makeGraphResult(done.res ? JSON.parse(done.res) : null, done.stdout, done.id, done.annotation)))
        .catch((err) => res.json({ message: err }));
});

app.get('/quick/:id', upload.array(), function (req, res) {
    console.log('Get ' + req.params.id + ' ' + JSON.stringify(req.headers));
    Promise.resolve(libquick.reload(req.params.id))
        .then((done) => res.json(libquick.getRequestAndResult(done)))
        .catch(() => res.json({ message: 'Could not load given id' }));
});

app.get('/:id', upload.array(), function (req, res) {
    res.redirect(`/q/${req.params.id}`);
});

app.get('/q/:id', upload.array(), function (req, res) {
    res.sendFile(path.join(__dirname, 'quick-bench-front-end', 'quick-bench', 'build', 'index.html'));
});

app.listen(PORT, function () {
    console.log(`Listening to commands on port ${PORT}`);
});
