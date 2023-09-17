#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { dirname, path} from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.static(path.join(__dirname, 'quick-bench-front-end', 'quick-bench', 'build')));
import bodyParser from 'body-parser';
import multer from 'multer';
import * as libquick from './src/libquick.js';
import * as docker from './src/docker.js';

const PORT = process.env.QB_PORT | 4000;
const POST_LIMIT = process.env.QB_POST_LIMIT | (100 * 1024);

const upload = multer();

app.use(bodyParser.json({limit: POST_LIMIT}));
app.use(cors());

libquick.updateAvailableContainersList();

app.get('/quick-env', upload.array(), function (req, res) {
    res.json(libquick.getEnv());
});

app.post('/quick', upload.array(), function (req, res) {
    Promise.resolve(libquick.benchmark(req.body, req.headers))
        .then((done) => res.json(libquick.makeGraphResult(done.res ? JSON.parse(done.res) : null, done.stdout, done.id, done.annotation, done.disassemblyOption)))
        .catch((err) => res.json({ message: err }));
});

app.get('/quick/:id', upload.array(), function (req, res) {
    console.log('Get ' + req.params.id + ' ' + JSON.stringify(req.headers));
    Promise.resolve(libquick.reload(req.params.id))
        .then((done) => res.json(libquick.getRequestAndResult(done)))
        .catch(() => res.json({ message: 'Could not load given id' }));
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
            .then(() => libquick.updateAvailableContainersList())
            .then(() => res.json(libquick.getEnv()))
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
            .then(() => libquick.updateAvailableContainersList())
            .then(() => res.json(libquick.getEnv()))
            .catch(e => res.status(500).send('Could not delete containers'));
    } else {
        res.status(403).send({
            message: 'Access Forbidden'
        });
    }
});

app.get('/q/:id', upload.array(), function (req, res) {
    res.sendFile(path.join(__dirname, 'quick-bench-front-end', 'quick-bench', 'build', 'index.html'));
});

app.get('/:id', upload.array(), function (req, res) {
    res.redirect(`/q/${req.params.id}`);
});

app.listen(PORT, function () {
    console.log(`Listening to commands on port ${PORT}`);
});
