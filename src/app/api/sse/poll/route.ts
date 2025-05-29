import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

// 存储所有SSE连接
const clients = new Set<ReadableStreamDefaultController>()

export async function GET(request: NextRequest) {
  // 创建SSE响应
  const stream = new ReadableStream({
    start(controller) {
      // 添加到客户端列表
      clients.add(controller)

      // 发送初始数据
      sendCurrentPollData(controller)

      // 定期发送保活消息
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(': keepalive\n\n')
        } catch (error) {
          clearInterval(keepAlive)
          clients.delete(controller)
        }
      }, 30000)

      // 清理函数
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive)
        clients.delete(controller)
        try {
          controller.close()
        } catch (error) {
          // 连接已关闭
        }
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

async function sendCurrentPollData(controller: ReadableStreamDefaultController) {
  try {
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

    if (!poll) return

    const pollData = {
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

    const message = `data: ${JSON.stringify(pollData)}\n\n`
    controller.enqueue(message)
  } catch (error) {
    console.error('发送投票数据失败:', error)
  }
}

// 广播更新给所有连接的客户端
export async function broadcastPollUpdate() {
  try {
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

    if (!poll) return

    const pollData = {
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

    const message = `data: ${JSON.stringify(pollData)}\n\n`

    // 向所有客户端发送更新
    clients.forEach(controller => {
      try {
        controller.enqueue(message)
      } catch (error) {
        // 客户端连接已断开，从列表中移除
        clients.delete(controller)
      }
    })
  } catch (error) {
    console.error('广播投票数据失败:', error)
  }
}

// 导出客户端数量获取函数
export function getClientsCount() {
  return clients.size
} 