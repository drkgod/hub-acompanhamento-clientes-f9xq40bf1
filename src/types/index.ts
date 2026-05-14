export interface Client {
  id: string
  nome: string
  empresa: string
  email?: string
  telefone?: string
  estagio_id: string
  ultimo_contato?: string
  status_inatividade?: string
  dias_sem_contato?: number
  notas_gerais?: string
  user_id: string
  expand?: {
    estagio_id: PipelineStage
  }
}

export interface PipelineStage {
  id: string
  nome: string
  ordem: number
  cor?: string
}

export interface Meeting {
  id: string
  client_id: string
  titulo: string
  data: string
  duracao_minutos: number
  plataforma: string
  status: string
  user_id: string
  created: string
}

export interface Transcript {
  id: string
  meeting_id: string
  client_id: string
  texto_original: string
  resumo: string
  sentimento: string
  user_id: string
  created: string
}

export interface Goal {
  id: string
  client_id: string
  meeting_id?: string
  descricao: string
  status: string
  prioridade: string
  prazo: string
  progresso: number
  user_id: string
  created: string
}

export interface ImprovementPoint {
  id: string
  client_id: string
  meeting_id?: string
  descricao: string
  categoria: string
  gravidade: string
  status: string
  user_id: string
  created: string
}

export interface RoadmapItem {
  id: string
  client_id: string
  descricao: string
  status: string
  ordem: number
  user_id: string
  created: string
}

export interface Notification {
  id: string
  client_id?: string
  tipo?: string
  titulo?: string
  mensagem?: string
  lida?: boolean
  user_id: string
  created: string
}
