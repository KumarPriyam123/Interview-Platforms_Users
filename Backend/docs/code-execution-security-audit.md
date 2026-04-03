# Code Execution Security Audit

## Scope

This audit covers the asynchronous code execution path implemented in the Node.js backend, BullMQ worker, Redis queue, and Docker sandbox runner.

## Data Flow

1. `POST /api/code-execution/jobs` validates language, source size, and stdin size.
2. The API enqueues the payload into BullMQ and returns a `jobId`.
3. One or more workers consume jobs from Redis and run them inside Docker.
4. The frontend polls `GET /api/code-execution/jobs/:jobId` or subscribes to Socket.IO room `job:<jobId>`.

## Security Controls

### Injection Resistance

- The host never invokes a shell to run Docker. All host-side process launches use `child_process.spawn()` with explicit argument arrays.
- User code is written to a temporary file and mounted into the container as read-only.
- The only shell usage is inside static, repository-owned wrapper scripts for C++ and Java compilation. No untrusted values are interpolated into those scripts.

### Container Isolation

- Containers run with `--network none`.
- Memory is capped with `--memory 128m` by default.
- CPU is capped with `--cpus 0.5` by default.
- Process count is capped with `--pids-limit 64`.
- Containers run with `--read-only`.
- Linux capabilities are dropped with `--cap-drop ALL`.
- Privilege escalation is blocked with `--security-opt no-new-privileges`.
- Runtime scratch space is limited to tmpfs mounts under `/tmp` and `/workspace/build`.
- Source code is mounted read-only, preventing writes back to the host filesystem.

### Timeout Enforcement

- The worker enforces a strict 5 second wall-clock timeout by calling `docker kill`, which sends `SIGKILL` by default.
- Cleanup runs in `finally`, so timeout, runtime errors, and worker failures all trigger container and temp-directory teardown.

### Resource Exhaustion Controls

- Request validation caps source code, stdin, and captured output sizes.
- Output capture is truncated to reduce worker memory pressure.
- BullMQ concurrency is configurable so operators can scale horizontally with more worker processes instead of overloading a single process.

## Error Classification

- `COMPILATION_ERROR`: compiler exits with the reserved wrapper exit code `10`.
- `RUNTIME_ERROR`: the program starts but exits non-zero.
- `TIMEOUT`: the 5 second kill path triggers.
- `SYSTEM_ERROR`: the worker or Docker runtime fails before code execution completes.

## Residual Risks

- This design assumes Docker itself is trusted and properly hardened on the host.
- The current implementation does not enforce seccomp/apparmor profiles or user namespaces; add them if the deployment environment supports them.
- Java execution infers the main class from the submitted source. Complex multi-class/package submissions are intentionally out of scope.
- Output is truncated rather than hard-killed on flood; this protects worker memory but can still consume CPU until the timeout.

## Operational Recommendations

- Run workers on dedicated hosts or nodes, separate from the public API tier.
- Keep Docker images pre-pulled to avoid cold-start latency and failed pulls during execution spikes.
- Add Redis authentication/TLS in any non-local deployment.
- Monitor queue depth, worker concurrency, timeout rate, and Docker daemon health.
