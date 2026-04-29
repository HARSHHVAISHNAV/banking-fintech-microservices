import axios from 'axios'

// ─── AXIOS INSTANCES ──────────────────────────────────────────────────────────
const authAPI        = axios.create({ baseURL: '/api/auth' })
const accountAPI     = axios.create({ baseURL: '/api/accounts' })
const transactionAPI = axios.create({ baseURL: '/api/transactions' })

// Auto-attach JWT to every request
;[authAPI, accountAPI, transactionAPI].forEach((api) => {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
})

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  authAPI.post('/login', { email, password }).then(r => r.data)

// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────
export const getAccount = (account_id) =>
  accountAPI.get(`/${account_id}`).then(r => r.data)

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
export const getHistory = (account_id) =>
  transactionAPI.get(`/history/${account_id}`).then(r => r.data)

export const getStatement = (account_id, from, to) =>
  transactionAPI.get(`/statement/${account_id}?from=${from}&to=${to}`).then(r => r.data)

export const sendMoney = ({ from_account, to_account, amount, idempotencyKey }) =>
  transactionAPI.post(
    '/transfer',
    { from_account, to_account, amount },
    { headers: { 'Idempotency-Key': idempotencyKey } }
  ).then(r => r.data)

// ─── ADMIN ────────────────────────────────────────────────────────────────────
export const adminGetAllUsers = () =>
  authAPI.get('/admin/users').then(r => r.data)

export const adminCreateUser = (payload) =>
  authAPI.post('/admin/users', payload).then(r => r.data)

export const adminUpdateUser = (user_id, payload) =>
  authAPI.put(`/admin/users/${user_id}`, payload).then(r => r.data)

export const adminDeleteUser = (user_id) =>
  authAPI.delete(`/admin/users/${user_id}`).then(r => r.data)