export interface Client {
  id: string
  name: string
  company: string
  lastContact: string
  stageId: string
}

export interface Stage {
  id: string
  title: string
  order: number
}
