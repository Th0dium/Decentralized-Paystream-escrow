import { Router } from 'express'
import {
  getPaymentDetails,
} from '../controllers/paymentsController'

const router = Router()

// NOTE: Removed /employee/:walletAddress and /company/:walletAddress endpoints
// Frontend now queries blockchain directly via useMyPayments hook
// Keeps only getPaymentDetails for optional reference data

router.get('/:paymentId', getPaymentDetails)

export default router