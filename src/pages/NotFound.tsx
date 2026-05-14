import { useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: Usuário tentou acessar rota inexistente:', location.pathname)
  }, [location.pathname])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full animate-in zoom-in-95 duration-300">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-slate-100 rounded-full">
            <FileQuestion className="h-12 w-12 text-slate-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-2">404</h1>
        <p className="text-lg text-slate-600 mb-8">
          Oops! A página que você procura não foi encontrada.
        </p>
        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
          <Link to="/">Voltar para o Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

export default NotFound
