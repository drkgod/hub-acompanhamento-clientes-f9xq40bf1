import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MainStoreProvider } from '@/stores/useMainStore'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Index from './pages/Index'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Recovery from './pages/Recovery'
import ClientDetailsPage from './pages/ClientDetails'
import ClientWhatsAppPage from './pages/ClientWhatsApp'
import NewMeeting from './pages/NewMeeting'
import Integrations from './pages/Integrations'
import Digest from './pages/Digest'
import WhatsAppInbox from './pages/WhatsAppInbox'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <MainStoreProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/recovery" element={<Recovery />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pipeline" element={<Index />} />
                <Route path="/clientes/:id" element={<ClientDetailsPage />} />
                <Route path="/clientes/:id/whatsapp" element={<ClientWhatsAppPage />} />
                <Route path="/whatsapp" element={<WhatsAppInbox />} />
                <Route path="/nova-reuniao" element={<NewMeeting />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/digest" element={<Digest />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainStoreProvider>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
