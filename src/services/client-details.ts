import pb from '@/lib/pocketbase/client'
import { Client, Goal, ImprovementPoint, Meeting, RoadmapItem, Transcript } from '@/types'

export const getClientDetails = async (clientId: string) => {
  const [client, meetings, transcripts, goals, improvementPoints, roadmapItems] = await Promise.all(
    [
      pb.collection<Client>('clients').getOne(clientId, { expand: 'estagio_id' }),
      pb
        .collection<Meeting>('meetings')
        .getFullList({ filter: `client_id = '${clientId}'`, sort: '-data,-created' }),
      pb.collection<Transcript>('transcripts').getFullList({ filter: `client_id = '${clientId}'` }),
      pb
        .collection<Goal>('goals')
        .getFullList({ filter: `client_id = '${clientId}'`, sort: '-created' }),
      pb
        .collection<ImprovementPoint>('improvement_points')
        .getFullList({ filter: `client_id = '${clientId}'`, sort: '-created' }),
      pb
        .collection<RoadmapItem>('roadmap_items')
        .getFullList({ filter: `client_id = '${clientId}'`, sort: 'ordem' }),
    ],
  )
  return { client, meetings, transcripts, goals, improvementPoints, roadmapItems }
}

export const getClientSummary = async (clientId: string) => {
  return pb.send(`/backend/v1/clients/${clientId}/summary`, { method: 'GET' })
}

export const updateClientNotes = async (clientId: string, notas_gerais: string) => {
  return pb.collection('clients').update(clientId, { notas_gerais })
}
