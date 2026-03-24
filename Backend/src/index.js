import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { closeCodeExecutionQueueResources } from './codeExecution/queue.js';
import {
    createCodeExecutionSocketServer,
    initializeCodeExecutionSocketBridge,
    registerCodeExecutionSocketHandlers,
} from './codeExecution/socket.js';
import connectMongoDB, { disconnectMongoDB } from './db/mongodb.js';
import { connectPostgres, disconnectPostgres } from './db/postgres.js';

const PORT = process.env.PORT || 8000;

const startServer = async () => {
    try {
        const server = http.createServer(app);
        const io = createCodeExecutionSocketServer(server);

        registerCodeExecutionSocketHandlers(io);

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            console.log(`URL: http://localhost:${PORT}`);
        });

        // Dependency initialization is intentionally non-blocking so the API can still
        // return health checks and explicit 503s instead of failing to bind the port.
        void connectMongoDB().catch((error) => {
            console.error('MongoDB startup skipped:', error.message);
        });

        try {
            connectPostgres();
        } catch (error) {
            console.error('PostgreSQL startup skipped:', error.message);
        }

        void initializeCodeExecutionSocketBridge(io).catch((error) => {
            console.error('Code execution socket bridge unavailable:', error.message);
        });

        let shuttingDown = false;

        const gracefulShutdown = async (signal) => {
            if (shuttingDown) {
                return;
            }

            shuttingDown = true;
            console.log(`\n${signal} received. Shutting down gracefully...`);

            server.close(async () => {
                console.log('HTTP server closed');
                io.close();

                await Promise.allSettled([
                    disconnectMongoDB(),
                    disconnectPostgres(),
                    closeCodeExecutionQueueResources(),
                ]);

                console.log('Goodbye!');
                process.exit(0);
            });

            setTimeout(() => {
                console.error('Forcing shutdown...');
                process.exit(1);
            }, 10000).unref();
        };

        process.on('SIGTERM', () => {
            void gracefulShutdown('SIGTERM');
        });

        process.on('SIGINT', () => {
            void gracefulShutdown('SIGINT');
        });

        process.on('unhandledRejection', (reason) => {
            console.error('Unhandled Rejection:', reason);
            void gracefulShutdown('unhandledRejection');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
