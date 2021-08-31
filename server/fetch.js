import { SDB } from "./db.js";

/**
 * Fetch documents from the database with ids.
 * 
 * @async
 * @param {Array<Number>} ids - List of document ids
 * @returns {Promise<Array<Object>>} List of document objects
 */
export const fetchDocs = async (ids) => {

    const MAX_BODY_LENGTH = 150;

    let docs = [];
    let [db, client] = await SDB();

    for (let id of ids) {
        let doc = await db.collection('docs').findOne({ _id: parseInt(id) });

        if (doc) {
            if (doc.body.length > MAX_BODY_LENGTH)
                doc.body = doc.body.substr(0, MAX_BODY_LENGTH) + '...';
            docs.push(doc);
        }
    }

    client.close();

    return docs;
};