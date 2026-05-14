import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

const chartConfig = {
  verde: { label: 'Verde', color: '#22c55e' },
  amarelo: { label: 'Amarelo', color: '#eab308' },
  vermelho: { label: 'Vermelho', color: '#ef4444' },
  critico: { label: 'Crítico', color: '#7f1d1d' },
}

export function PortfolioHealth() {
  const [data, setData] = useState<{ name: string; value: number; fill: string }[] | null>(null)
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      setError(false)
      const clients = await pb.collection('clients').getFullList()
      const counts = { verde: 0, amarelo: 0, vermelho: 0, critico: 0 }
      clients.forEach((c) => {
        if (
          c.status_inatividade &&
          counts[c.status_inatividade as keyof typeof counts] !== undefined
        ) {
          counts[c.status_inatividade as keyof typeof counts]++
        }
      })
      setData(
        [
          { name: 'Verde', value: counts.verde, fill: chartConfig.verde.color },
          { name: 'Amarelo', value: counts.amarelo, fill: chartConfig.amarelo.color },
          { name: 'Vermelho', value: counts.vermelho, fill: chartConfig.vermelho.color },
          { name: 'Crítico', value: counts.critico, fill: chartConfig.critico.color },
        ].filter((d) => d.value > 0),
      )
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg text-slate-800">Saúde da Carteira</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-red-500">
            <p className="mb-4">Erro ao carregar dados.</p>
            <Button onClick={load} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        ) : !data ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-slate-500">
            Sem dados suficientes.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
