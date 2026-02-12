import connectMongoDB from './mongodb.js';
import { connectPostgres, query, getClient, disconnectPostgres } from './postgres.js';

export {
    connectMongoDB,
    connectPostgres,
    query,
    getClient,
    disconnectPostgres
};

export default connectMongoDB;