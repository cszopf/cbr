import axios from 'axios'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vcaisuhqogmlyrhgzzzc.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYWlzdWhxb2dtbHlyaGd6enpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODg0ODQsImV4cCI6MjA4ODc2NDQ4NH0.uWFXxc0nbQdCZf-YREBbXPaexzLRJB9o3JbcWvt2qg0'

// Direct Supabase PostgREST client
const supabase = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  },
})

export { SUPABASE_URL, SUPABASE_KEY }
export default supabase
