# Job Saarthi Backend

Express backend for Job Saarthi with MongoDB, PostgreSQL, and an asynchronous multi-language code execution engine.

## Features

- Express API with Helmet, CORS, compression, cookies, and rate limiting
- MongoDB and PostgreSQL connectivity
- BullMQ + Redis producer-consumer execution pipeline
- Docker sandbox for JavaScript, Python, C++, and Java
- Polling and Socket.IO delivery for execution results
- Dedicated worker process with configurable concurrency

## Code Execution Architecture

1. `POST /api/code-execution/jobs` validates the payload and enqueues a BullMQ job.
2. The API returns a `jobId` immediately.
3. One or more workers consume jobs from Redis and execute code in Docker with:
   - `--network none`
   - `--memory 128m`
   - `--cpus 0.5`
   - `--read-only`
   - `docker kill` timeout at 5000 ms
4. Clients poll `GET /api/code-execution/jobs/:jobId` or subscribe to Socket.IO room `job:<jobId>`.

## Supported Languages

- `javascript`
- `python`
- `cpp`
- `java`

Aliases accepted by the API:

- `js` -> `javascript`
- `py` -> `python`
- `c++` -> `cpp`

## API

### Create job

`POST /api/code-execution/jobs`

Request body:

```json
{
  "language": "python",
  "sourceCode": "print(input())",
  "stdin": "hello"
}
```

Response:

```json
{
  "success": true,
  "message": "Execution job accepted.",
  "data": {
    "jobId": "123",
    "language": "python",
    "status": "queued",
    "pollUrl": "/api/code-execution/jobs/123",
    "socket": {
      "room": "job:123",
      "subscribeEvent": "code-execution:subscribe",
      "completedEvent": "code-execution:completed",
      "failedEvent": "code-execution:failed"
    }
  }
}
```

### Get job status

`GET /api/code-execution/jobs/:jobId`

Returned job states:

- `waiting`
- `active`
- `completed`
- `failed`

Execution outcomes inside `result.outcome`:

- `success`
- `compilation_error`
- `runtime_error`
- `timeout`
- `system_error`

### List supported languages

`GET /api/code-execution/languages`

## Socket.IO

Subscribe a client to a job room:

```js
socket.emit('code-execution:subscribe', { jobId });
```

Receive updates:

- `code-execution:completed`
- `code-execution:failed`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env`.

3. Start Redis and Docker locally.

4. Start the API:

```bash
npm run dev
```

5. Start at least one worker:

```bash
npm run dev:worker
```

## Important Environment Variables

- `REQUEST_BODY_LIMIT`: request body limit for source payloads
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: BullMQ backing store
- `CODE_EXECUTION_TIMEOUT_MS`: wall-clock timeout, default `5000`
- `CODE_EXECUTION_MEMORY_LIMIT`: Docker memory limit, default `128m`
- `CODE_EXECUTION_CPU_LIMIT`: Docker CPU limit, default `0.5`
- `CODE_EXECUTION_WORKER_CONCURRENCY`: per-worker concurrency, default `4`
- `CODE_EXECUTION_*_IMAGE`: Docker image override per language

## Scripts

- `npm start`: start the API
- `npm run dev`: start the API with nodemon
- `npm run worker`: start a BullMQ worker
- `npm run dev:worker`: start a BullMQ worker with nodemon

## Security Notes

- Host-side execution uses `child_process.spawn()` with explicit arguments only.
- Source files are mounted read-only into the container.
- Cleanup runs after success, timeout, and failure.
- Full audit notes are in `docs/code-execution-security-audit.md`.
