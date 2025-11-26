# Vue.js Auth Application

A full-stack authentication application built with Vue.js, Tailwind CSS, shadcn-vue, and SQLite.

## Features

- User registration and login
- JWT-based authentication
- Protected dashboard route
- User CRUD operations (Create, Read, Update, Delete)
- Modern UI with Tailwind CSS and shadcn-vue components
- SQLite database for data persistence

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn-vue
- **State Management**: Pinia
- **Routing**: Vue Router
- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT, bcryptjs

## Project Structure

```
vue-auth-app/
├── src/
│   ├── components/
│   │   └── ui/          # shadcn-vue components
│   ├── stores/
│   │   └── auth.ts      # Authentication store
│   ├── views/
│   │   ├── Login.vue
│   │   ├── Register.vue
│   │   └── Dashboard.vue
│   ├── router/
│   │   └── index.ts     # Route configuration
│   └── main.ts
├── server/
│   └── index.js         # Express server with SQLite
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd vue-auth-app
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

Start both the frontend and backend servers concurrently:

```bash
npm run dev
```

This will start:
- Frontend dev server at http://localhost:5173
- Backend API server at http://localhost:3000

### Individual Commands

Run frontend only:
```bash
npm run dev:client
```

Run backend only:
```bash
npm run dev:server
```

## Usage

1. Open your browser and navigate to http://localhost:5173
2. Register a new account on the registration page
3. Login with your credentials
4. Access the dashboard to manage users (CRUD operations)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires authentication)

### Users (Protected Routes)
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

## Security Notes

⚠️ **Important**: This is a development setup. For production:
- Change the JWT_SECRET in `server/index.js`
- Use environment variables for sensitive data
- Implement proper HTTPS
- Add rate limiting
- Implement proper password validation
- Add CSRF protection

## Database

The SQLite database (`database.db`) will be created automatically in the `server/` directory when you first run the application.

## License

MIT
