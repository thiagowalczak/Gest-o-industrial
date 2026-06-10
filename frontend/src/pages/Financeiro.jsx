import { useEffect, useState } from 'react'
import api from '../services/api'
import { TrendingUp, TrendingDown } from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

function TabelaTitulos({ titulos, tipo }) {
  const hoje = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Título</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">
              {tipo === 'receber' ? 'Cliente' : 'Fornecedor'}
            </th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Vencimento</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Saldo</th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Situação</th>
          </tr>
        </thead>
        <tbody>
          {titulos.slice(0, 50).map((t, i) => {
            const venc = String(t.vencimento || '')
            const vencido = venc < hoje
            return (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 px-3 font-mono text-xs">{t.titulo}</td>
                <td className="py-2 px-3 text-gray-700 truncate max-w-[180px]">
                  {tipo === 'receber' ? t.nome_cliente : t.nome_fornecedor}
                </td>
                <td className={`py-2 px-3 font-mono text-xs ${vencido ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                  {venc ? `${venc.slice(6,8)}/${venc.slice(4,6)}/${venc.slice(0,4)}` : '-'}
                </td>
                <td className="py-2 px-3 text-right font-semibold">{fmt(t.saldo)}</td>
                <td className="py-2 px-3 text-center">
                  <span className={vencido ? 'badge-vermelho' : 'badge-verde'}>
                    {vencido ? 'Vencido' : 'A vencer'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function Financeiro() {
  const [aba, setAba] = useState('fluxo')
  const [receber, setReceber] = useState(null)
  const [pagar, setPagar] = useState(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    setCarregando(true)
    Promise.all([
      api.get('/financeiro/contas-receber').catch(() => ({ data: DEMO_RECEBER })),
      api.get('/financeiro/contas-pagar').catch(() => ({ data: DEMO_PAGAR })),
    ]).then(([r, p]) => {
      setReceber(r.data)
      setPagar(p.data)
    }).finally(() => setCarregando(false))
  }, [])

  const saldo = (receber?.total || 0) - (pagar?.total || 0)

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-xl"><TrendingUp size={22} className="text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase">A Receber (60d)</p>
            <p className="text-xl font-bold text-green-600">{fmt(receber?.total)}</p>
            <p className="text-xs text-red-500">{fmt(receber?.valor_vencido)} vencidos</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-xl"><TrendingDown size={22} className="text-red-600" /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase">A Pagar (60d)</p>
            <p className="text-xl font-bold text-red-600">{fmt(pagar?.total)}</p>
            <p className="text-xs text-red-500">{fmt(pagar?.valor_vencido)} vencidos</p>
          </div>
        </div>
        <div className={`card flex items-center gap-4 ${saldo >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className={`p-3 rounded-xl ${saldo >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            {saldo >= 0 ? <TrendingUp size={22} className="text-green-600" /> : <TrendingDown size={22} className="text-red-600" />}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase">Saldo Previsto</p>
            <p className={`text-xl font-bold ${saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(saldo)}</p>
            <p className="text-xs text-gray-500">{saldo >= 0 ? 'Superávit' : 'Déficit'}</p>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="card">
        <div className="flex gap-1 mb-4 border-b border-gray-100 pb-3">
          {[['fluxo','Fluxo de Caixa'],['receber','Contas a Receber'],['pagar','Contas a Pagar']].map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                aba === id ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {aba === 'fluxo' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-sm font-medium text-green-700">Total Entradas (60d)</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{fmt(receber?.total)}</p>
                <p className="text-xs text-green-600 mt-1">{receber?.quantidade} títulos</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-sm font-medium text-red-700">Total Saídas (60d)</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{fmt(pagar?.total)}</p>
                <p className="text-xs text-red-600 mt-1">{pagar?.quantidade} títulos</p>
              </div>
            </div>
            <div className={`rounded-xl p-4 border ${saldo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm font-medium ${saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                Resultado Previsto: <strong>{saldo >= 0 ? 'SUPERÁVIT' : 'DÉFICIT'}</strong>
              </p>
              <p className={`text-3xl font-bold mt-1 ${saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(Math.abs(saldo))}</p>
            </div>
          </div>
        )}

        {aba === 'receber' && receber && <TabelaTitulos titulos={receber.titulos} tipo="receber" />}
        {aba === 'pagar' && pagar && <TabelaTitulos titulos={pagar.titulos} tipo="pagar" />}
      </div>
    </div>
  )
}

const DEMO_RECEBER = { total: 0, valor_vencido: 0, quantidade: 0, titulos: [] }
const DEMO_PAGAR = { total: 0, valor_vencido: 0, quantidade: 0, titulos: [] }
