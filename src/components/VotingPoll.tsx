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
      <div className="w-full max-w-4xl mx-auto">
        <div className="glass rounded-3xl p-8 shadow-2xl animate-pulse">
          <div className="space-y-6">
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-shimmer"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-shimmer"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl animate-shimmer"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!pollData) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card className="glass rounded-3xl shadow-2xl border-0">
          <CardContent className="p-8">
            <div className="text-center text-gray-500">没有找到投票数据</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getPercentage = (votes: number) => {
    return pollData.totalVotes > 0 ? (votes / pollData.totalVotes) * 100 : 0
  }

  const maxVotes = Math.max(...pollData.options.map(option => option.votes), 1)

  return (
    <div className="w-full max-w-4xl mx-auto animate-fadeInUp">
      <Card className="glass rounded-3xl shadow-2xl border-0 overflow-hidden">
        <CardHeader className="text-center p-8 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
          <CardTitle className="text-3xl md:text-4xl font-bold gradient-text mb-4">
            {pollData.title}
          </CardTitle>
          {pollData.description && (
            <CardDescription className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              {pollData.description}
            </CardDescription>
          )}

          {/* 统计信息 */}
          <div className="flex items-center justify-center space-x-8 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-300">总投票数: {pollData.totalVotes}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                }`}></div>
              <span className="text-gray-600 dark:text-gray-300">
                {connectionStatus === 'connected' ? '实时连接' :
                  connectionStatus === 'connecting' ? '连接中' : '连接断开'}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          {!hasVoted ? (
        // 投票界面
            <div className="space-y-6">
              <div className="grid gap-4">
                {pollData.options.map((option, index) => (
                  <div
                    key={option.id}
                    className={`vote-option relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${selectedOption === option.id
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 neon-glow'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white/50 dark:bg-gray-800/50'
                      }`}
                    onClick={() => setSelectedOption(option.id)}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedOption === option.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                        }`}>
                        {selectedOption === option.id && (
                          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                        )}
                      </div>
                      <span className="text-lg font-medium text-gray-800 dark:text-gray-200">
                        {option.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleVote}
                disabled={!selectedOption || submitting}
                className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg neon-glow"
              >
                {submitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>提交中...</span>
                  </div>
                ) : (
                  '🗳️ 提交投票'
                )}
              </Button>
            </div>
          ) : (
            // 结果展示界面
              <div className="space-y-8">
                <div className="text-center">
                  <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full text-green-700 dark:text-green-300 font-medium text-lg">
                    ✅ 投票成功！以下是实时投票结果
                  </div>
                </div>

                <div className="grid gap-6">
                  {pollData.options.map((option, index) => {
                    const percentage = getPercentage(option.votes)
                    const isWinning = option.votes === maxVotes && option.votes > 0

                    return (
                    <div
                      key={option.id}
                      className="p-6 rounded-2xl bg-gradient-to-r from-white/70 to-gray-50/70 dark:from-gray-800/70 dark:to-gray-900/70 border border-gray-200/50 dark:border-gray-700/50 animate-fadeInUp"
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                          {isWinning && (
                            <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">👑</span>
                            </div>
                          )}
                          <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            {option.text}
                          </span>
                        </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold gradient-text">
                              {option.votes}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        <div className="relative">
                          <Progress
                            value={percentage}
                            className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                          />
                          {isWinning && (
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 实时更新指示器 */}
                <div className="text-center pt-4">
                  <div className="inline-flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>数据实时更新中</span>
                  </div>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 