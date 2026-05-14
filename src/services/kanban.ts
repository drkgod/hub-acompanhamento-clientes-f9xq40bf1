import pb from '@/lib/pocketbase/client'
import { Client, PipelineStage } from '@/types'

export const getStages = () =>
  pb.collection('pipeline_stages').getFullList<PipelineStage>({ sort: 'ordem' })
export const getClients = () => pb.collection('clients').getFullList<Client>()
export const updateClientStage = (id: string, estagio_id: string) =>
  pb.collection('clients').update<Client>(id, { estagio_id })
