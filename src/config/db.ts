import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

let connectionPromise: Promise<typeof mongoose> | null = null;

const connectDB = async (): Promise<void> => {
    try {
        if (mongoose.connection.readyState === 1) {
            return;
        }

        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }

        connectionPromise ??= mongoose.connect(mongoUri, { dbName: 'publicationDb' });
        await connectionPromise;
        connectionPromise = null;
        logger.info('database.connected');
    } catch (error) {
        connectionPromise = null;
        logger.error('database.connection_failed', error);
        logger.warn('database.starting_without_connection');
    }
};

export default connectDB;
