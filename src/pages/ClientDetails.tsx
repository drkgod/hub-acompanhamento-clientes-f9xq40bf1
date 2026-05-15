import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClientDetails } from '@/services/client-details'
import { Client, Goal, ImprovementPoint, Meeting, RoadmapItem, Transcript } from '@/types'
import { ClientHeader } from '@/components/client/ClientHeader'
import { ClientSummary } from '@/components/client/ClientSummary'
import { ClientNotes } from '@/components/client/ClientNotes'
import { ClientGoals } from '@/components/client/ClientGoals'
import { ClientImprovementPoints } from '@/components/client/ClientImprovementPoints'
import { ClientRoadmap } from '@/components/client/ClientRoadmap'
import { ClientMeetings } from '@/components/client/ClientMeetings'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Target, TrendingUp, Map as MapIcon, CalendarDays, RefreshCcw } from 'lucide-react'
import { ClientFollowUp } from '@/components/client/ClientFollowUp'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function ClientDetailsPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [data, setData] = useState<{
    client: Client | null
    meetings: Meeting[]
    transcripts: Transcript[]
    goals: Goal[]
    improvementPoints: ImprovementPoint[]
    roadmapItems: RoadmapItem[]
  }>({
    client: null,
    meetings: [],
    transcripts: [],
    goals: [],
    improvementPoints: [],
    roadmapItems: [],
  })

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    setError(false)
    try {
      const res = await getClientDetails(id)
      setData(res)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="h-full w-full overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300/80 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6">
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-[300px] w-full rounded-xl" />
              <Skeleton className="h-[200px] w-full rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data.client) {
    return (
      <div className="h-full w-full overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300/80 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="container mx-auto max-w-2xl py-20 px-4 text-center space-y-6">
          <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Erro ao carregar cliente</h2>
            <p className="text-slate-600 mb-6">
              Não foi possível carregar as informações do cliente. Verifique sua conexão e tente
              novamente.
            </p>
            <Button onClick={loadData} size="lg">
              <RefreshCcw className="h-4 w-4 mr-2" /> Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300/80 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
      <div className="container mx-auto max-w-5xl px-4 animate-in fade-in duration-500">
        <div className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md pt-8 pb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          <ClientHeader client={data.client} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-8">
              <ClientSummary clientId={data.client.id} meetingCount={data.meetings.length} />
              <div className="border-t border-slate-100 pt-6">
                <ClientNotes clientId={data.client.id} initialNotes={data.client.notas_gerais} />
              </div>
              <div className="border-t border-slate-100 pt-6">
                <ClientFollowUp clientId={data.client.id} />
              </div>
            </div>

            <Accordion
              type="multiple"
              defaultValue={['goals', 'improvements', 'meetings']}
              className="space-y-4"
            >
              <AccordionItem
                value="goals"
                className="bg-white border rounded-2xl shadow-sm px-2 border-b-0 overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-5 hover:no-underline font-bold text-slate-800 text-lg">
                  <div className="flex items-center gap-3">
                    <Target className="h-6 w-6 text-indigo-500 bg-indigo-50 p-1 rounded-md" /> Metas
                    de Crescimento
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5">
                  <ClientGoals goals={data.goals} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="improvements"
                className="bg-white border rounded-2xl shadow-sm px-2 border-b-0 overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-5 hover:no-underline font-bold text-slate-800 text-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-rose-500 bg-rose-50 p-1 rounded-md" />{' '}
                    Pontos de Melhoria
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5">
                  <ClientImprovementPoints points={data.improvementPoints} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="meetings"
                className="bg-white border rounded-2xl shadow-sm px-2 border-b-0 overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-5 hover:no-underline font-bold text-slate-800 text-lg">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-6 w-6 text-amber-500 bg-amber-50 p-1 rounded-md" />{' '}
                    Histórico de Reuniões
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5">
                  <ClientMeetings
                    meetings={data.meetings}
                    transcripts={data.transcripts}
                    goals={data.goals}
                    improvements={data.improvementPoints}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="space-y-6">
            <div className="bg-white border rounded-2xl p-6 shadow-sm sticky top-40">
              <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-3">
                <MapIcon className="h-6 w-6 text-emerald-500 bg-emerald-50 p-1 rounded-md" />{' '}
                Roadmap do Cliente
              </h3>
              <ClientRoadmap items={data.roadmapItems} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
