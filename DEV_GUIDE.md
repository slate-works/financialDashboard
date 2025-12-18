# Development Guide

## Local Development Setup

### Backend (Port 3001)
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend (Port 3000)
```bash
cd frontend
pnpm install
pnpm run dev
```

Access locally at: `http://localhost:3000`
Backend API at: `http://localhost:3001`

---

## Docker Production Setup (Linux Server)

### Build and Deploy
```bash
cd infra
docker-compose down
docker-compose up --build -d
```

### Access
- Frontend: `http://your-server-ip:2025`
- Backend: `http://your-server-ip:5000`

---

## How It Works

The frontend automatically detects the environment:
- **localhost**: Connects to `http://localhost:3001` (local backend)
- **Remote IP**: Connects to `http://server-ip:5000` (Docker backend)

---

## Troubleshooting

### Backend won't start
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npx prisma generate
```

### Database issues
```bash
cd backend
npx prisma migrate reset  # WARNING: Deletes all data!
npx prisma migrate dev
```

### Frontend build errors
```bash
cd frontend
rm -rf node_modules .next pnpm-lock.yaml
pnpm install
```
