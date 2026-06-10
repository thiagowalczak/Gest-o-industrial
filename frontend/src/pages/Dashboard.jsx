import { useEffect, useState } from 'react'
import api from '../services/api'
import {
  TrendingUp, TrendingDown, Package, Factory,
  ShoppingCart, AlertTriangle, RefreshCw, Wifi
} from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtNum = (v) => new Intl.NumberFormat('pt-BR').format(v || 0)

function KpiCard({ titulo, valor, sub, icon: Icon, cor, tendencia }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{titulo}</p>
          <p className={`text-2xl font-bold mt-1 ${cor}`}>{valor}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${cor.replace('text-', 'bg-').replace('600', '100').replace('700', '100')}`}>
          <Icon size={22} className={cor} />
        </div>
      </div>
      {tendencia !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${tendencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {tendencia >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {tendencia >= 0 ? 'Superávit previsto' : 'Déficit previsto'}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [atualizado, setAtualizado] = useState(null)

  const carregar = async () => {
    setCarregando(true)
    try {
      const { data } = await api.get('/dashboard/resumo')
      setDados(data)
      setAtualizado(new Date())
    } catch {
      // backend offline — exibe dados demo
      setDados(DEMO)
      setAtualizado(new Date())
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    const iv = setInterval(carregar, 60000)
    return () => clearInterval(iv)
  }, [])

  const fin = dados?.financeiro || {}
  const est = dados?.estoque || {}
  const com = dados?.compras || {}
  const prod = dados?.producao || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Painel Central</h2>
          <p className="text-sm text-gray-500">
            {atualizado ? `Atualizado às ${atualizado.toLocaleTimeString('pt-BR')}` : 'Carregando...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
            <Wifi size={12} />
            Sistema Online
          </div>
          <button onClick={carregar} disabled={carregando}
            className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Alertas */}
      {(dados?.alertas_estoque > 0) && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            {dados.alertas_estoque} produto(s) abaixo do estoque mínimo. Verifique o módulo de Estoque.
          </p>
        </div>
      )}

      {/* KPIs Financeiro */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <TrendingUp size={14} /> Financeiro — próximos 30 dias
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard titulo="A Receber" valor={fmt(fin.total_receber_30d)} sub={`${fmtNum(fin.titulos_receber)} títulos`} icon={TrendingUp} cor="text-green-600" />
          <KpiCard titulo="A Pagar" valor={fmt(fin.total_pagar_30d)} sub={`${fmtNum(fin.titulos_pagar)} títulos`} icon={TrendingDown} cor="text-red-600" />
          <KpiCard titulo="Saldo Previsto" valor={fmt(fin.saldo_previsto)} icon={TrendingUp} cor={fin.saldo_previsto >= 0 ? "text-green-700" : "text-red-700"} tendencia={fin.saldo_previsto} />
          <KpiCard titulo="Alertas Estoque" valor={fmtNum(dados?.alertas_estoque || 0)} sub="produtos abaixo do mínimo" icon={AlertTriangle} cor="text-amber-600" />
        </div>
      </div>

      {/* KPIs Operacional */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Factory size={14} /> Operacional
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard titulo="Itens em Estoque" valor={fmtNum(est.total_itens)} sub={`Valor: ${fmt(est.valor_total)}`} icon={Package} cor="text-blue-600" />
          <KpiCard titulo="Pedidos de Compra" valor={fmtNum(com.pedidos_abertos)} sub={`Total: ${fmt(com.valor_total_pedidos)}`} icon={ShoppingCart} cor="text-primary-600" />
          <KpiCard titulo="Ordens Produção" valor={fmtNum(prod.ordens_abertas)} sub="ordens em aberto" icon={Factory} cor="text-purple-600" />
          <KpiCard titulo="Eficiência Produção" valor={`${prod.ordens_abertas > 0 ? Math.round((prod.quantidade_produzida / prod.quantidade_prevista) * 100) || 0 : 0}%`} sub={`${fmtNum(prod.quantidade_produzida)} / ${fmtNum(prod.quantidade_prevista)} un.`} icon={Factory} cor="text-indigo-600" />
        </div>
      </div>

      {/* Rodapé */}
      <div className="text-center text-xs text-gray-400 py-2">
        Atualização automática a cada 60 segundos
      </div>
    </div>
  )
}

// Dados de demonstração usados quando o backend ainda não respondeu
const DEMO = {
  alertas_estoque: 0,
  financeiro: { total_receber_30d: 0, total_pagar_30d: 0, saldo_previsto: 0, titulos_receber: 0, titulos_pagar: 0 },
  estoque: { total_itens: 0, valor_total: 0 },
  compras: { pedidos_abertos: 0, valor_total_pedidos: 0 },
  producao: { ordens_abertas: 0, quantidade_prevista: 0, quantidade_produzida: 0 },
}
