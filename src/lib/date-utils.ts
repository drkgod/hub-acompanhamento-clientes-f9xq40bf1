import { differenceInDays, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function getInactivity(dateStr: string) {
  const date = parseISO(dateStr)
  const days = differenceInDays(new Date(), date)

  let color = 'bg-slate-500' // > 30 days
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
    text: formatDistanceToNow(date, { addSuffix: true, locale: ptBR }),
  }
}
