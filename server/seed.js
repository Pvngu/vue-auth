import bcrypt from 'bcryptjs'
import initSqlJs from 'sql.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')

  const dbPath = join(__dirname, 'database.db')
  
  const SQL = await initSqlJs()
  let db

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
    console.log('✓ Existing database loaded')
  } else {
    db = new SQL.Database()
    console.log('✓ New database created')
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
  console.log('✓ Users table ready')

  // Create categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✓ Categories table ready')

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
  console.log('✓ Items table ready')

  // Create roles table
  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✓ Roles table ready')

  // Create permissions table
  db.run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✓ Permissions table ready')

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
  console.log('✓ Role_permissions table ready')

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
  console.log('✓ User_roles table ready')

  // Seed permissions
  const permissions = [
    { name: 'users_view', description: 'View users' },
    { name: 'users_create', description: 'Create users' },
    { name: 'users_update', description: 'Update users' },
    { name: 'users_delete', description: 'Delete users' },
    { name: 'categories_view', description: 'View categories' },
    { name: 'categories_create', description: 'Create categories' },
    { name: 'categories_update', description: 'Update categories' },
    { name: 'categories_delete', description: 'Delete categories' },
    { name: 'items_view', description: 'View items' },
    { name: 'items_create', description: 'Create items' },
    { name: 'items_update', description: 'Update items' },
    { name: 'items_delete', description: 'Delete items' },
    { name: 'roles_view', description: 'View roles' },
    { name: 'roles_create', description: 'Create roles' },
    { name: 'roles_update', description: 'Update roles' },
    { name: 'roles_delete', description: 'Delete roles' }
  ]

  const existingPermissions = db.exec('SELECT * FROM permissions')
  if (!existingPermissions[0]?.values.length) {
    permissions.forEach(perm => {
      db.run('INSERT INTO permissions (name, description) VALUES (?, ?)', [perm.name, perm.description])
    })
    console.log('✓ Permissions created')
  } else {
    console.log('⚠ Permissions already exist, skipping')
  }

  // Seed roles
  const existingRoles = db.exec('SELECT * FROM roles')
  if (!existingRoles[0]?.values.length) {
    db.run('INSERT INTO roles (name, description) VALUES (?, ?)', ['Admin', 'Full system access'])
    db.run('INSERT INTO roles (name, description) VALUES (?, ?)', ['Manager', 'Can manage users and content'])
    db.run('INSERT INTO roles (name, description) VALUES (?, ?)', ['Viewer', 'Read-only access'])
    console.log('✓ Roles created')

    // Assign all permissions to Admin role
    const adminRole = db.exec('SELECT id FROM roles WHERE name = ?', ['Admin'])
    const adminRoleId = adminRole[0]?.values[0]?.[0]
    
    const allPerms = db.exec('SELECT id FROM permissions')
    if (allPerms[0]?.values) {
      allPerms[0].values.forEach(perm => {
        db.run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminRoleId, perm[0]])
      })
      console.log('✓ Admin role granted all permissions')
    }

    // Assign view permissions to Viewer role
    const viewerRole = db.exec('SELECT id FROM roles WHERE name = ?', ['Viewer'])
    const viewerRoleId = viewerRole[0]?.values[0]?.[0]
    const viewPerms = db.exec("SELECT id FROM permissions WHERE name LIKE '%_view'")
    if (viewPerms[0]?.values) {
      viewPerms[0].values.forEach(perm => {
        db.run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [viewerRoleId, perm[0]])
      })
      console.log('✓ Viewer role granted view permissions')
    }
  } else {
    console.log('⚠ Roles already exist, skipping')
  }

  // Check if usuario admin already exists
  const existingUser = db.exec('SELECT * FROM users WHERE email = ?', ['admin@tectijuana.edu.mx'])
  
  if (existingUser[0]?.values.length > 0) {
    console.log('⚠ usuario admin already exists, skipping...')
  } else {
    // Create usuario admin
    const hashedPassword = await bcrypt.hash('password123', 10)
    db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      ['usuario admin', 'admin@tectijuana.edu.mx', hashedPassword]
    )
    console.log('✓ usuario admin created')
    console.log('  Email: admin@tectijuana.edu.mx')
    console.log('  Password: password123')
  }

  // Assign Admin role to admin user
  const adminUser = db.exec('SELECT id FROM users WHERE email = ?', ['admin@tectijuana.edu.mx'])
  const adminUserId = adminUser[0]?.values[0]?.[0]
  const adminRole = db.exec('SELECT id FROM roles WHERE name = ?', ['Admin'])
  const adminRoleId = adminRole[0]?.values[0]?.[0]
  
  if (adminUserId && adminRoleId) {
    const existingUserRole = db.exec('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?', [adminUserId, adminRoleId])
    if (!existingUserRole[0]?.values.length) {
      db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [adminUserId, adminRoleId])
      console.log('✓ Admin role assigned to admin user')
    }
  }

  // Seed some categories if none exist
  const existingCategories = db.exec('SELECT * FROM categories')
  if (!existingCategories[0]?.values.length) {
    const categories = ['Electronics', 'Books', 'Clothing']
    categories.forEach(name => db.run('INSERT INTO categories (name) VALUES (?)', [name]))
    console.log('✓ Sample categories created')
  } else {
    console.log('⚠ Categories already exist, skipping sample categories')
  }

  // Seed some items if none exist
  const existingItems = db.exec('SELECT * FROM items')
  if (!existingItems[0]?.values.length) {
    // get a category id for Electronics and Books
    const electronics = db.exec('SELECT id FROM categories WHERE name = ?', ['Electronics'])
    const books = db.exec('SELECT id FROM categories WHERE name = ?', ['Books'])
    const electronicsId = electronics[0]?.values[0]?.[0] || null
    const booksId = books[0]?.values[0]?.[0] || null

    db.run('INSERT INTO items (name, description, category_id) VALUES (?, ?, ?)', ['Smartphone', 'A modern smartphone', electronicsId])
    db.run('INSERT INTO items (name, description, category_id) VALUES (?, ?, ?)', ['Novel', 'A best-selling novel', booksId])
    console.log('✓ Sample items created')
  } else {
    console.log('⚠ Items already exist, skipping sample items')
  }

  // Save database to disk
  const data = db.export()
  writeFileSync(dbPath, data)
  console.log('✓ Database saved')

  // Display all users
  const allUsers = db.exec('SELECT id, name, email, created_at FROM users')
  if (allUsers[0]?.values.length > 0) {
    console.log('\n📊 All users in database:')
    allUsers[0].values.forEach(user => {
      console.log(`  - ID: ${user[0]}, Name: ${user[1]}, Email: ${user[2]}`)
    })
  }

  db.close()
  console.log('\n✅ Seeding completed successfully!')
}

seedDatabase().catch(error => {
  console.error('❌ Seeding failed:', error)
  process.exit(1)
})
