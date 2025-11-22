import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { generateToken } from '../middleware/auth'
import { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export const verifyWallet = async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req.body

    // Validate wallet address
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address',
      })
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { wallet: walletAddress.toLowerCase() },
    })

    const isNewUser = !user

    if (!user) {
      user = await prisma.user.create({
        data: {
          wallet: walletAddress.toLowerCase(),
          role: null,
        },
      })
    }

    // Generate JWT token
    const token = generateToken(user.wallet)

    res.json({
      success: true,
      data: {
        walletAddress: user.wallet,
        role: user.role,
        isNewUser,
        token,
      },
    })
  } catch (error) {
    console.error('Error verifying wallet:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to verify wallet',
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
