import express from 'express'
import cors from 'cors'
import { config } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { startContractListener } from './services/contractListener'
import authRoutes from './routes/auth'
import streamsRoutes from './routes/streams'
import milestonesRoutes from './routes/milestones'

const app = express()

// Middleware
app.use(cors({ origin: config.cors.origin }))
app.use(express.json())

// Routes
app.use('/auth', authRoutes)
app.use('/streams', streamsRoutes)
app.use('/milestones', milestonesRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling
app.use(errorHandler)

// Start server
const PORT = config.server.port

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Paystream Backend running on http://localhost:${PORT}`)
  console.log(`📝 Environment: ${config.server.nodeEnv}`)
  console.log(`🔐 JWT enabled for security`)

  // Start contract listener
  startContractListener()
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

export default app
