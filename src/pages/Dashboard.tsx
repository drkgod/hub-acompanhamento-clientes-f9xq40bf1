import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { PortfolioHealth } from '@/components/dashboard/PortfolioHealth'
import { PipelineChart } from '@/components/dashboard/PipelineChart'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { AttentionTable } from '@/components/dashboard/AttentionTable'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3 } from 'lucide-react'

export default function Dashboard() {
  const [isEmpty, setIsEmpty] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    pb.collection('clients')
      .getList(1, 1)
      .then((res) => {
        if (res.totalItems === 0) setIsEmpty(true)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false) // Component errors will handle this
      })
  }, [])

  if (loading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[104px] w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Skeleton className="h-[350px] w-full rounded-xl" />
          <Skeleton className="h-[350px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-blue-50 p-6 rounded-full mb-6">
          <BarChart3 className="h-16 w-16 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-slate-800">Seu dashboard está vazio</h2>
        <p className="text-slate-500 mb-8 max-w-md text-lg">
          Conforme você usar o Hub, suas métricas aparecerão aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 overflow-y-auto h-full animate-in fade-in duration-500 pb-24">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
      <SummaryCards />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PortfolioHealth />
        <PipelineChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttentionTable />
        </div>
        <div>
          <ActivityFeed />
        </div>
      </div>
    </div>
  )
}
