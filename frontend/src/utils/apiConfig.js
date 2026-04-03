const DEFAULT_API_PORT = '8000'

function getBrowserHostname() {
  if (typeof window === 'undefined') {
    return 'localhost'
  }

  return window.location.hostname || 'localhost'
}

function getBrowserProtocol() {
  if (typeof window === 'undefined') {
    return 'http:'
  }

  return window.location.protocol === 'https:' ? 'https:' : 'http:'
}

function buildServiceUrl(port) {
  return `${getBrowserProtocol()}//${getBrowserHostname()}:${port}`
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || buildServiceUrl(DEFAULT_API_PORT)
