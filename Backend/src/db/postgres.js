import pkg from 'pg';
const { Pool } = pkg;

let pool = null;

const connectPostgres = () => {
    try {
        pool = new Pool({
            host: process.env.POSTGRES_HOST,
            port: process.env.POSTGRES_PORT,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB,
            ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        pool.query('SELECT NOW()', (err, res) => {
            if (err) {
                console.error('❌ PostgreSQL connection failed:', err);
            } else {
                console.log(`✅ PostgreSQL connected successfully at ${res.rows[0].now}`);
            }
        });

        pool.on('error', (err) => {
            console.error('Unexpected PostgreSQL error:', err);
        });

        return pool;
    } catch (error) {
        console.error('❌ PostgreSQL connection Failed:', error);
        process.exit(1);
    }
};

const query = (text, params) => {
    if (!pool) {
        throw new Error('PostgreSQL pool not initialized');
    }
    return pool.query(text, params);
};

const getClient = async () => {
    if (!pool) {
        throw new Error('PostgreSQL pool not initialized');
    }
    return await pool.connect();
};

const disconnectPostgres = async () => {
    if (pool) {
        await pool.end();
        console.log('PostgreSQL pool closed');
    }
};

export { connectPostgres, query, getClient, disconnectPostgres };
export default pool;
