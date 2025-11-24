import { Router } from 'express'
import {
  getEmployeeEscrows,
  getPendingEscrows,
  getEscrowDetails,
} from '../controllers/escrowsController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/employee/:walletAddress', getEmployeeEscrows)
router.get('/pending', authenticateToken, getPendingEscrows) // Added auth
router.get('/:escrowId', getEscrowDetails)

export default router