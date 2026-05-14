import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export function ImportTldvDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
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
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="h-14 rounded-full px-6 shadow-xl bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center gap-2 group transition-all duration-300 hover:scale-105 border border-slate-200"
        >
          <Download className="h-5 w-5" />
          <span className="font-medium text-base hidden sm:inline">Import from tl;dv</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleImport}>
          <DialogHeader>
            <DialogTitle>Import from tl;dv</DialogTitle>
            <DialogDescription>
              Enter the client's email address associated with the tl;dv recording to import their
              data.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !email}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
