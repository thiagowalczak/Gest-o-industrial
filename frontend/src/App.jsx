import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Financeiro from './pages/Financeiro'
import Estoque from './pages/Estoque'
import Producao from './pages/Producao'
import Compras from './pages/Compras'
import Admin from './pages/Admin'
import AnaliseIA from './pages/AnaliseIA'
import Onboarding from './pages/Onboarding'
import EsqueciSenha from './pages/EsqueciSenha'
import RedefinirSenha from './pages/RedefinirSenha'
import Clientes from './pages/Clientes'

// Painel central (Dashboard) é restrito ao Financeiro e à Administração.
function Privado({ children, apenasAdmin, apenasPainelCentral, apenasSuperAdmin }) {
  const { usuario, empresa, carregando } = useAuth()
  if (carregando) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!usuario) return <Navigate to="/login" replace />
  if (apenasAdmin && !usuario.admin) return <Navigate to="/estoque" replace />
  if (apenasSuperAdmin && !usuario.super_admin) return <Navigate to="/estoque" replace />
  if (apenasPainelCentral && !usuario.admin && usuario.setor !== 'financeiro') return <Navigate to="/estoque" replace />
  // Administrador de empresa que ainda não importou os dados iniciais é guiado pelo assistente.
  if (usuario.admin && empresa && empresa.onboarding_concluido === false) return <Navigate to="/onboarding" replace />
  return <Layout>{children}</Layout>
}

// Assistente de configuração inicial: só para administradores com onboarding pendente.
function GuardaOnboarding({ children }) {
  const { usuario, empresa, carregando } = useAuth()
  if (carregando) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!usuario) return <Navigate to="/login" replace />
  if (!usuario.admin) return <Navigate to="/estoque" replace />
  if (empresa && empresa.onboarding_concluido !== false) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/onboarding" element={<GuardaOnboarding><Onboarding /></GuardaOnboarding>} />
            <Route path="/" element={<Privado apenasPainelCentral><Dashboard /></Privado>} />
            <Route path="/financeiro" element={<Privado><Financeiro /></Privado>} />
            <Route path="/estoque" element={<Privado><Estoque /></Privado>} />
            <Route path="/producao" element={<Privado><Producao /></Privado>} />
            <Route path="/compras" element={<Privado><Compras /></Privado>} />
            <Route path="/admin" element={<Privado apenasAdmin><Admin /></Privado>} />
            <Route path="/analise" element={<Privado><AnaliseIA /></Privado>} />
            <Route path="/clientes" element={<Privado apenasSuperAdmin><Clientes /></Privado>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
