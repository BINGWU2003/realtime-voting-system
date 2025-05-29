import VotingPoll from '@/components/VotingPoll'
import { Toaster } from '@/components/ui/toaster'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            实时投票系统
          </h1>
          <p className="text-gray-600">
            参与投票，查看实时结果
          </p>
        </div>

        <VotingPoll />
        <Toaster />
      </div>
    </main>
  )
}
