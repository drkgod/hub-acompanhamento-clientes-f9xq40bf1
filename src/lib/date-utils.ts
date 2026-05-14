import { differenceInDays, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function getInactivity(dateStr?: string) {
  if (!dateStr) {
    return {
      days: 0,
      color: 'bg-slate-300',
      text: 'Sem contato',
    }
  }

  const parsed = parseISO(dateStr.replace(' ', 'T'))
  const days = differenceInDays(new Date(), parsed)

  let color = 'bg-slate-700' // > 30 days
  if (days < 7) {
    color = 'bg-green-500'
  } else if (days <= 14) {
    color = 'bg-yellow-500'
  } else if (days <= 30) {
    color = 'bg-red-500'
  }

  return {
    days,
    color,
    text: formatDistanceToNow(parsed, { addSuffix: true, locale: ptBR }),
  }
}
