import { Router } from 'express'
import {
  getEmployeeMilestones,
  getPendingMilestones,
  getMilestoneDetails,
  createMilestone,
  approveMilestone,
  rejectMilestone,
} from '../controllers/milestonesController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/employee/:walletAddress', getEmployeeMilestones)
router.get('/pending', getPendingMilestones)
router.get('/:milestoneId', getMilestoneDetails)
router.post('/', authenticateToken, createMilestone)
router.patch('/:milestoneId/approve', authenticateToken, approveMilestone)
router.patch('/:milestoneId/reject', authenticateToken, rejectMilestone)

export default router
