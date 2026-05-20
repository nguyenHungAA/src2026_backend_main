import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';

dns.setServers(["1.1.1.1", "1.0.0.1"]);

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async (): Promise<void> => {
    try {
        if (!MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        await mongoose.connect(MONGO_URI, { dbName: 'publicationDb' });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        console.warn('Server will start without database connection.');
    }
};

export default connectDB;
