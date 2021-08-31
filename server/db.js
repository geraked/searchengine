import { MongoClient } from "mongodb";

const URL = "mongodb://localhost:27017/";
const DB_NAME = "searchengine";
const COLLECTIONS = ['docs', 'terms'];

/**
 * DB Callback
 * @callback DBCallback
 * @param {*} db 
 * @param {*} dbo
 */

/**
 * Connect to the database.
 * @param {DBCallback} callback 
 */
export const DB = (callback) => {
    MongoClient.connect(URL, (err, db) => {
        if (err) throw err;
        let dbo = db.db(DB_NAME);
        callback(db, dbo);
    });
};

/**
 * Connect to the database.
 * @async
 * @returns {Promise<Array>} [db, client]
 */
export const SDB = async () => {
    let client = new MongoClient(URL);
    await client.connect();
    let db = client.db(DB_NAME);
    return [db, client];
};

/**
 * Drop the collections and recreate them.
 */
export const resetDb = async () => {
    let [db, client] = await SDB();
    for (const c of COLLECTIONS) {
        await db.dropCollection(c);
        await db.createCollection(c);
    }
    client.close();
};