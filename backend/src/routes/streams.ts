import { Router } from 'express'
import {
  getEmployeeStreams,
  getCompanyStreams,
  getStreamDetails,
  createStream,
  updateStreamStatus,
} from '../controllers/streamsController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/employee/:walletAddress', getEmployeeStreams)
router.get('/company/:walletAddress', getCompanyStreams)
router.get('/:streamId', getStreamDetails)
router.post('/', authenticateToken, createStream)
router.patch('/:streamId', authenticateToken, updateStreamStatus)

export default router
