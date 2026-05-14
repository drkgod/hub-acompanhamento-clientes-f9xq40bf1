import pb from '@/lib/pocketbase/client'
import type { Notification } from '@/types'

export const generateDigest = async () => {
  return pb.send('/backend/v1/generate-digest', {
    method: 'POST',
  })
}

export const getLatestDigest = async () => {
  const result = await pb.collection('notifications').getList<Notification>(1, 1, {
    filter: 'tipo = "daily_digest"',
    sort: '-created',
  })
  return result.items[0] || null
}
