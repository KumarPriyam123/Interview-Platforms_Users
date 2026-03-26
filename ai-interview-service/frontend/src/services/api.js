import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
})

export const startInterview = (file, role, company, email) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('role', role)
  formData.append('company', company)
  formData.append('email', email)
  return apiClient.post('/interviews/start', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  })
}

export const getAllQuestions = (sessionId) =>
  apiClient.get('/interviews/' + sessionId + '/questions')

export const getCurrentQuestion = (sessionId) =>
  apiClient.get('/interviews/' + sessionId + '/question')

export const submitAnswer = (sessionId, answer) =>
  apiClient.post('/interviews/' + sessionId + '/answer', { answer })

export const submitCounterAnswer = (sessionId, answer, questionNumber) =>
  apiClient.post('/interviews/' + sessionId + '/counter-answer', { answer, question_number: questionNumber })

export const moveToNext = (sessionId) =>
  apiClient.post('/interviews/' + sessionId + '/next')

export const askDoubt = (sessionId, doubt) =>
  apiClient.post('/interviews/' + sessionId + '/doubt', { doubt })

export const getReport = (sessionId) =>
  apiClient.get('/interviews/' + sessionId + '/report')

export const endInterview = (sessionId) =>
  apiClient.post('/interviews/' + sessionId + '/end', {})
