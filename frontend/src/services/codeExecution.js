import { API_BASE_URL } from '../utils/apiConfig'

const TERMINAL_JOB_STATES = new Set(['completed', 'failed'])

function sleep(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs)
  })
}

async function parseApiResponse(response) {
  let payload = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Code execution request failed.')
  }

  return payload?.data ?? payload
}

export async function createExecutionJob({ language, sourceCode, stdin = '' }) {
  const response = await fetch(`${API_BASE_URL}/api/code-execution/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language,
      sourceCode,
      stdin,
    }),
  })

  return parseApiResponse(response)
}

export async function getExecutionJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/api/code-execution/jobs/${jobId}`)
  return parseApiResponse(response)
}

export async function pollExecutionJob(jobId, { intervalMs = 1000, timeoutMs = 20000, onUpdate } = {}) {
  const startedAt = Date.now()

  while (Date.now() - startedAt <= timeoutMs) {
    const job = await getExecutionJob(jobId)
    onUpdate?.(job)

    if (TERMINAL_JOB_STATES.has(job.state)) {
      return job
    }

    await sleep(intervalMs)
  }

  throw new Error('Execution job did not finish before the polling timeout.')
}
