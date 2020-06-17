#!/usr/bin/env node

var express = require('express');
var cors = require('cors');
const path = require('path');
var app = express();
app.use(express.static(path.join(__dirname, 'quick-bench-front-end', 'build-bench', 'build')));
var bodyParser = require('body-parser');
var multer = require('multer');
const libbuild = require('src/libbuild');

const PORT = process.env.BB_PORT | 4000;

var upload = multer();

app.use(bodyParser.json());
app.use(cors());


app.post('/build', upload.array(), function (req, res) {
    Promise.resolve(libbuild.benchmark(req.body, req.headers))
        .then((done) => res.json(libbuild.makeBuildGraphResult(done)))
        .catch((err) => res.json({ messages: [err] }));
});

app.get('/build/:id', upload.array(), function (req, res) {
    console.log('Get ' + req.params.id + ' ' + JSON.stringify(req.headers));
    Promise.resolve(libbuild.reload(req.params.id))
        .then((done) => res.json(libbuild.getRequestAndResult(done)))
        .catch(() => res.json({ messages: [`Could not load ${req.params.id}`] }));
});

app.get('/:id', upload.array(), function (req, res) {
    res.redirect(`/b/${req.params.id}`);
});

app.get('/b/:id', upload.array(), function (req, res) {
    res.sendFile(path.join(__dirname, 'quick-bench-front-end', 'build-bench', 'build', 'index.html'));
});

app.listen(PORT, function () {
    console.log(`Listening to commands on port ${PORT}`);
});
