import { useState } from 'react'
import { Download, Loader2, Play, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export function ImportTldvDialog() {
  const [open, setOpen] = useState(false)

  // Single import state
  const [email, setEmail] = useState('')
  const [loadingSingle, setLoadingSingle] = useState(false)

  // Bulk import state
  const [bulkEmail, setBulkEmail] = useState('Rodrigo@adapta.org')
  const [bulkLimit, setBulkLimit] = useState('25')
  const [loadingBulk, setLoadingBulk] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<string[]>([])
  const [bulkDone, setBulkDone] = useState(false)

  const { toast } = useToast()

  const handleSingleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoadingSingle(true)
    try {
      await pb.send('/backend/v1/import-tldv', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
      })
      toast({
        title: 'Sucesso',
        description: 'Client imported successfully.',
      })
      setOpen(false)
      setEmail('')
    } catch (err: any) {
      const msg = err.response?.message || err.message || 'No tl;dv recording found for this email'
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: msg,
      })
    } finally {
      setLoadingSingle(false)
    }
  }

  const handleBulkImport = async () => {
    if (!bulkEmail) return

    setLoadingBulk(true)
    setBulkProgress([])
    setBulkDone(false)

    let currentPage = 1
    let isDone = false

    try {
      while (!isDone) {
        setBulkProgress((prev) => [...prev, `Buscando página ${currentPage}...`])

        const res = await pb.send('/backend/v1/tldv/import-my-calls', {
          method: 'POST',
          body: JSON.stringify({
            email: bulkEmail,
            page: currentPage,
            limit: parseInt(bulkLimit, 10) || 25,
          }),
          headers: { 'Content-Type': 'application/json' },
        })

        const {
          page,
          pages,
          processed_count,
          created_meetings,
          created_clients,
          skipped_duplicates,
          done,
          next_page,
        } = res

        setBulkProgress((prev) => [
          ...prev,
          `Página ${page}/${pages} concluída: ${processed_count} processadas, ${created_meetings} reuniões criadas, ${created_clients} clientes criados, ${skipped_duplicates} duplicadas ignoradas.`,
        ])

        if (done) {
          isDone = true
          setBulkDone(true)
          setBulkProgress((prev) => [...prev, `Importação finalizada com sucesso!`])
          toast({
            title: 'Sincronização Concluída',
            description: 'Todo o histórico foi processado com sucesso.',
          })
        } else {
          currentPage = next_page
        }
      }
    } catch (err: any) {
      const msg = err.response?.message || err.message || 'Erro ao sincronizar histórico'
      setBulkProgress((prev) => [...prev, `Erro na página ${currentPage}: ${msg}`])
      toast({
        variant: 'destructive',
        title: 'Erro na Sincronização',
        description: msg,
      })
    } finally {
      setLoadingBulk(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val)
        if (!val) {
          setBulkProgress([])
          setBulkDone(false)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="h-14 rounded-full px-6 shadow-xl bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center gap-2 group transition-all duration-300 hover:scale-105 border border-slate-200"
        >
          <Download className="h-5 w-5" />
          <span className="font-medium text-base hidden sm:inline">Importar do tl;dv</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Integração tl;dv</DialogTitle>
          <DialogDescription>
            Importe reuniões individuais ou sincronize seu histórico completo de chamadas.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Importação Única</TabsTrigger>
            <TabsTrigger value="bulk">Sincronizar Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-4">
            <form onSubmit={handleSingleImport}>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email do participante</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="exemplo@cliente.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loadingSingle}
                  />
                  <p className="text-sm text-slate-500">
                    Procura a gravação mais recente no tl;dv que contenha este email.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={loadingSingle || !email}
                  className="w-full sm:w-auto"
                >
                  {loadingSingle && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importar Cliente
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="bulk" className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bulkEmail">Seu email (Organizador/Participante)</Label>
              <Input
                id="bulkEmail"
                type="email"
                required
                value={bulkEmail}
                onChange={(e) => setBulkEmail(e.target.value)}
                disabled={loadingBulk || bulkDone}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bulkLimit">Registros por página</Label>
              <Input
                id="bulkLimit"
                type="number"
                min="1"
                max="100"
                required
                value={bulkLimit}
                onChange={(e) => setBulkLimit(e.target.value)}
                disabled={loadingBulk || bulkDone}
              />
            </div>

            {bulkProgress.length > 0 && (
              <ScrollArea className="h-32 w-full rounded-md border p-4 bg-slate-50 text-sm font-mono">
                {bulkProgress.map((msg, i) => (
                  <div key={i} className="mb-1 text-slate-700">
                    {msg}
                  </div>
                ))}
              </ScrollArea>
            )}

            <DialogFooter className="mt-2">
              {!bulkDone ? (
                <Button
                  onClick={handleBulkImport}
                  disabled={loadingBulk || !bulkEmail}
                  className="w-full sm:w-auto gap-2"
                >
                  {loadingBulk ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {loadingBulk ? 'Sincronizando...' : 'Iniciar Sincronização'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="w-full sm:w-auto gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Concluído (Fechar)
                </Button>
              )}
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
