import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function PipelineChart() {
  const [data, setData] = useState<{ stage: string; count: number; fill: string }[] | null>(null)
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      setError(false)
      const [stages, clients] = await Promise.all([
        pb.collection('pipeline_stages').getFullList({ sort: 'ordem' }),
        pb.collection('clients').getFullList(),
      ])
      const counts: Record<string, number> = {}
      clients.forEach((c) => {
        counts[c.estagio_id] = (counts[c.estagio_id] || 0) + 1
      })

      setData(
        stages.map((s) => ({
          stage: s.nome,
          count: counts[s.id] || 0,
          fill: s.cor || '#3b82f6',
        })),
      )
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const chartConfig = { count: { label: 'Clientes', color: '#3b82f6' } }

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg text-slate-800">Pipeline Resumido</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-red-500">
            <p className="mb-4">Erro ao carregar pipeline.</p>
            <Button onClick={load} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        ) : !data ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="stage"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={120}
                  tick={{ fill: '#64748b', fontSize: 13 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
