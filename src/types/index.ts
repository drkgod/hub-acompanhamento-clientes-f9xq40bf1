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
}

export interface PipelineStage {
  id: string
  nome: string
  ordem: number
  cor?: string
}
