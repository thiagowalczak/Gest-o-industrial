import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'
import {
  LayoutDashboard, TrendingUp, Package, Factory,
  ShoppingCart, Users, Menu, X, LogOut, Bell,
  ChevronRight, ChevronsLeft, ChevronsRight, Sun, Moon, Brain
} from 'lucide-react'

// Painel central (Dashboard): restrito ao Financeiro e à Administração.
// Demais setores (estoque, produção, compras) têm acesso apenas às
// informações operacionais de Estoque, Produção e Compras.
const SETORES_OPERACIONAIS = ['estoque', 'compras', 'producao', 'admin', 'diretoria']

const NAV = [
  { href: '/',           label: 'Dashboard',   icon: LayoutDashboard, setores: ['admin', 'financeiro'] },
  { href: '/financeiro', label: 'Financeiro',   icon: TrendingUp,      setores: ['financeiro', 'admin', 'diretoria'] },
  { href: '/estoque',    label: 'Estoque',      icon: Package,         setores: SETORES_OPERACIONAIS },
  { href: '/producao',   label: 'Produção',     icon: Factory,         setores: SETORES_OPERACIONAIS },
  { href: '/compras',    label: 'Compras',      icon: ShoppingCart,    setores: SETORES_OPERACIONAIS },
  { href: '/admin',      label: 'Administração',icon: Users,           setores: ['admin'] },
  { href: '/analise',    label: 'Análise IA',   icon: Brain,           setores: ['admin', 'financeiro', 'diretoria'] },
]

export default function Layout({ children }) {
  const [aberto, setAberto] = useState(false)
  const [colapsado, setColapsado] = useState(() => localStorage.getItem('sidebar_colapsada') === '1')
  const [alertas, setAlertas] = useState([])
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false)
  const notifRef = useRef(null)
  const { pathname } = useLocation()
  const { usuario, logout } = useAuth()
  const { tema, alternarTema } = useTheme()
  const navigate = useNavigate()

  const itensNav = NAV.filter(n => !n.setores || n.setores.includes(usuario?.setor))
  const temAcessoEstoque = itensNav.some(n => n.href === '/estoque')

  useEffect(() => {
    localStorage.setItem('sidebar_colapsada', colapsado ? '1' : '0')
  }, [colapsado])

  useEffect(() => {
    if (!temAcessoEstoque) return
    const carregarAlertas = () => {
      api.get('/estoque/alertas').then(r => setAlertas(r.data || [])).catch(() => {})
    }
    carregarAlertas()
    const iv = setInterval(carregarAlertas, 60000)
    return () => clearInterval(iv)
  }, [temAcessoEstoque])

  useEffect(() => {
    const aoClicarFora = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setMostrarNotificacoes(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 shadow-lg dark:bg-gray-800 dark:border-gray-700
        flex flex-col transform transition-all duration-200 lg:relative lg:translate-x-0
        ${colapsado ? 'lg:w-20' : 'lg:w-64'} w-64
        ${aberto ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-700 ${colapsado ? 'lg:px-0 lg:justify-center' : ''}`}>
          <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Factory size={20} className="text-white" />
          </div>
          <div className={colapsado ? 'lg:hidden' : ''}>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-none">Gestão</p>
            <p className="text-primary-500 font-bold text-sm leading-none">Industrial</p>
          </div>
          <button onClick={() => setAberto(false)} aria-label="Fechar menu" className="ml-auto lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="p-3 flex-1 overflow-y-auto overflow-x-hidden">
          {itensNav.map(({ href, label, icon: Icon }) => {
            const ativo = pathname === href
            return (
              <Link
                key={href}
                to={href}
                onClick={() => setAberto(false)}
                title={colapsado ? label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all group
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400
                  ${colapsado ? 'lg:justify-center' : ''}
                  ${ativo
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-primary-400'}
                `}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className={`text-sm font-medium ${colapsado ? 'lg:hidden' : ''}`}>{label}</span>
                {ativo && <ChevronRight size={14} className={`ml-auto ${colapsado ? 'lg:hidden' : ''}`} />}
              </Link>
            )
          })}
        </nav>

        {/* Botão colapsar (desktop) */}
        <div className="hidden lg:block border-t border-gray-100 dark:border-gray-700 p-3">
          <button
            onClick={() => setColapsado(c => !c)}
            title={colapsado ? 'Expandir menu' : 'Recolher menu'}
            aria-label={colapsado ? 'Expandir menu' : 'Recolher menu'}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${colapsado ? 'justify-center' : ''}`}
          >
            {colapsado ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            {!colapsado && <span className="text-sm font-medium">Recolher menu</span>}
          </button>
        </div>

        {/* Footer sidebar - usuário */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <div className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/40 ${colapsado ? 'lg:flex-col lg:gap-2' : ''}`}>
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center flex-shrink-0" title={colapsado ? usuario?.nome : undefined}>
              <span className="text-primary-600 dark:text-primary-400 font-bold text-sm">
                {usuario?.nome?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className={`flex-1 min-w-0 ${colapsado ? 'lg:hidden' : ''}`}>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{usuario?.nome}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{usuario?.setor}</p>
            </div>
            <button onClick={handleLogout} title="Sair" aria-label="Sair do sistema" className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded">
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
        <header className="bg-white border-b border-gray-100 dark:bg-gray-800 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button onClick={() => setAberto(true)} aria-label="Abrir menu" className="lg:hidden text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded">
            <Menu size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {itensNav.find(n => n.href === pathname)?.label || 'Gestão Industrial'}
            </h1>
          </div>
          <button
            onClick={alternarTema}
            aria-label={tema === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={tema === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded"
          >
            {tema === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {temAcessoEstoque ? (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setMostrarNotificacoes(v => !v)}
                aria-label={`Notificações${alertas.length > 0 ? ` (${alertas.length} alerta${alertas.length > 1 ? 's' : ''} de estoque)` : ''}`}
                aria-expanded={mostrarNotificacoes}
                className="relative text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded"
              >
                <Bell size={20} />
                {alertas.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {alertas.length > 9 ? '9+' : alertas.length}
                  </span>
                )}
              </button>

              {mostrarNotificacoes && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 dark:bg-gray-800 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Alertas de Estoque</p>
                  </div>
                  {alertas.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">Nenhum alerta pendente.</p>
                  ) : (
                    <ul>
                      {alertas.slice(0, 8).map(a => (
                        <li key={a.id} className="px-4 py-3 border-b border-gray-50 dark:border-gray-700/50">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{a.produto_descricao}</p>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                            Estoque: <strong>{a.estoque_atual}</strong> (mínimo: {a.estoque_minimo})
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    to="/estoque"
                    onClick={() => setMostrarNotificacoes(false)}
                    className="block text-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 py-2.5 border-t border-gray-100 dark:border-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded"
                  >
                    Ver estoque
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <button
              disabled
              title="Notificações (em breve)"
              aria-label="Notificações (em breve)"
              className="relative text-gray-400 dark:text-gray-600 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded"
            >
              <Bell size={20} />
            </button>
          )}
        </header>

        {/* Página */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
