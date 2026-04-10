/**
 * Job Saarthi — Start ALL development services in one terminal.
 *
 * Usage:
 *   npm run dev:all
 *   node scripts/dev-all.mjs
 *   node scripts/dev-all.mjs --skip-python   (skip resume profile services)
 *   node scripts/dev-all.mjs --skip-redis    (skip Redis docker container)
 *
 * Port Map:
 *   6379  Redis (Docker)
 *   8000  Resume API Gateway (Python/FastAPI)
 *   8001  Resume Parser (Python/FastAPI)
 *   8002  Backend Express (Node.js)
 *   8003  Profile Matching (Python/FastAPI)
 *   5173  Frontend (Vite)
 *   9000  WebRTC Signaling (Socket.io)
 *   9001  PeerJS
 */

import { spawn, execSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
const args = process.argv.slice(2)
const skipPython = args.includes('--skip-python')
const skipRedis = args.includes('--skip-redis')
const skipWebRTC = args.includes('--skip-webrtc')
const skipFrontend = args.includes('--skip-frontend')
const skipWorker = args.includes('--skip-worker')

const isWin = process.platform === 'win32'

const COLORS = {
  redis:    '\x1b[31m',
  parser:   '\x1b[33m',
  matching: '\x1b[35m',
  gateway:  '\x1b[34m',
  backend:  '\x1b[32m',
  worker:   '\x1b[36m',
  frontend: '\x1b[96m',
  webrtc:   '\x1b[95m',
  reset:    '\x1b[0m',
}

const children = []
let shuttingDown = false

function log(color, name, line) {
  if (line.trim()) {
    process.stdout.write(`${color}[${name}]${COLORS.reset} ${line}\n`)
  }
}

function logErr(color, name, line) {
  if (line.trim()) {
    process.stderr.write(`${color}[${name}]${COLORS.reset} ${line}\n`)
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  log(COLORS.reset, 'system', 'Shutting down all services...')
  children.forEach((c) => { if (!c.killed) c.kill('SIGINT') })
  setTimeout(() => process.exit(exitCode), 500)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

function spawnService(name, color, cwd, command, cmdArgs, opts = {}) {
  const child = spawn(command, cmdArgs, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
    env: { ...process.env, ...opts.env },
  })

  child.stdout.on('data', (chunk) => {
    chunk.toString().split(/\r?\n/).forEach((l) => log(color, name, l))
  })
  child.stderr.on('data', (chunk) => {
    chunk.toString().split(/\r?\n/).forEach((l) => logErr(color, name, l))
  })
  child.on('exit', (code) => {
    if (!shuttingDown) {
      logErr(COLORS.reset, name, `exited with code ${code ?? 1}`)
    }
  })
  child.on('error', (err) => {
    logErr(COLORS.reset, name, `failed to start: ${err.message}`)
  })

  children.push(child)
  return child
}

function npmCmd() { return isWin ? 'cmd.exe' : 'npm' }
function npmArgs(scriptArgs) {
  return isWin
    ? ['/d', '/s', '/c', `npm.cmd ${scriptArgs.join(' ')}`]
    : scriptArgs
}

// ─── Python (uvicorn) helper ───
function uvicornCmd(cwd, subdir, port) {
  const venvPython = isWin
    ? path.join(rootDir, 'resume-profile-service', 'venv', 'Scripts', 'python.exe')
    : path.join(rootDir, 'resume-profile-service', 'venv', 'bin', 'python')

  return {
    command: venvPython,
    args: ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', String(port), '--reload'],
    cwd: path.join(cwd, subdir),
  }
}

// ─── Ensure Redis ───
function ensureRedis() {
  try {
    const running = execSync('docker ps -q --filter "name=^jobsaarthi-redis$"', { encoding: 'utf8' }).trim()
    if (running) {
      log(COLORS.redis, 'redis', 'Already running')
      return
    }
    const exists = execSync('docker ps -aq --filter "name=^jobsaarthi-redis$"', { encoding: 'utf8' }).trim()
    if (exists) {
      log(COLORS.redis, 'redis', 'Starting existing container...')
      execSync('docker start jobsaarthi-redis', { stdio: 'ignore' })
    } else {
      log(COLORS.redis, 'redis', 'Creating container on port 6379...')
      execSync('docker run -d --name jobsaarthi-redis -p 6379:6379 redis:7-alpine', { stdio: 'ignore' })
    }
    log(COLORS.redis, 'redis', 'Ready on port 6379')
  } catch {
    logErr(COLORS.redis, 'redis', 'Docker not available — ensure Redis is running on port 6379')
  }
}

// ─── Main ───
console.log('')
console.log('\x1b[36m========================================\x1b[0m')
console.log('\x1b[36m Job Saarthi — Dev (all services)\x1b[0m')
console.log('\x1b[36m========================================\x1b[0m')
console.log('')

// 1. Redis
if (!skipRedis) {
  ensureRedis()
}

// 2. Python resume-profile microservices
if (!skipPython) {
  const rpDir = path.join(rootDir, 'resume-profile-service')
  const venvExists = isWin
    ? (() => { try { execSync(`test -f "${rpDir}/venv/Scripts/python.exe" || where "${rpDir}\\venv\\Scripts\\python.exe"`, { stdio: 'ignore' }); return true } catch { return false } })()
    : (() => { try { execSync(`test -f "${rpDir}/venv/bin/python"`, { stdio: 'ignore' }); return true } catch { return false } })()

  if (!venvExists) {
    log(COLORS.gateway, 'python', 'No venv found — run: python -m venv resume-profile-service/venv && pip install -r resume-profile-service/requirements.txt')
  } else {
    // Resume Parser (8001)
    const parser = uvicornCmd(rpDir, 'src/services/parsing', 8001)
    spawnService('parser', COLORS.parser, parser.cwd, parser.command, parser.args)

    // Profile Matching (8003)
    const matching = uvicornCmd(rpDir, 'src/services/matching', 8003)
    spawnService('matching', COLORS.matching, matching.cwd, matching.command, matching.args)

    // Gateway needs parser + matching up first — small delay
    setTimeout(() => {
      const gateway = uvicornCmd(rpDir, 'src/api', 8000)
      spawnService('gateway', COLORS.gateway, gateway.cwd, gateway.command, gateway.args)
    }, 3000)
  }
}

// 3. Backend (port 8002)
spawnService('backend', COLORS.backend,
  path.join(rootDir, 'Backend'),
  npmCmd(), npmArgs(['run', 'dev']))

// 4. Code execution worker
if (!skipWorker) {
  spawnService('worker', COLORS.worker,
    path.join(rootDir, 'Backend'),
    npmCmd(), npmArgs(['run', 'dev:worker']))
}

// 5. WebRTC (ports 9000/9001)
if (!skipWebRTC) {
  spawnService('webrtc', COLORS.webrtc,
    path.join(rootDir, 'webrtc-service'),
    npmCmd(), npmArgs(['start']))
}

// 6. Frontend (port 5173)
if (!skipFrontend) {
  spawnService('frontend', COLORS.frontend,
    path.join(rootDir, 'frontend'),
    npmCmd(), npmArgs(['run', 'dev']))
}

console.log('')
console.log('\x1b[32m All services launching...\x1b[0m')
console.log('')
console.log('  Redis              6379')
console.log('  Resume API Gateway 8000   http://localhost:8000/docs')
console.log('  Resume Parser      8001   http://localhost:8001/docs')
console.log('  Backend            8002   http://localhost:8002')
console.log('  Profile Matching   8003   http://localhost:8003/docs')
console.log('  Frontend           5173   http://localhost:5173')
console.log('  WebRTC             9000   http://localhost:9000/health')
console.log('  PeerJS             9001')
console.log('')
console.log('  Press Ctrl+C to stop all services')
console.log('')
