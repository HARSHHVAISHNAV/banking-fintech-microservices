import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.get('/health', (req, res) => res.json({ service: 'auth-service', status: 'UP' }))
export default app
