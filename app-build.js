#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import path from 'path';
import url from 'url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();
app.use(express.static(path.join(__dirname, 'quick-bench-front-end', 'build-bench', 'build')));
import bodyParser from 'body-parser';
import multer from 'multer';
import * as libbuild from './src/libbuild.js';
import * as docker from './src/docker.js';

const PORT = process.env.BB_PORT | 4000;

const upload = multer();

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

app.get('/:id', upload.array(), function (req, res) {
    res.redirect(`/b/${req.params.id}`);
});

app.get('/b/:id', upload.array(), function (req, res) {
    res.sendFile(path.join(__dirname, 'quick-bench-front-end', 'build-bench', 'build', 'index.html'));
});

app.listen(PORT, function () {
    console.log(`Listening to commands on port ${PORT}`);
});
