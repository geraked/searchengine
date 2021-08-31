import cheerio from "cheerio";
import EventEmitter from "events";
import { getFiles, dirSize, pocl, clean } from "./lib.js";
import { select } from "xpath";
import { DOMParser } from "xmldom";
import { readFileSync, statSync } from "fs";
import { DB, resetDb } from "./db.js";

/**
 * The indexing part of the search engine
 * 
 * @param {String} feedDir 
 * @param {EventEmitter} em 
 * @param {Function} onEnd - callback
 */
export const generateIndex = async (feedDir, em, onEnd) => {

    console.time('Indexing');
    await resetDb();

    let termsRep = {};
    let visitedDocs = new Set();
    let files = getFiles(feedDir);
    let totalSize = dirSize(feedDir);
    let currentSize = 0;

    const fetchContent = async (content, dbo) => {

        // Select all DOCs in a file
        let ops = {
            locator: {},
            errorHandler: {
                warning: w => { },
                error: e => { },
                fatalError: e => { console.error(e) }
            }
        };
        let doc = new DOMParser(ops).parseFromString(content);
        let docs = select('/WEBIR/DOC', doc);

        for (let doc of docs) {
            let docId = parseInt(select('./DOCID/text()', doc)[0].data);

            // If the DOC has been already indexed, ignore it
            if (visitedDocs.has(docId)) continue;
            visitedDocs.add(docId);
            if (await dbo.collection('docs').findOne({ _id: docId })) continue;

            // Select the important parts of a DOC
            let url = select('./URL/text()', doc)[0].data;
            let html = select('./HTML/text()', doc)[0].data;
            let $ = cheerio.load(html);
            let title = $('title').text();
            let body = clean($('body').text());
            let terms = (clean(title) + ' ' + body).split(' ');

            let docObj = {
                _id: docId,
                url: url,
                title: title,
                body: body
            };

            try {

                // Write the DOC to the database now
                // It isn't needed to keep in the main memory
                // Otherwise, we may run out of memory because it's big.
                await dbo.collection('docs').insertOne(docObj);

                // Index the words (terms) of the DOC
                // Keep them in the main memory to operate faster
                // At the end of the operation, it will be written into the database 
                for (let t of terms) {
                    if (t in termsRep) {
                        if (docId in termsRep[t].pos) {
                            termsRep[t].pos[docId]++;
                        } else {
                            termsRep[t].pos[docId] = 1;
                            termsRep[t].cnt++;
                        }
                    } else {
                        termsRep[t] = {
                            cnt: 1,
                            pos: {}
                        };
                        termsRep[t].pos[docId] = 1;
                    }
                }

            } catch (err) { }
        }
    };


    DB(async (db, dbo) => {

        for (let file of files) {

            // Read a file and process its content
            let content = readFileSync(file, 'utf-8');
            await fetchContent(content, dbo);

            // Calculate the indexing progress percent
            currentSize += statSync(file).size;
            let indexProgress = Math.floor(currentSize / totalSize * 100);
            em.emit('indexChange', indexProgress);
            pocl(`Indexing: ${indexProgress} %`);

            // All Index feed files is checked
            if (currentSize == totalSize) {

                // Write termsRep to the database
                let totalWrite = Object.keys(termsRep).length;
                let writeCnt = 0;
                console.log();
                for (let k in termsRep) {
                    let o = termsRep[k];
                    o = {
                        _id: k,
                        cnt: o.cnt,
                        pos: o.pos
                    };
                    await dbo.collection('terms').insertOne(o);

                    // Calculate the writing progress percent
                    writeCnt++;
                    let writeProgress = Math.floor(writeCnt / totalWrite * 100);
                    em.emit('writeChange', writeProgress);
                    pocl(`Writing: ${writeProgress} %`);
                }

                // End of Indexing
                db.close();
                console.log();
                console.timeEnd('Indexing');
                onEnd();
                console.log();
            }
        }

    });

};