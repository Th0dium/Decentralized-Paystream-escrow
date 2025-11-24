import { Router } from 'express'
import {
  getEmployeePayments,
  getCompanyPayments,
  getPaymentDetails,
} from '../controllers/paymentsController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/employee/:walletAddress', getEmployeePayments)
router.get('/company/:walletAddress', getCompanyPayments)
router.get('/:paymentId', getPaymentDetails)

export default router