import express from "express";
import path from "path";
import { generateIndex } from "./index.js";
import { EventEmitter } from "events";
import { getDirs } from "./lib.js";
import { search } from "./search.js";
import { fetchDocs } from "./fetch.js";

const HOSTNAME = 'localhost';
const PORT = 3000;
const INDEX_FEED_DIR = path.join(path.resolve(), '/feed/');
const CLIENT_DIR = path.join(path.resolve(), '/client');
const app = express();

let em = new EventEmitter();
let isIndexing = false;
let indexProgress = 0;
let writeProgress = 0;
let indexTime = [0, 0];

em.on('indexChange', d => indexProgress = d);
em.on('writeChange', d => writeProgress = d);

app.use(express.static(CLIENT_DIR));

app.get('/', (req, res) => {
    res.sendFile(CLIENT_DIR + '/index.html');
});

app.get('/api/index/dirs', (req, res) => {
    let dirs = getDirs(INDEX_FEED_DIR);
    dirs = dirs.map(d => '/' + d.replace(INDEX_FEED_DIR, ''));
    res.json({
        dirs: dirs
    });
});

app.get('/api/index/progress', (req, res) => {
    res.json({
        index: indexProgress,
        write: writeProgress,
        time: isIndexing ? new Date() - indexTime[0] : indexTime[1] - indexTime[0],
        isIndexing: isIndexing
    });
});

app.get('/api/index', (req, res) => {
    if (isIndexing) {
        res.json({ status: 'running' });
        return;
    }

    let dir = req.query.dir;
    dir = INDEX_FEED_DIR + dir.substr(1);

    isIndexing = true;
    indexProgress = 0;
    writeProgress = 0;
    indexTime[0] = new Date();
    indexTime[1] = indexTime[0];

    generateIndex(dir, em, () => {
        isIndexing = false;
        indexTime[1] = new Date();
    });

    res.json({ status: 'started' });
});

app.get('/api/search', async (req, res) => {
    let s = new Date();
    res.json({
        ids: await search(req.query.s),
        time: new Date() - s
    });
});

app.get('/api/doc', async (req, res) => {
    res.json({
        docs: await fetchDocs(req.query.ids.split(','))
    });
});

app.listen(PORT, HOSTNAME, () => {
    console.log(`Server Listening on: http://${HOSTNAME}:${PORT}`);
    console.log();
});