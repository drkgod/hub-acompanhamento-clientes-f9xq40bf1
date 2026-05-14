import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  createElement,
  useCallback,
} from 'react'
import { Client, PipelineStage } from '@/types'
import { toast } from '@/hooks/use-toast'
import { getStages, getClients, updateClientStage } from '@/services/kanban'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'

interface MainStoreState {
  clients: Client[]
  stages: PipelineStage[]
  searchQuery: string
  isLoading: boolean
  isError: boolean
  setSearchQuery: (query: string) => void
  moveClient: (clientId: string, stageId: string) => void
}

const MainStoreContext = createContext<MainStoreState | undefined>(undefined)

export function MainStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [s, c] = await Promise.all([getStages(), getClients()])
      setStages(s)
      setClients(c)
      setIsError(false)
    } catch (e) {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('pipeline_stages', () => loadData(), !!user)
  useRealtime('clients', () => loadData(), !!user)

  const moveClient = async (clientId: string, stageId: string) => {
    const previousClients = [...clients]
    const client = clients.find((c) => c.id === clientId)
    const stage = stages.find((s) => s.id === stageId)

    if (client && stage && client.estagio_id !== stageId) {
      // Optimistic UI Update
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, estagio_id: stageId } : c)))

      try {
        await updateClientStage(clientId, stageId)
        toast({
          title: 'Cliente movido',
          description: `${client.nome} movido para ${stage.nome}`,
        })
      } catch (err) {
        setClients(previousClients)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível mover o cliente. Tente novamente.',
        })
      }
    }
  }

  const value = {
    clients,
    stages,
    searchQuery,
    isLoading,
    isError,
    setSearchQuery,
    moveClient,
  }

  return createElement(MainStoreContext.Provider, { value }, children)
}

export default function useMainStore() {
  const context = useContext(MainStoreContext)
  if (context === undefined) {
    throw new Error('useMainStore must be used within a MainStoreProvider')
  }
  return context
}
