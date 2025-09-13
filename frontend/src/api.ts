import axios from 'axios'
const api = axios.create({ baseURL: '/api' })

// Token storage + auto refresh
let accessToken: string | null = null
let refreshToken: string | null = null

export function setToken(token: string|null, rtoken?: string|null) {
  accessToken = token
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('access_token', token); else localStorage.removeItem('access_token')
    if (rtoken !== undefined) {
      refreshToken = rtoken
      if (rtoken) localStorage.setItem('refresh_token', rtoken); else localStorage.removeItem('refresh_token')
    }
  }
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete api.defaults.headers.common['Authorization']
}

if (typeof window !== 'undefined') {
  const at = localStorage.getItem('access_token'); const rt = localStorage.getItem('refresh_token');
  if (at) setToken(at, rt)
}

api.interceptors.response.use(r=>r, async (err)=>{
  const cfg = err.config
  if (err.response && err.response.status === 401 && refreshToken && !cfg._retry) {
    cfg._retry = true
    try {
      const resp = await axios.post('/api/auth/refresh', {}, { headers: { Authorization: `Bearer ${refreshToken}` } })
      setToken(resp.data.access_token, refreshToken)
      cfg.headers['Authorization'] = `Bearer ${resp.data.access_token}`
      return api(cfg)
    } catch(e) {
      setToken(null, null)
    }
  }
  return Promise.reject(err)
})

export function setToken(token: string|null) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete api.defaults.headers.common['Authorization']
}

export const Auth = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }).then(r=>r.data),
  register: (email: string, password: string) => api.post('/auth/register', { email, password }).then(r=>r.data),
  refresh: () => api.post('/auth/refresh').then(r=>r.data)
}).then(r=>r.data),
  register: (email: string, password: string) => api.post('/auth/register', { email, password }).then(r=>r.data)
}

export const Profile = {
  get: () => api.get('/profile').then(r=>r.data),
  update: (p:any) => api.put('/profile', p).then(r=>r.data)
}

export const Items = {
  list: () => api.get('/items').then(r=>r.data),
  add: (it:any) => api.post('/items', it).then(r=>r.data),
  del: (id:number) => api.delete(`/items/${id}`).then(r=>r.data),
  scan: (barcode:string) => api.get(`/barcode/${barcode}`).then(r=>r.data)
}

export const Recipes = {
  suggest: () => api.post('/recipes/suggest').then(r=>r.data)
}
