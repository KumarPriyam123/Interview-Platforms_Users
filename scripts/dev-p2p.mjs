import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
const services = [
  {
    name: 'frontend',
    cwd: path.join(rootDir, 'frontend'),
    npmArgs: ['run', 'dev'],
    color: '\x1b[36m',
    healthUrl: 'http://localhost:5173',
  },
  {
    name: 'webrtc',
    cwd: path.join(rootDir, 'webrtc-service'),
    npmArgs: ['start'],
    color: '\x1b[35m',
    healthUrl: 'http://localhost:9000/health',
  },
]

const children = []
let shuttingDown = false

function writePrefixed(stream, color, name, chunk) {
  const lines = chunk.toString().split(/\r?\n/)

  lines.forEach((line) => {
    if (!line.trim()) {
      return
    }

    stream.write(`${color}[${name}]\x1b[0m ${line}\n`)
  })
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true

  children.forEach((child) => {
    if (!child.killed) {
      child.kill('SIGINT')
    }
  })

  setTimeout(() => {
    process.exit(exitCode)
  }, 250)
}

async function isHealthy(healthUrl) {
  if (!healthUrl) {
    return false
  }

  try {
    const response = await fetch(healthUrl)
    return response.ok
  } catch {
    return false
  }
}

for (const service of services) {
  if (await isHealthy(service.healthUrl)) {
    process.stdout.write(`${service.color}[${service.name}]\x1b[0m already running at ${service.healthUrl}\n`)
    continue
  }

  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm'
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm.cmd ${service.npmArgs.join(' ')}`]
    : service.npmArgs

  const child = spawn(command, args, {
    cwd: service.cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
  })

  child.stdout.on('data', (chunk) => {
    writePrefixed(process.stdout, service.color, service.name, chunk)
  })

  child.stderr.on('data', (chunk) => {
    writePrefixed(process.stderr, service.color, service.name, chunk)
  })

  child.on('exit', (code) => {
    if (shuttingDown) {
      return
    }

    const normalizedCode = typeof code === 'number' ? code : 1
    process.stderr.write(`\x1b[31m[${service.name}]\x1b[0m exited with code ${normalizedCode}\n`)
    shutdown(normalizedCode)
  })

  child.on('error', (error) => {
    process.stderr.write(`\x1b[31m[${service.name}]\x1b[0m failed to start: ${error.message}\n`)
    shutdown(1)
  })

  children.push(child)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
