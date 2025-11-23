import dotenv from 'dotenv'

dotenv.config()

console.log('\n🔧 === ENVIRONMENT CONFIGURATION ===')
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
console.log(`🔌 DATABASE_URL configured: ${!!process.env.DATABASE_URL}`)
if (process.env.DATABASE_URL) {
  // Show masked URL for security
  const urlParts = process.env.DATABASE_URL.split('@')
  console.log(`   URL pattern: postgresql://...@${urlParts[1] || 'INVALID'}`)
}
console.log(`🔐 JWT_SECRET configured: ${!!process.env.JWT_SECRET}`)
console.log(`🪫 CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'default (localhost:3000)'}`)
console.log('=== END CONFIGURATION ===\n')

export const config = {
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  blockchain: {
    rpcUrl: process.env.RPC_URL || '',
    contractAddress: process.env.CONTRACT_ADDRESS || '',
    privateKey: process.env.PRIVATE_KEY_FOR_LISTENER || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3001'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : ['http://localhost:3000'],
  },
  pinata: {
    apiKey: process.env.PINATA_API_KEY || '',
    apiSecret: process.env.PINATA_API_SECRET || '',
  },
}

// Validate required env vars
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET']
const missing = requiredEnvVars.filter(v => !process.env[v])
if (missing.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`)
} else {
  console.log('✅ All required environment variables configured')
}
