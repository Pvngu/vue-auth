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

// Create categories table
db.run(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Create items table
db.run(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )
`)

// Create roles table
db.run(`
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Create permissions table
db.run(`
  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Create role_permissions junction table
db.run(`
  CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER,
    permission_id INTEGER,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
  )
`)

// Create user_roles junction table
db.run(`
  CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER,
    role_id INTEGER,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
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

// Helper function to get user permissions
function getUserPermissions(userId) {
  try {
    const result = db.exec(`
      SELECT DISTINCT p.name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `, [userId])
    
    if (result[0]?.values) {
      return result[0].values.map(row => row[0])
    }
    return []
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return []
  }
}

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

// Permission middleware
function requirePermission(permissionName) {
  return (req, res, next) => {
    const permissions = getUserPermissions(req.user.id)
    if (!permissions.includes(permissionName)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
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
    const permissions = getUserPermissions(user.id)
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })

    res.json({ token, user, permissions })
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

    const permissions = getUserPermissions(user.id)
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
    const userResponse = { id: user.id, name: user.name, email: user.email }

    res.json({ token, user: userResponse, permissions })
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
    const permissions = getUserPermissions(user.id)
    res.json({ user, permissions })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// User CRUD Routes
app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const result = db.exec('SELECT id, name, email, password, created_at FROM users')
    const users = result[0]?.values.map(row => ({
      id: row[0],
      name: row[1],
      email: row[2],
      password: row[3],
      created_at: row[3]
    })) || []
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Categories CRUD
app.get('/api/categories', authenticateToken, (req, res) => {
  try {
    const result = db.exec('SELECT id, name, created_at FROM categories ORDER BY id DESC')
    const categories = result[0]?.values.map(row => ({ id: row[0], name: row[1], created_at: row[2] })) || []
    res.json(categories)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

app.post('/api/categories', authenticateToken, (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    // check exists
    const existing = db.exec('SELECT id FROM categories WHERE name = ?', [name])
    if (existing[0]?.values.length > 0) return res.status(400).json({ error: 'Category already exists' })
    db.run('INSERT INTO categories (name) VALUES (?)', [name])
    saveDatabase()
    const result = db.exec('SELECT id, name FROM categories WHERE name = ?', [name])
    const row = result[0].values[0]
    res.json({ id: row[0], name: row[1] })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' })
  }
})

app.put('/api/categories/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const existing = db.exec('SELECT id FROM categories WHERE name = ? AND id != ?', [name, id])
    if (existing[0]?.values.length > 0) return res.status(400).json({ error: 'Category name already in use' })
    db.run('UPDATE categories SET name = ? WHERE id = ?', [name, id])
    saveDatabase()
    const result = db.exec('SELECT id, name FROM categories WHERE id = ?', [id])
    const row = result[0].values[0]
    res.json({ id: row[0], name: row[1] })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' })
  }
})

app.delete('/api/categories/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    // Optionally, you might want to set items' category_id to NULL
    db.run('UPDATE items SET category_id = NULL WHERE category_id = ?', [id])
    db.run('DELETE FROM categories WHERE id = ?', [id])
    saveDatabase()
    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

// Items CRUD
app.get('/api/items', authenticateToken, (req, res) => {
  try {
    // Return items with category name
    const result = db.exec(`SELECT items.id, items.name, items.description, items.category_id, categories.name as category_name, items.created_at FROM items LEFT JOIN categories ON items.category_id = categories.id ORDER BY items.id DESC`)
    const items = result[0]?.values.map(row => ({ id: row[0], name: row[1], description: row[2], category_id: row[3], category_name: row[4], created_at: row[5] })) || []
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' })
  }
})

app.post('/api/items', authenticateToken, (req, res) => {
  try {
    const { name, description, category_id } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    db.run('INSERT INTO items (name, description, category_id) VALUES (?, ?, ?)', [name, description || null, category_id || null])
    saveDatabase()
    const result = db.exec('SELECT id, name, description, category_id FROM items ORDER BY id DESC LIMIT 1')
    const row = result[0].values[0]
    res.json({ id: row[0], name: row[1], description: row[2], category_id: row[3] })
  } catch (error) {
    console.error('Create item error:', error)
    res.status(500).json({ error: 'Failed to create item' })
  }
})

app.put('/api/items/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    const { name, description, category_id } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    db.run('UPDATE items SET name = ?, description = ?, category_id = ? WHERE id = ?', [name, description || null, category_id || null, id])
    saveDatabase()
    const result = db.exec('SELECT id, name, description, category_id FROM items WHERE id = ?', [id])
    const row = result[0].values[0]
    res.json({ id: row[0], name: row[1], description: row[2], category_id: row[3] })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' })
  }
})

app.delete('/api/items/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    db.run('DELETE FROM items WHERE id = ?', [id])
    saveDatabase()
    res.json({ message: 'Item deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' })
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

// Roles CRUD
app.get('/api/roles', authenticateToken, requirePermission('roles_view'), (req, res) => {
  try {
    const result = db.exec('SELECT id, name, description FROM roles ORDER BY id DESC')
    const roles = result[0]?.values.map(row => ({ id: row[0], name: row[1], description: row[2] })) || []
    res.json(roles)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' })
  }
})

app.post('/api/roles', authenticateToken, requirePermission('roles_create'), (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const existing = db.exec('SELECT id FROM roles WHERE name = ?', [name])
    if (existing[0]?.values.length > 0) return res.status(400).json({ error: 'Role already exists' })
    db.run('INSERT INTO roles (name, description) VALUES (?, ?)', [name, description || null])
    saveDatabase()
    const result = db.exec('SELECT id, name, description FROM roles WHERE name = ?', [name])
    const row = result[0].values[0]
    res.json({ id: row[0], name: row[1], description: row[2] })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create role' })
  }
})

app.put('/api/roles/:id', authenticateToken, requirePermission('roles_update'), (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const existing = db.exec('SELECT id FROM roles WHERE name = ? AND id != ?', [name, id])
    if (existing[0]?.values.length > 0) return res.status(400).json({ error: 'Role name already in use' })
    db.run('UPDATE roles SET name = ?, description = ? WHERE id = ?', [name, description || null, id])
    saveDatabase()
    const result = db.exec('SELECT id, name, description FROM roles WHERE id = ?', [id])
    const row = result[0].values[0]
    res.json({ id: row[0], name: row[1], description: row[2] })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' })
  }
})

app.delete('/api/roles/:id', authenticateToken, requirePermission('roles_delete'), (req, res) => {
  try {
    const { id } = req.params
    db.run('DELETE FROM role_permissions WHERE role_id = ?', [id])
    db.run('DELETE FROM user_roles WHERE role_id = ?', [id])
    db.run('DELETE FROM roles WHERE id = ?', [id])
    saveDatabase()
    res.json({ message: 'Role deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role' })
  }
})

// Permissions CRUD
app.get('/api/permissions', authenticateToken, (req, res) => {
  try {
    const result = db.exec('SELECT id, name, description FROM permissions ORDER BY name')
    const permissions = result[0]?.values.map(row => ({ id: row[0], name: row[1], description: row[2] })) || []
    res.json(permissions)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions' })
  }
})

// Role Permissions Management
app.get('/api/roles/:id/permissions', authenticateToken, requirePermission('roles_view'), (req, res) => {
  try {
    const { id } = req.params
    const result = db.exec(`
      SELECT p.id, p.name, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.name
    `, [id])
    const permissions = result[0]?.values.map(row => ({ id: row[0], name: row[1], description: row[2] })) || []
    res.json(permissions)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role permissions' })
  }
})

app.post('/api/roles/:id/permissions', authenticateToken, requirePermission('roles_update'), (req, res) => {
  try {
    const { id } = req.params
    const { permission_id } = req.body
    if (!permission_id) return res.status(400).json({ error: 'Permission ID is required' })
    db.run('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, permission_id])
    saveDatabase()
    res.json({ message: 'Permission added to role' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to add permission to role' })
  }
})

app.delete('/api/roles/:roleId/permissions/:permissionId', authenticateToken, requirePermission('roles_update'), (req, res) => {
  try {
    const { roleId, permissionId } = req.params
    db.run('DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?', [roleId, permissionId])
    saveDatabase()
    res.json({ message: 'Permission removed from role' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove permission from role' })
  }
})

// User Roles Management
app.get('/api/users/:id/roles', authenticateToken, requirePermission('users_view'), (req, res) => {
  try {
    const { id } = req.params
    const result = db.exec(`
      SELECT r.id, r.name, r.description
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `, [id])
    const roles = result[0]?.values.map(row => ({ id: row[0], name: row[1], description: row[2] })) || []
    res.json(roles)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user roles' })
  }
})

app.post('/api/users/:id/roles', authenticateToken, requirePermission('users_update'), (req, res) => {
  try {
    const { id } = req.params
    const { role_id } = req.body
    if (!role_id) return res.status(400).json({ error: 'Role ID is required' })
    db.run('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, role_id])
    saveDatabase()
    res.json({ message: 'Role assigned to user' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign role to user' })
  }
})

app.delete('/api/users/:userId/roles/:roleId', authenticateToken, requirePermission('users_update'), (req, res) => {
  try {
    const { userId, roleId } = req.params
    db.run('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?', [userId, roleId])
    saveDatabase()
    res.json({ message: 'Role removed from user' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove role from user' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
