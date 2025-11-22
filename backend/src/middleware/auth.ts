import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/env'

export interface AuthRequest extends Request {
  user?: {
    walletAddress: string
  }
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { walletAddress: string }
    req.user = { walletAddress: decoded.walletAddress }
    next()
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid token' })
  }
}

export const generateToken = (walletAddress: string): string => {
  return jwt.sign({ walletAddress }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  })
}
