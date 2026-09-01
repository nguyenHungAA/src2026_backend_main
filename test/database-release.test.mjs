import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import connectDB from '../dist/config/db.js';

test('database connector retries after a previously successful connection drops', async (t) => {
    const originalConnect = mongoose.connect;
    const originalReadyState = mongoose.connection.readyState;
    const originalMongoUri = process.env.MONGO_URI;

    t.after(() => {
        mongoose.connect = originalConnect;
        mongoose.connection.readyState = originalReadyState;
        if (originalMongoUri === undefined) delete process.env.MONGO_URI;
        else process.env.MONGO_URI = originalMongoUri;
    });

    let connectionAttempts = 0;
    process.env.MONGO_URI = 'mongodb://release-test.invalid/src2026';
    mongoose.connect = async () => {
        connectionAttempts += 1;
        mongoose.connection.readyState = 1;
        return mongoose;
    };

    mongoose.connection.readyState = 0;
    await connectDB();
    mongoose.connection.readyState = 0;
    await connectDB();

    assert.equal(connectionAttempts, 2);
});
