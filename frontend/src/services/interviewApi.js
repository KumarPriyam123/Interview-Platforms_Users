import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_INTERVIEW_API_URL || 'http://localhost:8002'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
})

export const uploadResume = (file, role, company, email) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('role', role)
  formData.append('company', company)
  formData.append('email', email)

  return apiClient.post('/api/interviews/start', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 180000,
  })
}

export const getAllQuestions = (sessionId) =>
  apiClient.get(`/api/interviews/${sessionId}/questions`)

export const getCurrentQuestion = (sessionId) =>
  apiClient.get(`/api/interviews/${sessionId}/question`)

export const submitAnswer = (sessionId, answer) =>
  apiClient.post(`/api/interviews/${sessionId}/answer`, { answer })

export const submitCounterAnswer = (sessionId, answer, questionNumber, counterIndex, counterQuestion) =>
  apiClient.post(`/api/interviews/${sessionId}/counter-answer`, {
    answer,
    question_number: questionNumber,
    counter_index: counterIndex,
    counter_question: counterQuestion,
  })

export const moveToNext = (sessionId) =>
  apiClient.post(`/api/interviews/${sessionId}/next`)

export const askDoubt = (sessionId, doubt, currentPrompt) =>
  apiClient.post(`/api/interviews/${sessionId}/doubt`, { doubt, currentPrompt })

export const getInterviewReport = (sessionId) =>
  apiClient.get(`/api/interviews/${sessionId}/report`)

export const endInterview = (sessionId) =>
  apiClient.post(`/api/interviews/${sessionId}/end`, {})

export const runCode = (language, code, testCases, mode = 'run') =>
  apiClient.post('/api/interviews/code/run', { language, code, testCases, mode })

export const cleanQuestionText = (question, title = '') =>
  apiClient.post('/api/interviews/clean-question', { question, title })
