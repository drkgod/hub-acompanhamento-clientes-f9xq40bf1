import useMainStore from '@/stores/useMainStore'
import { Board } from '@/components/kanban/Board'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Index() {
  const { isLoading, isError } = useMainStore()
  const navigate = useNavigate()

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2 text-slate-800">
          Ocorreu um erro ao carregar os dados.
        </h2>
        <p className="text-slate-500 mb-6 max-w-md">
          Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-slate-800 hover:bg-slate-900 text-white"
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex p-6 gap-6 h-full overflow-hidden max-w-[1600px] mx-auto w-full">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="hidden md:flex w-[320px] shrink-0 bg-slate-100/80 rounded-xl p-4 flex-col h-[75vh]"
          >
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-5 w-24 bg-slate-200 rounded-md" />
              <Skeleton className="h-5 w-8 bg-slate-200 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-32 w-full bg-white rounded-lg shadow-sm" />
              ))}
            </div>
          </div>
        ))}
        {/* Mobile skeleton */}
        <div className="md:hidden flex-1 flex flex-col w-full h-full space-y-4">
          <Skeleton className="h-12 w-full bg-slate-200 rounded-lg" />
          <div className="flex-1 bg-slate-100/80 rounded-xl p-4 flex flex-col space-y-3">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-32 w-full bg-white rounded-lg shadow-sm" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Board />
      <Button
        onClick={() => navigate('/nova-reuniao')}
        className="fixed bottom-8 right-8 h-14 rounded-full px-6 shadow-xl shadow-indigo-200/50 bg-indigo-600 hover:bg-indigo-700 text-white z-50 flex items-center gap-2 group transition-all duration-300 hover:scale-105"
      >
        <Plus className="h-5 w-5" />
        <span className="font-medium text-base hidden sm:inline">Nova Reunião</span>
      </Button>
    </>
  )
}
