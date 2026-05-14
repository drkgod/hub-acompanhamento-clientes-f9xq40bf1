import { createContext, useContext, useState, useEffect, ReactNode, createElement } from 'react'
import { formatISO, subDays } from 'date-fns'
import { Client, Stage } from '@/types'
import { toast } from '@/hooks/use-toast'

interface MainStoreState {
  clients: Client[]
  stages: Stage[]
  searchQuery: string
  isLoading: boolean
  isError: boolean
  setSearchQuery: (query: string) => void
  moveClient: (clientId: string, stageId: string) => void
}

const MainStoreContext = createContext<MainStoreState | undefined>(undefined)

const now = new Date()

const MOCK_STAGES: Stage[] = [
  { id: 'leads', title: 'Leads', order: 1 },
  { id: 'atendimento', title: 'Em Atendimento', order: 2 },
  { id: 'pos_reuniao', title: 'Pós Reunião', order: 3 },
  { id: 'acompanhamento', title: 'Acompanhamento', order: 4 },
  { id: 'encerrados', title: 'Encerrados', order: 5 },
]

const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'Ana Costa',
    company: 'TechNova',
    lastContact: formatISO(subDays(now, 2)),
    stageId: 'leads',
  },
  {
    id: 'c2',
    name: 'Carlos Santos',
    company: 'GigaLog',
    lastContact: formatISO(subDays(now, 10)),
    stageId: 'leads',
  },
  {
    id: 'c3',
    name: 'Beatriz Lima',
    company: 'InovaBR',
    lastContact: formatISO(subDays(now, 20)),
    stageId: 'atendimento',
  },
  {
    id: 'c4',
    name: 'Daniel Silva',
    company: 'SoftCorp',
    lastContact: formatISO(subDays(now, 45)),
    stageId: 'atendimento',
  },
  {
    id: 'c5',
    name: 'Eduarda Gomes',
    company: 'EcoAgro',
    lastContact: formatISO(subDays(now, 5)),
    stageId: 'pos_reuniao',
  },
  {
    id: 'c6',
    name: 'Fernando Alves',
    company: 'Construtech',
    lastContact: formatISO(subDays(now, 12)),
    stageId: 'acompanhamento',
  },
  {
    id: 'c7',
    name: 'Gabriela Dias',
    company: 'FinPay',
    lastContact: formatISO(subDays(now, 25)),
    stageId: 'acompanhamento',
  },
  {
    id: 'c8',
    name: 'Hugo Martins',
    company: 'LogiFast',
    lastContact: formatISO(subDays(now, 2)),
    stageId: 'encerrados',
  },
  {
    id: 'c9',
    name: 'Isabela Rocha',
    company: 'MedCare',
    lastContact: formatISO(subDays(now, 8)),
    stageId: 'leads',
  },
  {
    id: 'c10',
    name: 'João Ferreira',
    company: 'EduTech',
    lastContact: formatISO(subDays(now, 35)),
    stageId: 'pos_reuniao',
  },
  {
    id: 'c11',
    name: 'Larissa Mendes',
    company: 'VarejoPro',
    lastContact: formatISO(subDays(now, 4)),
    stageId: 'atendimento',
  },
  {
    id: 'c12',
    name: 'Marcelo Castro',
    company: 'AgilDev',
    lastContact: formatISO(subDays(now, 15)),
    stageId: 'encerrados',
  },
]

export function MainStoreProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS)
  const [stages] = useState<Stage[]>(MOCK_STAGES)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    // Simulate initial data loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const moveClient = (clientId: string, stageId: string) => {
    const client = clients.find((c) => c.id === clientId)
    const stage = stages.find((s) => s.id === stageId)

    if (client && stage && client.stageId !== stageId) {
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, stageId } : c)))
      toast({
        title: 'Cliente movido',
        description: `${client.name} movido para ${stage.title}`,
      })
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
