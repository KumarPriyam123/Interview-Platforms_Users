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

export const submitCounterAnswer = (sessionId, answer, questionNumber, counterIndex, counterQuestion) =>
  apiClient.post('/interviews/' + sessionId + '/counter-answer', {
    answer,
    question_number: questionNumber,
    counter_index: counterIndex,
    counter_question: counterQuestion,
  })

export const moveToNext = (sessionId) =>
  apiClient.post('/interviews/' + sessionId + '/next')

export const askDoubt = (sessionId, doubt, currentPrompt) =>
  apiClient.post('/interviews/' + sessionId + '/doubt', { doubt, currentPrompt })

export const getReport = (sessionId) =>
  apiClient.get('/interviews/' + sessionId + '/report')

export const endInterview = (sessionId) =>
  apiClient.post('/interviews/' + sessionId + '/end', {})

export const runCode = (language, code, testCases, mode = 'run') =>
  apiClient.post('/interviews/code/run', { language, code, testCases, mode })

export const getRagDataset = (collection = 'problems', limit = 100) =>
  apiClient.get(`/interviews/dataset/questions?limit=${limit}`)

export const verifyRagQuestion = (hit, role = 'Software Engineer', company = 'Tech Company') =>
  apiClient.post('/interviews/rag/verify', { hit, role, company })

export const cleanQuestionText = (question, title = '') =>
  apiClient.post('/interviews/clean-question', { question, title })
