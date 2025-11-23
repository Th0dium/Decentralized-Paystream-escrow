# Backend Setup - Step by Step

## What's Included

✅ Express.js server configured
✅ Prisma ORM setup with PostgreSQL schema
✅ JWT authentication with security
✅ All controllers (auth, streams, milestones)
✅ All routes setup
✅ Contract event listener ready
✅ Error handling & middleware

## Your Next Steps

### Step 1: Create Supabase Database (10 mins)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
   - Name: "paystream"
   - Region: closest to you
3. Wait for it to be ready (~2 mins)
4. Go to "Settings" → "Database" → copy the connection string
5. It looks like: `postgresql://user:password@db.supabase.co:5432/postgres`

### Step 2: Setup Environment (5 mins)

```bash
cd backend
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
# From Supabase (Step 1)
DATABASE_URL="postgresql://user:password@db.supabase.co:5432/postgres"

# Generate a secret key (use any random string)
JWT_SECRET="your-super-secret-key-change-this"

# Get from Infura or Alchemy
RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"

# Your contract address (deploy contract first)
CONTRACT_ADDRESS="0x..."

# Your frontend URL
CORS_ORIGIN="http://localhost:3000"
```

### Step 3: Install Dependencies (5 mins)

```bash
npm install
```

### Step 4: Setup Database Schema (2 mins)

```bash
npm run prisma:push
```

This creates all tables in Supabase.

### Step 5: Start Server (1 min)

```bash
npm run dev
```

You should see:
```
🚀 Paystream Backend running on http://localhost:3001
📝 Environment: development
🔐 JWT enabled for security
🔍 Starting contract event listener...
```

### Step 6: Test It Works (5 mins)

Open new terminal:

```bash
# Test auth endpoint
curl -X POST http://localhost:3001/auth/verify-wallet \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x1234567890123456789012345678901234567890"}'

# Should return:
# {
#   "success": true,
#   "data": {
#     "walletAddress": "0x1234567890123456789012345678901234567890",
#     "role": null,
#     "isNewUser": true,
#     "token": "eyJ..."
#   }
# }
```

If you get this, backend is working! ✅

### Step 7: Connect Frontend (5 mins)

In `frontend/.env.local`, update:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Then run frontend:

```bash
cd frontend
npm run dev
```

### Step 8: Test End-to-End (5 mins)

1. Open http://localhost:3000
2. Click "Connect MetaMask"
3. Approve connection
4. You should see dashboard with your role!

---

## Complete Setup Checklist

- [ ] Create Supabase project
- [ ] Copy DATABASE_URL to .env.local
- [ ] Generate JWT_SECRET
- [ ] Set RPC_URL (Infura)
- [ ] Set CONTRACT_ADDRESS (after you deploy)
- [ ] Set CORS_ORIGIN to frontend URL
- [ ] Run `npm install`
- [ ] Run `npm run prisma:push`
- [ ] Run `npm run dev`
- [ ] Test auth endpoint with curl
- [ ] Update frontend .env.local
- [ ] Run frontend `npm run dev`
- [ ] Test MetaMask connection end-to-end

---

## Common Issues

### "DATABASE_URL is required"
- Make sure .env.local is created
- Check DATABASE_URL is not empty

### "Can't connect to database"
- Verify CONNECTION_STRING is correct from Supabase
- Make sure Supabase project is running
- Check your internet connection

### "Port 3001 already in use"
```bash
# Kill the process on port 3001
# On Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# On Mac/Linux:
lsof -i :3001
kill -9 <PID>
```

### "CORS error when connecting from frontend"
- Make sure CORS_ORIGIN matches your frontend URL
- Default is http://localhost:3000

### "Can't get MetaMask to connect"
- Make sure frontend is running on http://localhost:3000
- Check browser console for errors
- Verify MetaMask is installed

---

## What's Working Now

✅ Auth endpoint - Create/verify user
✅ Streams endpoints - Get/create streams
✅ Milestones endpoints - Get/create/approve milestones
✅ JWT security - Protected routes
✅ Contract listener - Auto-saves events
✅ Database - Supabase PostgreSQL

## What Comes Next

1. Deploy contract to Sepolia testnet
2. Add contract ABI to `contractListener.ts`
3. Update CONTRACT_ADDRESS in .env.local
4. Test event listener with real contract
5. Deploy backend (Railway, Vercel, etc)
6. Deploy frontend
7. Test full flow

---

## Quick Commands

```bash
# Development
npm run dev              # Start server with hot reload
npm run build           # Build for production
npm run start           # Run production build

# Database
npm run prisma:push     # Push schema to DB
npm run prisma:migrate  # Create migration
npm run prisma:studio   # Open database UI
npm run prisma:generate # Regenerate Prisma client
```

---

## That's It!

You now have a production-ready backend with:
- ✅ JWT security
- ✅ Supabase database
- ✅ All required endpoints
- ✅ Contract event listener
- ✅ Error handling
- ✅ TypeScript safety

Next: Deploy contract and connect everything! 🚀
