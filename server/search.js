import { clean } from "./lib.js";
import { SDB } from "./db.js";

/**
 * Query processing, searching in the index, ranking
 * 
 * @async
 * @param {String} q - Search Query
 * @returns {Promise<Array<Number>>} - List of document ids ordered by tf-idf score
 */
export const search = async (q) => {

    let terms = [];
    let docScores = {};
    let query = {};
    let termsRep = [];
    let [db, client] = await SDB();
    let N = await db.collection('docs').count();

    if (q.includes('OR')) {
        // OR

        let orTerms = q.split('OR');

        orTerms.forEach(t => {
            t = clean(t);
            if (t)
                terms.push(t);
        });

        if (terms.length === 0) return [];

        query = {
            _id: {
                $in: terms
            }
        };
        termsRep = await db.collection('terms').find(query).sort({ cnt: 1 }).toArray();
        client.close();

        if (termsRep.length === 0) return [];

    } else {
        // AND

        terms = clean(q.replace(/AND/g, '')).split(' ');

        query = {
            _id: {
                $in: terms
            }
        };
        termsRep = await db.collection('terms').find(query).sort({ cnt: 1 }).toArray();
        client.close();

        if (termsRep.length === 0) return [];

        for (let i = 1; i < termsRep.length; i++) {
            if (Object.keys(termsRep[0].pos).length === 0) return [];
            for (let j in termsRep[i].pos) {
                if (!(j in termsRep[0].pos)) {
                    delete termsRep[i].pos[j];
                    delete termsRep[0].pos[j];
                }
            }
        }
    }

    // Fill docScores with 0 score
    for (let t of termsRep) {
        for (let docId in t.pos) {
            if (!(docId in docScores)) {
                docScores[docId] = 0;
            }
        }
    }

    // Calculate tf-idf scores
    for (let docId in docScores) {
        let score = 0;
        for (let t of termsRep) {
            if (docId in t.pos) {
                score += (1 + Math.log10(t.pos[docId])) * Math.log10(N / t.cnt);
            }
        }
        docScores[docId] = score;
    }

    // Sort by document scores (Ranking)
    let sortable = [];
    for (let i in docScores)
        sortable.push([i, docScores[i]]);
    docScores = null;
    sortable.sort((a, b) => b[1] - a[1]);
    sortable = sortable.map(d => parseInt(d[0]));

    return sortable;
};