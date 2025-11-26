import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import initSqlJs from 'sql.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = 3000
const JWT_SECRET = 'your-secret-key-change-this-in-production'

// Initialize SQLite database
let db
const dbPath = join(__dirname, 'database.db')

const SQL = await initSqlJs()

if (existsSync(dbPath)) {
  const buffer = readFileSync(dbPath)
  db = new SQL.Database(buffer)
} else {
  db = new SQL.Database()
}

// Create users table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Save database to disk
function saveDatabase() {
  const data = db.export()
  writeFileSync(dbPath, data)
}

// Middleware
app.use(cors())
app.use(express.json())

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access denied' })
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET)
    req.user = verified
    next()
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' })
  }
}

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Check if user already exists
    const existingUser = db.exec('SELECT * FROM users WHERE email = ?', [email])
    if (existingUser[0]?.values.length > 0) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user
    db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword])
    saveDatabase()

    const result = db.exec('SELECT id, name, email FROM users WHERE email = ?', [email])
    const userData = result[0].values[0]
    const user = { id: userData[0], name: userData[1], email: userData[2] }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })

    res.json({ token, user })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user
    const result = db.exec('SELECT * FROM users WHERE email = ?', [email])
    if (!result[0]?.values.length) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    const userData = result[0].values[0]
    const user = { id: userData[0], name: userData[1], email: userData[2], password: userData[3] }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
    const userResponse = { id: user.id, name: user.name, email: user.email }

    res.json({ token, user: userResponse })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const result = db.exec('SELECT id, name, email FROM users WHERE id = ?', [req.user.id])
    if (!result[0]?.values.length) {
      return res.status(404).json({ error: 'User not found' })
    }
    const userData = result[0].values[0]
    const user = { id: userData[0], name: userData[1], email: userData[2] }
    res.json({ user })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// User CRUD Routes
app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const result = db.exec('SELECT id, name, email, created_at FROM users')
    const users = result[0]?.values.map(row => ({
      id: row[0],
      name: row[1],
      email: row[2],
      created_at: row[3]
    })) || []
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Check if user already exists
    const existingResult = db.exec('SELECT * FROM users WHERE email = ?', [email])
    if (existingResult[0]?.values.length > 0) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user
    db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword])
    saveDatabase()

    const result = db.exec('SELECT id, name, email FROM users WHERE email = ?', [email])
    const userData = result[0].values[0]
    const user = { id: userData[0], name: userData[1], email: userData[2] }
    res.json(user)
  } catch (error) {
    console.error('Create user error:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { name, email } = req.body

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }

    // Check if email is taken by another user
    const existingResult = db.exec('SELECT * FROM users WHERE email = ? AND id != ?', [email, id])
    if (existingResult[0]?.values.length > 0) {
      return res.status(400).json({ error: 'Email already in use' })
    }

    db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, id])
    saveDatabase()

    const result = db.exec('SELECT id, name, email FROM users WHERE id = ?', [id])
    const userData = result[0].values[0]
    const user = { id: userData[0], name: userData[1], email: userData[2] }
    res.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    db.run('DELETE FROM users WHERE id = ?', [id])
    saveDatabase()
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
