import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { broadcastPollUpdate } from '@/lib/sse'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { optionId } = body

    if (!optionId) {
      return NextResponse.json({ error: '缺少选项ID' }, { status: 400 })
    }

    // 获取客户端IP地址
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const voterIp = forwarded?.split(',')[0] || realIp || request.ip || '127.0.0.1'

    // 检查选项是否存在
    const option = await prisma.option.findUnique({
      where: { id: optionId },
      include: { poll: true }
    })

    if (!option) {
      return NextResponse.json({ error: '选项不存在' }, { status: 404 })
    }

    // 检查用户是否已经投票
    const existingVote = await prisma.vote.findUnique({
      where: {
        pollId_voterIp: {
          pollId: option.pollId,
          voterIp: voterIp
        }
      }
    })

    if (existingVote) {
      return NextResponse.json({
        success: false,
        error: '您已经投过票了'
      }, { status: 400 })
    }

    // 创建投票记录
    await prisma.vote.create({
      data: {
        pollId: option.pollId,
        optionId: optionId,
        voterIp: voterIp
      }
    })

    // 通过SSE广播更新后的投票数据
    await broadcastPollUpdate()

    return NextResponse.json({
      success: true,
      message: '投票成功！'
    })

  } catch (error) {
    console.error('投票失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
} 