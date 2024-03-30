// const { MongoClient } = require("mongodb");
import { MongoClient } from 'mongodb';

const ordobankPassword = encodeURIComponent("#*TP2fcJqBQNp*");

export const uri = "mongodb://ordobank:"+ordobankPassword+"@paymemobile.fr:27017/?directConnection=true&authSource=ordobank";
export const client = new MongoClient(uri);
export const database = client.db('ordobank');

export const getDbFromUri = async (uri) => {
    try {
        console.log("Trying to access database with URI ", uri)
        let client2 = new MongoClient(uri);
        return client2.db('ordobank');
    } catch (err) {
        console.log(err.stack);
    }
}