import { Download, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import schema from '@/lib/pocketbase/schema.json'

export default function SchemaPage() {
  const handleDownload = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(schema, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute('href', dataStr)
    downloadAnchorNode.setAttribute('download', 'schema.json')
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-xl hidden sm:block">
            <Database className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Database Schema
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Visualização e exportação da estrutura de dados
            </p>
          </div>
        </div>
        <Button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 h-9 sm:h-10 px-3 sm:px-4"
        >
          <Download className="h-4 w-4" />
          <span className="font-medium hidden sm:inline">Download JSON</span>
          <span className="font-medium sm:hidden">Baixar</span>
        </Button>
      </div>

      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="h-full rounded-xl border border-slate-800 bg-[#0d1117] overflow-hidden shadow-sm">
          <ScrollArea className="h-full w-full rounded-xl">
            <div className="p-4 sm:p-6 min-w-max">
              <pre className="text-xs sm:text-[13px] leading-relaxed text-slate-300 font-mono">
                {JSON.stringify(schema, null, 2)}
              </pre>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
