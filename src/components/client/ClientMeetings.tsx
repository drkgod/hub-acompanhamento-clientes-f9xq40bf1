import { Meeting, Transcript, Goal, ImprovementPoint } from '@/types'
import { Calendar as CalIcon, MessageSquare, Target, TrendingUp } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function ClientMeetings({
  meetings,
  transcripts,
  goals,
  improvements,
}: {
  meetings: Meeting[]
  transcripts: Transcript[]
  goals: Goal[]
  improvements: ImprovementPoint[]
}) {
  if (meetings.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-sm font-medium bg-slate-50/50 rounded-lg border border-dashed mt-2">
        Nenhuma reunião registrada no histórico.
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible className="w-full mt-2 space-y-3">
      {meetings.map((m) => {
        const transcript = transcripts.find((t) => t.meeting_id === m.id)
        const meetingGoals = goals.filter((g) => g.meeting_id === m.id)
        const meetingImprovements = improvements.filter((p) => p.meeting_id === m.id)

        return (
          <AccordionItem
            value={m.id}
            key={m.id}
            className="bg-white border border-slate-200/60 rounded-xl px-2 shadow-sm border-b-0 overflow-hidden"
          >
            <AccordionTrigger className="hover:no-underline py-4 px-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-4 text-left gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                    <CalIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800 leading-tight">
                      {m.titulo}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {m.data ? new Date(m.data).toLocaleDateString('pt-BR') : 'Data não informada'}{' '}
                      • {m.plataforma}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs ml-12 sm:ml-0">
                  {transcript?.sentimento && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'px-2 py-0 font-medium tracking-wide uppercase text-[10px]',
                        transcript.sentimento === 'positivo'
                          ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                          : transcript.sentimento === 'negativo'
                            ? 'text-rose-700 border-rose-200 bg-rose-50'
                            : 'text-slate-600 bg-slate-50',
                      )}
                    >
                      {transcript.sentimento}
                    </Badge>
                  )}
                  {m.duracao_minutos && (
                    <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                      {m.duracao_minutos} min
                    </span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-5 pt-1 space-y-5">
              {transcript?.resumo && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                    <MessageSquare className="h-4 w-4 text-blue-500" /> Resumo e Decisões
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {transcript.resumo}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {meetingGoals.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                      <Target className="h-4 w-4 text-indigo-500" /> Metas Adicionadas
                    </div>
                    <ul className="text-sm text-slate-600 space-y-2">
                      {meetingGoals.map((g) => (
                        <li
                          key={g.id}
                          className="bg-white border rounded-lg p-2 shadow-sm flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                          <span className="truncate" title={g.descricao}>
                            {g.descricao}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {meetingImprovements.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                      <TrendingUp className="h-4 w-4 text-rose-500" /> Pontos de Melhoria
                      Identificados
                    </div>
                    <ul className="text-sm text-slate-600 space-y-2">
                      {meetingImprovements.map((p) => (
                        <li
                          key={p.id}
                          className="bg-white border rounded-lg p-2 shadow-sm flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                          <span className="truncate" title={p.descricao}>
                            {p.descricao}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {!transcript && meetingGoals.length === 0 && meetingImprovements.length === 0 && (
                <div className="p-4 text-center bg-slate-50 rounded-lg border border-dashed">
                  <p className="text-slate-500 text-sm font-medium">
                    Sem anotações detalhadas ou ações atreladas para esta reunião.
                  </p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
