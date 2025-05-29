'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Option {
  id: string
  text: string
  votes: number
}

interface PollData {
  id: string
  title: string
  description?: string
  options: Option[]
  totalVotes: number
}

export default function VotingPoll() {
  const [pollData, setPollData] = useState<PollData | null>(null)
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [hasVoted, setHasVoted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const eventSourceRef = useRef<EventSource | null>(null)
  const { toast } = useToast()

  // 获取初始投票数据并设置SSE连接
  useEffect(() => {
    fetchPollData()
    setupSSE()
    checkVotingStatus()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const fetchPollData = async () => {
    try {
      const response = await fetch('/api/poll')
      const data = await response.json()
      if (response.ok) {
        setPollData(data)
      } else {
        toast({
          title: '错误',
          description: data.error || '获取投票数据失败',
          variant: 'destructive'
        })
      }
    } catch {
      toast({
        title: '错误',
        description: '网络错误',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const setupSSE = () => {
    try {
      // 创建SSE连接
      const eventSource = new EventSource('/api/sse/poll')

      eventSource.onopen = () => {
        console.log('SSE连接已建立')
        setConnectionStatus('connected')
      }

      eventSource.onmessage = (event) => {
        try {
          const pollData = JSON.parse(event.data)
          setPollData(pollData)
        } catch (error) {
          console.error('解析SSE消息失败:', error)
        }
      }

      eventSource.onerror = () => {
        console.error('SSE连接错误')
        setConnectionStatus('disconnected')

        // 如果连接断开，尝试重连
        if (eventSource.readyState === EventSource.CLOSED) {
          setTimeout(() => {
            if (document.visibilityState === 'visible') {
              setupSSE()
            }
          }, 3000)
        }
      }

      eventSourceRef.current = eventSource
    } catch {
      console.error('创建SSE连接失败')
      setConnectionStatus('disconnected')
      // 降级到轮询
      setTimeout(fetchPollData, 5000)
    }
  }

  const checkVotingStatus = () => {
    const voted = localStorage.getItem('hasVoted')
    if (voted === 'true') {
      setHasVoted(true)
    }
  }

  const handleVote = async () => {
    if (!selectedOption) {
      toast({
        title: '请选择一个选项',
        description: '您需要选择一个选项才能投票',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/poll/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optionId: selectedOption }),
      })

      const data = await response.json()

      if (data.success) {
        setHasVoted(true)
        localStorage.setItem('hasVoted', 'true')
        toast({
          title: '投票成功！',
          description: data.message,
        })
      } else {
        toast({
          title: '投票失败',
          description: data.error,
          variant: 'destructive'
        })
      }
    } catch {
      toast({
        title: '投票失败',
        description: '网络错误，请重试',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">加载中...</div>
        </CardContent>
      </Card>
    )
  }

  if (!pollData) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">没有找到投票数据</div>
        </CardContent>
      </Card>
    )
  }

  const getPercentage = (votes: number) => {
    return pollData.totalVotes > 0 ? (votes / pollData.totalVotes) * 100 : 0
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          {pollData.title}
        </CardTitle>
        {pollData.description && (
          <CardDescription className="text-center">
            {pollData.description}
          </CardDescription>
        )}
        <div className="text-center text-sm text-gray-500">
          总投票数: {pollData.totalVotes}
          <span className={`ml-2 ${connectionStatus === 'connected' ? 'text-green-500' :
              connectionStatus === 'connecting' ? 'text-yellow-500' : 'text-red-500'
            }`}>
            {connectionStatus === 'connected' ? '● 实时连接' :
              connectionStatus === 'connecting' ? '● 连接中' : '● 连接断开'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasVoted ? (
          // 投票界面
          <div className="space-y-4">
            <div className="space-y-3">
              {pollData.options.map((option) => (
                <div key={option.id} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id={option.id}
                    name="pollOption"
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label
                    htmlFor={option.id}
                    className="flex-1 text-sm font-medium cursor-pointer"
                  >
                    {option.text}
                  </label>
                </div>
              ))}
            </div>

            <Button
              onClick={handleVote}
              disabled={!selectedOption || submitting}
              className="w-full"
            >
              {submitting ? '提交中...' : '提交投票'}
            </Button>
          </div>
        ) : (
          // 结果展示界面
          <div className="space-y-4">
            <div className="text-center text-green-600 font-medium">
              ✅ 您已投票，以下是实时投票结果
            </div>

            <div className="space-y-3">
              {pollData.options.map((option) => {
                const percentage = getPercentage(option.votes)
                return (
                  <div key={option.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{option.text}</span>
                      <span className="text-sm text-gray-500">
                        {option.votes} 票 ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 