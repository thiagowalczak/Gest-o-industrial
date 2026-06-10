import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, TrendingUp, Package, Factory,
  ShoppingCart, Users, Menu, X, LogOut, Bell,
  ChevronRight, Settings
} from 'lucide-react'

const NAV = [
  { href: '/',           label: 'Dashboard',   icon: LayoutDashboard, setores: null },
  { href: '/financeiro', label: 'Financeiro',   icon: TrendingUp,      setores: ['financeiro', 'admin', 'diretoria'] },
  { href: '/estoque',    label: 'Estoque',      icon: Package,         setores: ['estoque', 'compras', 'admin', 'diretoria'] },
  { href: '/producao',   label: 'Produção',     icon: Factory,         setores: ['producao', 'admin', 'diretoria'] },
  { href: '/compras',    label: 'Compras',      icon: ShoppingCart,    setores: ['compras', 'admin', 'diretoria'] },
  { href: '/admin',      label: 'Administração',icon: Users,           setores: ['admin'] },
]

export default function Layout({ children }) {
  const [aberto, setAberto] = useState(false)
  const { pathname } = useLocation()
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const itensNav = NAV.filter(n => !n.setores || n.setores.includes(usuario?.setor))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 shadow-lg
        transform transition-transform duration-200 lg:relative lg:translate-x-0
        ${aberto ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center">
            <Factory size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">Gestão</p>
            <p className="text-primary-500 font-bold text-sm leading-none">Industrial</p>
          </div>
          <button onClick={() => setAberto(false)} className="ml-auto lg:hidden text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="p-3 flex-1 overflow-y-auto">
          {itensNav.map(({ href, label, icon: Icon }) => {
            const ativo = pathname === href
            return (
              <Link
                key={href}
                to={href}
                onClick={() => setAberto(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all group
                  ${ativo
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'}
                `}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{label}</span>
                {ativo && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-bold text-sm">
                {usuario?.nome?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{usuario?.nome}</p>
              <p className="text-xs text-gray-500 capitalize">{usuario?.setor}</p>
            </div>
            <button onClick={handleLogout} title="Sair" className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {aberto && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setAberto(false)} />
      )}

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button onClick={() => setAberto(true)} className="lg:hidden text-gray-500 hover:text-primary-500">
            <Menu size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-800">
              {itensNav.find(n => n.href === pathname)?.label || 'Gestão Industrial'}
            </h1>
          </div>
          <button className="relative text-gray-400 hover:text-primary-500 transition-colors">
            <Bell size={20} />
          </button>
        </header>

        {/* Página */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
