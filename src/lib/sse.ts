import { prisma } from './db'

// 存储所有SSE连接
const clients = new Set<ReadableStreamDefaultController>()

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller)
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller)
}

export function getClientsCount() {
  return clients.size
}

export async function sendCurrentPollData(controller: ReadableStreamDefaultController) {
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
      } catch {
        // 客户端连接已断开，从列表中移除
        clients.delete(controller)
      }
    })
  } catch (error) {
    console.error('广播投票数据失败:', error)
  }
} 