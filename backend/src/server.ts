import express from 'express'
import cors from 'cors'
import { config } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { startContractListener } from './services/contractListener'
import authRoutes from './routes/auth'
import streamsRoutes from './routes/streams'
import milestonesRoutes from './routes/milestones'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()

// CORS configuration with pattern matching for Vercel preview URLs
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    // Check if origin matches configured origins or Vercel pattern
    const allowedOrigins = config.cors.origin
    const vercelPattern = /https:\/\/.*\.vercel\.app$/
    const isAllowed = allowedOrigins.includes(origin) || vercelPattern.test(origin)

    if (isAllowed) {
      callback(null, true)
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`)
      callback(new Error('CORS policy violation'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Routes
app.use('/auth', authRoutes)
app.use('/streams', streamsRoutes)
app.use('/milestones', milestonesRoutes)

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  try {
    console.log('🏥 Health check requested')

    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection OK')

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error) {
    console.error('❌ Health check failed:', error)
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Error handling
app.use(errorHandler)

// Start server
const PORT = config.server.port

async function startServer() {
  try {
    console.log('\n🚀 === SERVER STARTUP ===')

    // Test database connection before starting server
    console.log('🔌 Testing database connection...')
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection successful')

    const server = app.listen(PORT, () => {
      console.log(`✅ Paystream Backend running on http://localhost:${PORT}`)
      console.log(`📝 Environment: ${config.server.nodeEnv}`)
      console.log(`🔐 JWT enabled for security`)
      console.log(`📡 CORS enabled for: ${config.cors.origin.join(', ')}`)
      console.log('=== SERVER READY ===\n')

      // Start contract listener
      try {
        startContractListener()
      } catch (err) {
        console.error('⚠️  Contract listener failed to start:', err)
      }
    })

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n⏹️  Shutting down gracefully...')
      server.close(async () => {
        await prisma.$disconnect()
        console.log('✅ Server closed and database disconnected')
        process.exit(0)
      })
    })
  } catch (error) {
    console.error('\n❌ === SERVER STARTUP FAILED ===')
    console.error('Error:', error instanceof Error ? error.message : String(error))
    console.error('Details:', error)
    console.error('=== STARTUP ERROR ===\n')

    await prisma.$disconnect()
    process.exit(1)
  }
}

startServer()

export default app
