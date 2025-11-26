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

  // Check if test user already exists
  const existingUser = db.exec('SELECT * FROM users WHERE email = ?', ['admin@tectijuana.edu.mx'])
  
  if (existingUser[0]?.values.length > 0) {
    console.log('⚠ Test user already exists, skipping...')
  } else {
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10)
    db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      ['Test User', 'admin@tectijuana.edu.mx', hashedPassword]
    )
    console.log('✓ Test user created')
    console.log('  Email: admin@tectijuana.edu.mx')
    console.log('  Password: password123')
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
