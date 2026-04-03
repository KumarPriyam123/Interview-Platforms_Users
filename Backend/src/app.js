import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import codeExecutionRouter from './routes/codeExecution.routes.js';
import interviewRouter from './routes/interview.routes.js';

const app = express();

const configuredCorsOrigins = [
    process.env.CORS_ORIGIN,
    ...(process.env.CORS_ORIGINS || '').split(','),
]
    .map((value) => value?.trim())
    .filter(Boolean);

const devAllowedOriginPatterns = [
    /^https?:\/\/localhost(:\d+)?$/i,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/i,
    /^https?:\/\/(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(:\d+)?$/i,
];

const isCorsOriginAllowed = (origin) => (
    configuredCorsOrigins.includes(origin)
    || (process.env.NODE_ENV !== 'production'
        && devAllowedOriginPatterns.some((pattern) => pattern.test(origin)))
);

app.use(helmet());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || isCorsOriginAllowed(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS not allowed for origin ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '256kb' }));
app.use(express.urlencoded({
    extended: true,
    limit: process.env.REQUEST_BODY_LIMIT || '256kb',
}));

app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use(express.static('public'));

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

app.use('/api/code-execution', codeExecutionRouter);
app.use('/api/interviews', interviewRouter);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

export default app;
