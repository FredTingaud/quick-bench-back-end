#!/usr/bin/env node

var express = require('express');
var cors = require('cors');
const path = require('path');
var app = express();
app.use(express.static(path.join(__dirname, 'quick-bench-front-end', 'build-bench', 'build')));
var bodyParser = require('body-parser');
var multer = require('multer');
const libbuild = require('./src/libbuild');

const PORT = process.env.BB_PORT | 4000;

var upload = multer();

app.use(bodyParser.json());
app.use(cors());

libbuild.updateAvailableContainersList();

app.get('/build-env', upload.array(), function (req, res) {
    res.json(libbuild.getEnv());
});

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

app.get('/containers/', upload.array(), function (req, res) {
    if (process.env.ALLOW_CONTAINER_DOWNLOAD) {
        Promise.resolve(docker.getTags()).then(t => res.json({ "tags": t }));
    } else {
        res.status(403).send({
            message: 'Access Forbidden'
        });
    }
});

app.post('/containers/', upload.array(), function (req, res) {
    if (process.env.ALLOW_CONTAINER_DOWNLOAD) {
        Promise.resolve(docker.loadContainers(req.body.tags))
            .then(() => libbuild.updateAvailableContainersList())
            .then(() => res.json(libbuild.getEnv()))
            .catch(e => res.status(500).send('Could not load containers'));
    } else {
        res.status(403).send({
            message: 'Access Forbidden'
        });
    }
});

app.delete('/containers/', upload.array(), function (req, res) {
    if (process.env.ALLOW_CONTAINER_DOWNLOAD) {
        Promise.resolve(docker.deleteContainers(req.body.tags))
            .then(() => libbuild.updateAvailableContainersList())
            .then(() => res.json(libbuild.getEnv()))
            .catch(e => res.status(500).send('Could not delete containers'));
    } else {
        res.status(403).send({
            message: 'Access Forbidden'
        });
    }
});

app.listen(PORT, function () {
    console.log(`Listening to commands on port ${PORT}`);
});
