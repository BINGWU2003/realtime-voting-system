import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // 检查数据库连接
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: '数据库未配置' }, { status: 500 })
    }

    const poll = await prisma.poll.findFirst({
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }
            }
          }
        },
        _count: {
          select: { votes: true }
        }
      }
    })

    if (!poll) {
      return NextResponse.json({ error: '没有找到投票问卷' }, { status: 404 })
    }

    const formattedPoll = {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        votes: option._count.votes
      })),
      totalVotes: poll._count.votes
    }

    return NextResponse.json(formattedPoll)
  } catch (error) {
    console.error('获取投票数据失败:', error)

    // 在构建时返回默认数据
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      return NextResponse.json({
        id: 'default',
        title: '默认投票问卷',
        description: '数据库连接失败',
        options: [],
        totalVotes: 0
      })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
} 