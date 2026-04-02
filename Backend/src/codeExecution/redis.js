import IORedis from 'ioredis';
import {
    REDIS_DB,
    REDIS_HOST,
    REDIS_PASSWORD,
    REDIS_PORT,
    REDIS_TLS_ENABLED,
    REDIS_USERNAME,
} from './constants.js';

export const getRedisConnectionOptions = (connectionName) => ({
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_DB,
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
    connectionName,
    ...(REDIS_TLS_ENABLED ? { tls: {} } : {}),
});

export const createRedisConnection = (connectionName) => (
    new IORedis(getRedisConnectionOptions(connectionName))
);

export const closeRedisConnection = async (connection) => {
    if (!connection) {
        return;
    }

    try {
        await connection.quit();
    } catch (error) {
        connection.disconnect();
    }
};
