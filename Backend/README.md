# Job Saarthi Backend

Industry-grade backend with PostgreSQL and MongoDB support.

## 🚀 Features

- ✅ Dual database support (PostgreSQL + MongoDB)
- ✅ JWT authentication
- ✅ Security headers (Helmet)
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Error handling
- ✅ Request logging
- ✅ Environment-based configuration
- ✅ Graceful shutdown

## 📁 Project Structure

```
Backend/
├── src/
│   ├── db/
│   │   ├── index.js        # Database exports
│   │   ├── mongodb.js      # MongoDB connection
│   │   └── postgres.js     # PostgreSQL connection
│   ├── middlewares/
│   │   └── auth.middleware.js
│   ├── models/
│   │   ├── user.model.js   # Mongoose user model
│   │   └── schema.sql      # PostgreSQL schema
│   ├── utils/
│   ├── app.js              # Express app setup
│   ├── index.js            # Server entry point
│   └── constants.js
├── .env
├── .env.example
└── package.json
```

## 🛠️ Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```env
PORT=8000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017
DB_NAME=jobsaarthi

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=jobsaarthi

# JWT
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
```

### 3. Setup PostgreSQL

Create database and run schema:

```bash
# Create database
createdb jobsaarthi

# Run schema
psql -U postgres -d jobsaarthi -f src/models/schema.sql
```

### 4. Start Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## 📚 Database Usage

### MongoDB (using Mongoose)

```javascript
import { User } from './models/user.model.js';

const user = await User.findOne({ email: 'user@example.com' });
```

### PostgreSQL (using pg)

```javascript
import { query } from './db/postgres.js';

const result = await query('SELECT * FROM users WHERE email = $1', ['user@example.com']);
```

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017 |
| `POSTGRES_HOST` | PostgreSQL host | localhost |
| `JWT_SECRET` | JWT secret key | - |
| `CORS_ORIGIN` | Allowed origin | http://localhost:3000 |

## 🚦 API Endpoints

### Health Check
- `GET /health` - Check server status

## 📦 Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **pg** - PostgreSQL client
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT tokens
- **helmet** - Security headers
- **cors** - CORS middleware
- **express-rate-limit** - Rate limiting
- **compression** - Response compression
- **morgan** - Request logging

## 🔧 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

## 📝 License

ISC
