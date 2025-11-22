import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export const getEmployeeStreams = async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req.params

    const streams = await prisma.stream.findMany({
      where: {
        employee: walletAddress.toLowerCase(),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      data: streams,
    })
  } catch (error) {
    console.error('Error fetching employee streams:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch streams' })
  }
}

export const getCompanyStreams = async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req.params

    const streams = await prisma.stream.findMany({
      where: {
        company: walletAddress.toLowerCase(),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      data: streams,
    })
  } catch (error) {
    console.error('Error fetching company streams:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch streams' })
  }
}

export const getStreamDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { streamId } = req.params

    const stream = await prisma.stream.findUnique({
      where: { streamId: parseInt(streamId) },
      include: {
        milestones: true,
      },
    })

    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      })
    }

    res.json({
      success: true,
      data: stream,
    })
  } catch (error) {
    console.error('Error fetching stream details:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch stream' })
  }
}

export const createStream = async (req: AuthRequest, res: Response) => {
  try {
    const {
      streamId,
      company,
      employee,
      token,
      totalAmount,
      startTime,
      stopTime,
      escrowBps,
    } = req.body

    // Validate required fields
    if (!streamId || !company || !employee || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      })
    }

    const stream = await prisma.stream.create({
      data: {
        streamId,
        company: company.toLowerCase(),
        employee: employee.toLowerCase(),
        token: token.toLowerCase(),
        totalAmount,
        startTime: BigInt(startTime),
        stopTime: BigInt(stopTime),
        escrowBps,
        status: 'ACTIVE',
      },
    })

    res.status(201).json({
      success: true,
      data: stream,
    })
  } catch (error) {
    console.error('Error creating stream:', error)
    res.status(500).json({ success: false, error: 'Failed to create stream' })
  }
}

export const updateStreamStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { streamId } = req.params
    const { status, paused } = req.body

    const updateData: any = {}
    if (status) updateData.status = status
    if (paused !== undefined) updateData.paused = paused

    const stream = await prisma.stream.update({
      where: { streamId: parseInt(streamId) },
      data: updateData,
    })

    res.json({
      success: true,
      data: stream,
    })
  } catch (error) {
    console.error('Error updating stream:', error)
    res.status(500).json({ success: false, error: 'Failed to update stream' })
  }
}
