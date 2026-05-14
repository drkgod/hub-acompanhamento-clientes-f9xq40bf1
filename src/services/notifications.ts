import pb from '@/lib/pocketbase/client'
import type { Notification } from '@/types'

export const getNotifications = async () => {
  const result = await pb.collection('notifications').getList<Notification>(1, 100, {
    sort: '-created',
  })
  return result.items
}

export const markNotificationAsRead = (id: string) => {
  return pb.collection('notifications').update(id, { lida: true })
}
