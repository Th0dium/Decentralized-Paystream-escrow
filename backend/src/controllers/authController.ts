import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { generateToken } from '../middleware/auth'
import { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export const verifyWallet = async (req: AuthRequest, res: Response) => {
  console.log('\n🔑 === VERIFY WALLET REQUEST ===')
  console.log('📨 Request received at /auth/verify-wallet')
  console.log('📦 Request body:', req.body)

  try {
    const { walletAddress } = req.body
    console.log(`🎯 Wallet address from request: ${walletAddress}`)

    // Validate wallet address
    if (!walletAddress) {
      console.log('❌ Wallet address is missing')
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      })
    }

    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.log(`❌ Invalid wallet address format: ${walletAddress}`)
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address',
      })
    }

    console.log('✅ Wallet address format valid')
    const normalizedAddress = walletAddress.toLowerCase()
    console.log(`🔄 Normalized address: ${normalizedAddress}`)

    // Find or create user
    console.log('🔍 Querying database for existing user...')
    let user = await prisma.user.findUnique({
      where: { wallet: normalizedAddress },
    })

    const isNewUser = !user
    console.log(`👤 User found in database: ${!isNewUser ? 'YES' : 'NO (new user)'}`)

    if (!user) {
      console.log('➕ Creating new user...')
      user = await prisma.user.create({
        data: {
          wallet: normalizedAddress,
          role: null,
        },
      })
      console.log(`✅ User created with ID: ${user.id}`)
    }

    // Generate JWT token
    console.log('🔐 Generating JWT token...')
    const token = generateToken(user.wallet)
    console.log('✅ Token generated')

    console.log('📤 Sending response...')
    res.json({
      success: true,
      data: {
        walletAddress: user.wallet,
        role: user.role,
        isNewUser,
        token,
      },
    })
    console.log('✅ Response sent successfully')
    console.log('=== END VERIFY WALLET ===\n')
  } catch (error) {
    console.error('\n❌ === ERROR IN VERIFY WALLET ===')
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Full error:', error)
    console.error('=== END ERROR ===\n')

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify wallet',
    })
  }
}

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    const user = await prisma.user.findUnique({
      where: { wallet: req.user.walletAddress },
    })

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    res.json({
      success: true,
      data: {
        walletAddress: user.wallet,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error('Error getting profile:', error)
    res.status(500).json({ success: false, error: 'Failed to get profile' })
  }
}

export const logout = (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  })
}
