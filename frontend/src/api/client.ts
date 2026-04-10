import axios from 'axios'

// In development (Vite proxy), use /api
// In production (Vercel services), use /_/backend/api
const baseURL = import.meta.env.DEV ? '/api' : '/_/backend/api'

const api = axios.create({ baseURL })

export default api
