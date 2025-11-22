# Paystream Backend

Express.js + Prisma + PostgreSQL (Supabase) backend for Paystream.

## Quick Start

### 1. Setup Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your database connection string (PostgreSQL)
4. Save it to `.env` as `DATABASE_URL`

### 2. Setup Environment

```bash
cp .env.example .env.local
```

Update `.env.local`:
- `DATABASE_URL` - From Supabase
- `JWT_SECRET` - Generate a strong key
- `RPC_URL` - Sepolia RPC endpoint (Infura)
- `CONTRACT_ADDRESS` - Your deployed contract
- `CORS_ORIGIN` - Your frontend URL

### 3. Install & Run

```bash
npm install
npm run prisma:push
npm run dev
```

### 4. Test

```bash
# Auth endpoint
curl -X POST http://localhost:3001/auth/verify-wallet \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x1234567890123456789012345678901234567890"}'

# Health check
curl http://localhost:3001/health
```

## Project Structure

```
src/
├── controllers/  - Handle HTTP requests
├── routes/       - Define endpoints
├── services/     - Business logic
├── middleware/   - Auth, error handling
├── config/       - Configuration
└── server.ts     - Main app
```

## Key Features

✅ JWT authentication for security
✅ Prisma ORM for database
✅ Supabase PostgreSQL
✅ Automated contract event listener
✅ Role-based access control
✅ Type-safe with TypeScript

## API Endpoints

### Auth
- `POST /auth/verify-wallet` - Login/verify wallet, get JWT
- `GET /auth/profile` - Get user profile (requires JWT)
- `POST /auth/logout` - Logout

### Streams
- `GET /streams/employee/:walletAddress` - Get employee streams
- `GET /streams/company/:walletAddress` - Get company streams
- `GET /streams/:streamId` - Get stream details
- `POST /streams` - Create stream (requires JWT)
- `PATCH /streams/:streamId` - Update stream status (requires JWT)

### Milestones
- `GET /milestones/employee/:walletAddress` - Get employee milestones
- `GET /milestones/pending` - Get pending milestones
- `GET /milestones/:milestoneId` - Get milestone details
- `POST /milestones` - Create milestone (requires JWT)
- `PATCH /milestones/:milestoneId/approve` - Approve (requires JWT)
- `PATCH /milestones/:milestoneId/reject` - Reject (requires JWT)

## Database Schema

### Users
- wallet: unique address
- role: COMPANY, EMPLOYEE, AUDITOR, or null

### Streams
- streamId: unique ID from contract
- company, employee: wallet addresses
- totalAmount, withdrawn, escrowed: stored as strings (big numbers)
- escrowBps: escrow percentage in basis points
- status: ACTIVE, PAUSED, CANCELLED

### Milestones
- milestoneId: unique ID from contract
- streamId: linked stream
- submitter: employee address
- amount: escrowed amount
- status: PENDING, APPROVED, REJECTED, CLAIMED
- ipfsHash: evidence link

## Contract Event Listener

Automatically listens to contract events:
- `StreamCreated` - Save new stream
- `Withdrawn` - Update stream balances
- `MilestoneSubmitted` - Save new milestone
- `StreamPaused` - Update status
- `StreamCancelled` - Update status

Events are processed automatically and saved to database.

## Deployment

### Deploy to Vercel

```bash
npm run build
vercel deploy
```

### Deploy to Railway

1. Push to GitHub
2. Connect Railway to repo
3. Set environment variables
4. Deploy

## Development

```bash
npm run dev      # Start dev server with auto-reload
npm run build    # Build for production
npm run start    # Run production build
```

## Prisma

```bash
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Create migration
npm run prisma:push      # Push schema to DB
npm run prisma:studio    # Open Prisma Studio
```

## Notes

- JWT tokens expire in 7 days (configurable)
- Contract listener runs automatically on server start
- All wallet addresses are converted to lowercase
- Big numbers stored as strings to prevent precision loss

## Support

For issues or questions, check the main README or open an issue.
