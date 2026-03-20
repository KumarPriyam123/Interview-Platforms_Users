const DEFAULT_SIGNALING_PORT = '9000'
const DEFAULT_PEERJS_PORT = '9001'

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

export const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || buildServiceUrl(DEFAULT_SIGNALING_PORT)
export const PEERJS_URL = import.meta.env.VITE_PEERJS_URL || buildServiceUrl(DEFAULT_PEERJS_PORT)

