// /lib/mongodb.js
//
// Cached MongoDB connection for use inside Vercel serverless functions.
// The connection string lives ONLY in the MONGODB_URI environment variable —
// never hardcode it here, and never send it to the browser/app.

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

if (!uri) {
  // Thrown at request time (not at import time) by the functions that use this,
  // so a missing env var gives a clear error instead of a silent crash.
}

let client;
let clientPromise;

function getClientPromise() {
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  if (process.env.NODE_ENV === 'development') {
    // Reuse the client across hot-reloads in local dev
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }
  // In production (Vercel), each serverless invocation may reuse the module
  // scope across warm starts, so a single cached promise is enough.
  if (!clientPromise) {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export default getClientPromise;
