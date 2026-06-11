import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Financeiro from './pages/Financeiro'
import Estoque from './pages/Estoque'
import Producao from './pages/Producao'
import Compras from './pages/Compras'
import Admin from './pages/Admin'

// Painel central (Dashboard) é restrito ao Financeiro e à Administração.
function Privado({ children, apenasAdmin, apenasPainelCentral }) {
  const { usuario, carregando } = useAuth()
  if (carregando) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!usuario) return <Navigate to="/login" replace />
  if (apenasAdmin && !usuario.admin) return <Navigate to="/estoque" replace />
  if (apenasPainelCentral && !usuario.admin && usuario.setor !== 'financeiro') return <Navigate to="/estoque" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Privado apenasPainelCentral><Dashboard /></Privado>} />
          <Route path="/financeiro" element={<Privado><Financeiro /></Privado>} />
          <Route path="/estoque" element={<Privado><Estoque /></Privado>} />
          <Route path="/producao" element={<Privado><Producao /></Privado>} />
          <Route path="/compras" element={<Privado><Compras /></Privado>} />
          <Route path="/admin" element={<Privado apenasAdmin><Admin /></Privado>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
