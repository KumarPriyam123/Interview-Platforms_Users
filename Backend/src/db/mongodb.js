import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 5000;

const buildMongoConnectionUri = (rawUri, dbName) => {
    if (!rawUri) {
        throw new Error('MONGODB_URI is not configured.');
    }

    if (!dbName) {
        return rawUri;
    }

    const [baseWithoutQuery, queryString] = rawUri.split('?');
    const trimmedBase = baseWithoutQuery.replace(/\/+$/, '');

    if (trimmedBase.endsWith(`/${dbName}`)) {
        return queryString ? `${trimmedBase}?${queryString}` : trimmedBase;
    }

    const hasDatabaseSegment = /\/[^/]+$/.test(trimmedBase.replace(/^mongodb(?:\+srv)?:\/\/[^/]+/, ''));
    const uriWithDatabase = hasDatabaseSegment
        ? trimmedBase
        : `${trimmedBase}/${dbName}`;

    return queryString ? `${uriWithDatabase}?${queryString}` : uriWithDatabase;
};

const connectMongoDB = async () => {
    const connectionUri = buildMongoConnectionUri(process.env.MONGODB_URI, DB_NAME);

    const connectionInstance = await mongoose.connect(connectionUri, {
        serverSelectionTimeoutMS: Number.parseInt(
            process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? '',
            10,
        ) || DEFAULT_SERVER_SELECTION_TIMEOUT_MS,
    });

    console.log(`MongoDB connected: ${connectionInstance.connection.host}`);

    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
    });

    return connectionInstance;
};

export const disconnectMongoDB = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log('MongoDB connection closed');
    }
};

export default connectMongoDB;
