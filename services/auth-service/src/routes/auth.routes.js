import express from 'express'
import {
  register,
  login,
  getMe,
  adminCreateUser,
  adminGetAllUsers,
  adminUpdateUser,
  adminDeleteUser,
} from '../controllers/auth.controller.js'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js'

const router = express.Router()

// Public
router.post('/login', login)

// Admin-only user management
router.post('/admin/users',           requireAuth, requireAdmin, adminCreateUser)
router.get('/admin/users',            requireAuth, requireAdmin, adminGetAllUsers)
router.put('/admin/users/:user_id',   requireAuth, requireAdmin, adminUpdateUser)
router.delete('/admin/users/:user_id',requireAuth, requireAdmin, adminDeleteUser)

// Internal (keep register for dev/seed, protect it)
router.post('/register', requireAuth, requireAdmin, register)

// Auth check
router.get('/me', requireAuth, getMe)

export default router