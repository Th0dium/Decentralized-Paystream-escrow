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

export const getEmployeePayments = async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req.params

    const payments = await getPrisma().payment.findMany({
      where: {
        employee: walletAddress.toLowerCase(),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      data: payments,
    })
  } catch (error) {
    console.error('Error fetching employee payments:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch payments' })
  }
}

export const getCompanyPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req.params

    const payments = await getPrisma().payment.findMany({
      where: {
        company: walletAddress.toLowerCase(),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      data: payments,
    })
  } catch (error) {
    console.error('Error fetching company payments:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch payments' })
  }
}

export const getPaymentDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params

    const payment = await getPrisma().payment.findUnique({
      where: { paymentId: parseInt(paymentId) },
      include: {
        escrows: true,
      },
    })

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      })
    }

    res.json({
      success: true,
      data: payment,
    })
  } catch (error) {
    console.error('Error fetching payment details:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch payment' })
  }
}