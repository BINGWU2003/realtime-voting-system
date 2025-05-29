import { NextRequest } from 'next/server'
import { addClient, removeClient, sendCurrentPollData } from '@/lib/sse'

export async function GET(request: NextRequest) {
  // 创建SSE响应
  const stream = new ReadableStream({
    start(controller) {
      // 添加到客户端列表
      addClient(controller)

      // 发送初始数据
      sendCurrentPollData(controller)

      // 定期发送保活消息
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(': keepalive\n\n')
        } catch {
          clearInterval(keepAlive)
          removeClient(controller)
        }
      }, 30000)

      // 清理函数
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive)
        removeClient(controller)
        try {
          controller.close()
        } catch {
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