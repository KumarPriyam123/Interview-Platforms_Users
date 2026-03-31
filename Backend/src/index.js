import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import app from './app.js';
import connectMongoDB from './db/mongodb.js';
import { connectPostgres, disconnectPostgres } from './db/postgres.js';

const PORT = process.env.PORT || 8000;

const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectMongoDB();
        
        // Connect to PostgreSQL
        connectPostgres();
        
        // Start server
        const server = app.listen(PORT, () => {
            console.log(`⚡️ Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗 http://localhost:${PORT}`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            
            server.close(async () => {
                console.log('HTTP server closed');
                await disconnectPostgres();
                console.log('Goodbye!');
                process.exit(0);
            });

            setTimeout(() => {
                console.error('Forcing shutdown...');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        process.on('unhandledRejection', (reason) => {
            console.error('Unhandled Rejection:', reason);
            gracefulShutdown('unhandledRejection');
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
