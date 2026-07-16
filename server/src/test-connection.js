import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
console.log('Testing connection to:', uri);
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('SUCCESS: Successfully connected to MongoDB Atlas!');
    const databasesList = await client.db().admin().listDatabases();
    console.log('Databases:');
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
  } catch (e) {
    console.error('ERROR: Connection failed with error:', e);
  } finally {
    await client.close();
  }
}

run();
