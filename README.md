# SkillLink 🚀

A modern fullstack platform connecting university students for projects, hackathons, and competitions through skill-matching algorithms and real-time team collaboration.

---

## 🌟 Key Features

- **Skill-Matching Engine**: Automatically matches and scores candidate listings based on overlapping skills and university affiliation.
- **Project & Hackathon Listings**: Create listings with required skill tags, target team size, and application deadlines.
- **Application Workflow**: Students submit join requests; project owners review, approve, or decline candidates with automatic team enrollment.
- **Real-Time Alerts & Notifications**: Automated notifications for join requests and team approval updates.
- **Serverless PostgreSQL Database**: Powered by Neon PostgreSQL and Prisma ORM for relational persistence.
- **Modern Responsive UI**: Built with React 19, TypeScript, Tailwind CSS, Lucide icons, and Plus Jakarta Sans.

---

## 🏗️ Architecture & Tech Stack

```
SkillLink/
├── backend/                  # RESTful API Server
│   ├── prisma/
│   │   ├── schema.prisma     # Neon PostgreSQL Database Schema
│   │   └── seed.ts           # Initial test users & listings
│   ├── src/
│   │   ├── config/           # Database connection singleton
│   │   ├── controllers/      # Auth, Listings, Requests, Matches, Notifications
│   │   ├── middleware/       # JWT Authentication & Validation
│   │   ├── routes/           # Express API endpoints
│   │   └── server.ts         # App entry point
│   └── package.json
└── src/                      # React Frontend
    ├── components/           # UI elements & layout
    ├── context/              # AppContext synchronized with backend
    ├── pages/                # Feed, Matches, Requests, Profile, CreateListing
    ├── services/             # Typed API client
    └── types/                # Shared TypeScript definitions
```

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, Zod, JWT, bcryptjs
- **Database**: Neon PostgreSQL, Prisma ORM

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **npm** (v9+)
- A free **Neon PostgreSQL** database project from [neon.tech](https://neon.tech)

---

### 2. Setup Backend Environment

Create a `.env` file in the `backend/` folder:

```bash
cd backend
cp .env.example .env
```

Add your Neon connection string inside `backend/.env`:
```env
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
PORT=5000
JWT_SECRET="your-jwt-secret-key"
FRONTEND_URL="http://localhost:5173"
```

---

### 3. Initialize Database & Seed

From the project root:

```bash
# Push schema to Neon PostgreSQL
npm run db:push

# (Optional) Seed sample users & listings
npm run db:seed
```

---

### 4. Run the Development Servers

```bash
# Terminal 1: Start Backend API (runs on http://localhost:5000)
npm run dev:backend

# Terminal 2: Start Frontend App (runs on http://localhost:5173)
npm run dev
```

---

## 🧪 Pre-configured Seed Accounts

When using `npm run db:seed`, you can test with these demo accounts (Password for all: `password123`):
- `shoumik1908@gmail.com` (React, UI/UX, Tailwind)
- `bob@uni.edu` (Python, Machine Learning)
- `charlie@uni.edu` (Node.js, PostgreSQL, React)

---

## 📄 License
MIT
