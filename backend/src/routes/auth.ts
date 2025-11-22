import { Router } from 'express'
import { verifyWallet, getProfile, logout } from '../controllers/authController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.post('/verify-wallet', verifyWallet)
router.get('/profile', authenticateToken, getProfile)
router.post('/logout', authenticateToken, logout)

export default router
