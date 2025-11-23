import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'

let prisma: PrismaClient

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

export const getEmployeeMilestones = async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req.params

    const milestones = await getPrisma().milestone.findMany({
      where: {
        submitter: walletAddress.toLowerCase(),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      data: milestones,
    })
  } catch (error) {
    console.error('Error fetching employee milestones:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch milestones',
    })
  }
}

export const getPendingMilestones = async (req: AuthRequest, res: Response) => {
  try {
    const milestones = await getPrisma().milestone.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        stream: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      data: milestones,
    })
  } catch (error) {
    console.error('Error fetching pending milestones:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch milestones',
    })
  }
}

export const getMilestoneDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { milestoneId } = req.params

    const milestone = await getPrisma().milestone.findUnique({
      where: { milestoneId: parseInt(milestoneId) },
      include: {
        stream: true,
      },
    })

    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: 'Milestone not found',
      })
    }

    res.json({
      success: true,
      data: milestone,
    })
  } catch (error) {
    console.error('Error fetching milestone details:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch milestone' })
  }
}

export const createMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const { milestoneId, streamId, submitter, amount, ipfsHash } = req.body

    if (!milestoneId || !streamId || !submitter || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      })
    }

    const milestone = await getPrisma().milestone.create({
      data: {
        milestoneId,
        streamId,
        submitter: submitter.toLowerCase(),
        amount,
        ipfsHash: ipfsHash || null,
        status: 'PENDING',
      },
    })

    res.status(201).json({
      success: true,
      data: milestone,
    })
  } catch (error) {
    console.error('Error creating milestone:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create milestone',
    })
  }
}

export const approveMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const { milestoneId } = req.params

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    const milestone = await getPrisma().milestone.update({
      where: { milestoneId: parseInt(milestoneId) },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approver: req.user.walletAddress,
      },
    })

    res.json({
      success: true,
      data: milestone,
    })
  } catch (error) {
    console.error('Error approving milestone:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to approve milestone',
    })
  }
}

export const rejectMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const { milestoneId } = req.params

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    const milestone = await getPrisma().milestone.update({
      where: { milestoneId: parseInt(milestoneId) },
      data: {
        status: 'REJECTED',
        approvedAt: new Date(),
        approver: req.user.walletAddress,
      },
    })

    res.json({
      success: true,
      data: milestone,
    })
  } catch (error) {
    console.error('Error rejecting milestone:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to reject milestone',
    })
  }
}
