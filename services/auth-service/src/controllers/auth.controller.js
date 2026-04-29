import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import db from '../config/db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key'

// ─── REGISTER (admin-only endpoint, kept for internal use) ────────────────────
export const register = async (req, res) => {
  const { name, email, password, mobile } = req.body
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email and password required' })

  try {
    const existing = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    if (existing.rows[0])
      return res.status(409).json({ error: 'Email already registered' })

    const password_hash = await bcrypt.hash(password, 10)
    const user_id = uuidv4()

    await db.query(
      'INSERT INTO users (user_id, name, email, password_hash, mobile, role) VALUES ($1,$2,$3,$4,$5,$6)',
      [user_id, name, email, password_hash, mobile || null, 'user']
    )

    const account_id = uuidv4()
    const upi_id = `${name.split(' ')[0].toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}@nexbank`

    await db.query(
      'INSERT INTO accounts (account_id, user_id, balance, status, upi_id) VALUES ($1,$2,$3,$4,$5)',
      [account_id, user_id, 1000, 'ACTIVE', upi_id]
    )

    res.status(201).json({
      user: { user_id, name, email, account_id, upi_id, mobile, role: 'user' }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'email and password required' })

  try {
    const result = await db.query(
      `SELECT u.*, a.account_id, a.balance, a.status as account_status, a.upi_id
       FROM users u
       LEFT JOIN accounts a ON a.user_id = u.user_id
       WHERE u.email = $1`,
      [email]
    )
    const user = result.rows[0]
    if (!user)
      return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' })

    const payload = {
      user_id:    user.user_id,
      email:      user.email,
      name:       user.name,
      role:       user.role,          // ← role in JWT
      account_id: user.account_id,
      upi_id:     user.upi_id,
      mobile:     user.mobile,
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: {
        user_id:    user.user_id,
        name:       user.name,
        email:      user.email,
        mobile:     user.mobile,
        role:       user.role,
        account_id: user.account_id,
        upi_id:     user.upi_id,
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getMe = async (req, res) => {
  res.json({ user: req.user })
}

// ─── ADMIN: Create user account ───────────────────────────────────────────────
export const adminCreateUser = async (req, res) => {
  const { name, email, password, mobile, initial_balance = 1000 } = req.body
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email and password required' })

  try {
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email])
    if (existing.rows[0])
      return res.status(409).json({ error: 'Email already registered' })

    const password_hash = await bcrypt.hash(password, 10)
    const user_id       = uuidv4()
    const account_id    = uuidv4()
    const upi_id        = `${name.split(' ')[0].toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}@nexbank`

    await db.query(
      'INSERT INTO users (user_id, name, email, password_hash, mobile, role) VALUES ($1,$2,$3,$4,$5,$6)',
      [user_id, name, email, password_hash, mobile || null, 'user']
    )
    await db.query(
      'INSERT INTO accounts (account_id, user_id, balance, status, upi_id) VALUES ($1,$2,$3,$4,$5)',
      [account_id, user_id, initial_balance, 'ACTIVE', upi_id]
    )

    res.status(201).json({
      user: { user_id, name, email, mobile, role: 'user', account_id, upi_id, balance: initial_balance }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ─── ADMIN: Get all users ─────────────────────────────────────────────────────
export const adminGetAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.user_id, u.name, u.email, u.mobile, u.role, u.created_at,
              a.account_id, a.balance, a.status, a.upi_id
       FROM users u
       LEFT JOIN accounts a ON a.user_id = u.user_id
       ORDER BY u.created_at DESC`
    )
    res.json({ users: result.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ─── ADMIN: Update user ───────────────────────────────────────────────────────
export const adminUpdateUser = async (req, res) => {
  const { user_id } = req.params
  const { name, email, mobile, balance, status } = req.body

  try {
    if (name || email || mobile) {
      await db.query(
        `UPDATE users SET
          name   = COALESCE($1, name),
          email  = COALESCE($2, email),
          mobile = COALESCE($3, mobile)
         WHERE user_id = $4`,
        [name || null, email || null, mobile || null, user_id]
      )
    }

    if (balance !== undefined || status) {
      await db.query(
        `UPDATE accounts SET
          balance = COALESCE($1, balance),
          status  = COALESCE($2, status)
         WHERE user_id = $3`,
        [balance ?? null, status || null, user_id]
      )
    }

    // Return updated user
    const result = await db.query(
      `SELECT u.user_id, u.name, u.email, u.mobile, u.role, u.created_at,
              a.account_id, a.balance, a.status, a.upi_id
       FROM users u LEFT JOIN accounts a ON a.user_id = u.user_id
       WHERE u.user_id = $1`,
      [user_id]
    )

    res.json({ user: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ─── ADMIN: Delete user ───────────────────────────────────────────────────────
export const adminDeleteUser = async (req, res) => {
  const { user_id } = req.params
  try {
    await db.query('DELETE FROM users WHERE user_id = $1', [user_id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}