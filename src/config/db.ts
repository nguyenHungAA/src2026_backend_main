import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
let connectionPromise: Promise<typeof mongoose> | null = null;

const connectDB = async (): Promise<void> => {
    try {
        if (mongoose.connection.readyState === 1) {
            return;
        }

        if (!MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }

        connectionPromise ??= mongoose.connect(MONGO_URI, { dbName: 'publicationDb' });
        await connectionPromise;
        logger.info('database.connected');
    } catch (error) {
        connectionPromise = null;
        logger.error('database.connection_failed', error);
        logger.warn('database.starting_without_connection');
    }
};

export default connectDB;
