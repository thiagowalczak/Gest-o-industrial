import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { Factory, BarChart2, PieChart, Plus, Trash2, Edit2, X } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import DistribuicaoPizza from '../components/charts/DistribuicaoPizza'
import { TabelaSkeleton } from '../components/ui/skeleton'

const CORES_SITUACAO = {
  'Aguardando':  'badge-amarelo',
  'Liberada':    'badge-azul',
  'Em Produção': 'badge-laranja',
  'Encerrada':   'badge-verde',
  'Cancelada':   'badge-vermelho',
}

const CORES_HEX_SITUACAO = {
  'Aguardando':  '#f59e0b',
  'Liberada':    '#3b82f6',
  'Em Produção': '#f97316',
  'Encerrada':   '#22c55e',
  'Cancelada':   '#ef4444',
}

const SITUACOES = [
  ['A', 'Aguardando'],
  ['L', 'Liberada'],
  ['P', 'Em Produção'],
  ['E', 'Encerrada'],
  ['C', 'Cancelada'],
]

const ORDEM_VAZIA = {
  numero: '', item: '01', produto: '', descricao: '',
  quantidade_prevista: 0, quantidade_produzida: 0,
  data_inicio: '', data_fim: '', situacao: 'A',
}

const dataParaInput = (v) => v && v.length === 8 ? `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}` : ''
const inputParaData = (v) => v ? v.replace(/-/g, '') : ''

export default function Producao() {
  const [ordens, setOrdens] = useState([])
  const [resumo, setResumo] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(ORDEM_VAZIA)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [ordemParaRemover, setOrdemParaRemover] = useState(null)
  const [removendo, setRemovendo] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const carregar = () => {
    Promise.all([
      api.get('/producao/ordens').catch(() => ({ data: { ordens: DEMO_ORDENS } })),
      api.get('/producao/resumo').catch(() => ({ data: DEMO_RESUMO })),
    ]).then(([o, r]) => {
      setOrdens(o.data.ordens || [])
      setResumo(r.data)
    }).finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  const distribuicaoSituacao = useMemo(() => {
    const porSituacao = resumo?.por_situacao || {}
    return Object.entries(porSituacao).map(([nome, valor]) => ({
      nome,
      valor,
      cor: CORES_HEX_SITUACAO[nome] || '#9ca3af',
    }))
  }, [resumo])

  const abrirNova = () => {
    setEditando(null)
    setForm(ORDEM_VAZIA)
    setErro('')
    setMostrarForm(true)
  }

  const abrirEdicao = (o) => {
    setEditando(o)
    setForm({
      numero: o.numero, item: o.item, produto: o.produto || '', descricao: o.descricao || '',
      quantidade_prevista: o.quantidade_prevista || 0, quantidade_produzida: o.quantidade_produzida || 0,
      data_inicio: dataParaInput(o.data_inicio), data_fim: dataParaInput(o.data_fim), situacao: o.situacao || 'A',
    })
    setErro('')
    setMostrarForm(true)
  }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    const body = { ...form, data_inicio: inputParaData(form.data_inicio), data_fim: inputParaData(form.data_fim) }
    try {
      if (editando) {
        await api.put(`/producao/ordens/${editando.id}`, body)
      } else {
        await api.post('/producao/ordens', body)
      }
      setMostrarForm(false)
      carregar()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao salvar ordem de produção.')
    } finally {
      setSalvando(false)
    }
  }

  const confirmarRemocao = async () => {
    if (!ordemParaRemover) return
    setRemovendo(true)
    try {
      await api.delete(`/producao/ordens/${ordemParaRemover.id}`)
      carregar()
    } catch {
    } finally {
      setRemovendo(false)
      setOrdemParaRemover(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-purple-600">{resumo.total_ordens}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ordens em Aberto</p>
          </div>
          <div className="card text-center">
            <p className="text-lg sm:text-2xl font-bold text-primary-600">{Number(resumo.total_previsto).toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Quantidade Prevista</p>
          </div>
          <div className="card text-center">
            <p className="text-lg sm:text-2xl font-bold text-green-600">{Number(resumo.total_produzido).toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Já Produzido</p>
          </div>
          <div className="card text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart2 size={16} className="text-indigo-500" />
              <p className="text-2xl font-bold text-indigo-600">{resumo.eficiencia}%</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Eficiência Geral</p>
            <div className="mt-2 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${resumo.eficiencia}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Distribuição por situação */}
      {resumo && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
            <PieChart size={18} className="text-primary-500" /> Ordens por Situação
          </h3>
          <DistribuicaoPizza dados={distribuicaoSituacao} formatador={(v) => Number(v).toLocaleString('pt-BR')} />
        </div>
      )}

      {/* Ordens */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Factory size={18} className="text-primary-500" /> Ordens de Produção
          </h3>
          <button onClick={abrirNova} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={14} /> Nova Ordem
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={salvar} className="bg-gray-50 border border-gray-100 dark:bg-gray-900/40 dark:border-gray-700 rounded-xl p-4 mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{editando ? `Editar ordem ${editando.numero}/${editando.item}` : 'Nova ordem de produção'}</p>
              <button type="button" onClick={() => setMostrarForm(false)} aria-label="Fechar formulário" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Número *</label>
                <input className="input" value={form.numero} onChange={e => setForm(f => ({...f, numero: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Item</label>
                <input className="input" value={form.item} onChange={e => setForm(f => ({...f, item: e.target.value}))} />
              </div>
              <div>
                <label className="label">Código do Produto</label>
                <input className="input" value={form.produto} onChange={e => setForm(f => ({...f, produto: e.target.value}))} />
              </div>
              <div className="md:col-span-3">
                <label className="label">Descrição</label>
                <input className="input" value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))} />
              </div>
              <div>
                <label className="label">Quantidade Prevista</label>
                <input type="number" className="input" min={0} value={form.quantidade_prevista} onChange={e => setForm(f => ({...f, quantidade_prevista: Number(e.target.value)}))} />
              </div>
              <div>
                <label className="label">Quantidade Produzida</label>
                <input type="number" className="input" min={0} value={form.quantidade_produzida} onChange={e => setForm(f => ({...f, quantidade_produzida: Number(e.target.value)}))} />
              </div>
              <div>
                <label className="label">Situação</label>
                <select className="input" value={form.situacao} onChange={e => setForm(f => ({...f, situacao: e.target.value}))}>
                  {SITUACOES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Data de Início</label>
                <input type="date" className="input" value={form.data_inicio} onChange={e => setForm(f => ({...f, data_inicio: e.target.value}))} />
              </div>
              <div>
                <label className="label">Data de Término</label>
                <input type="date" className="input" value={form.data_fim} onChange={e => setForm(f => ({...f, data_fim: e.target.value}))} />
              </div>
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Ordem</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Produto</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Previsto</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Produzido</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Prazo</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Progresso</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando && ordens.length === 0 && <TabelaSkeleton linhas={5} colunas={8} />}
              {ordens.map((o, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-xs">{o.numero}/{o.item}</td>
                  <td className="py-2 px-3 text-gray-700 dark:text-gray-300 text-xs truncate max-w-[200px]">{o.descricao || o.produto}</td>
                  <td className="py-2 px-3 text-right">{Number(o.quantidade_prevista || 0).toLocaleString('pt-BR')}</td>
                  <td className="py-2 px-3 text-right text-green-600 dark:text-green-400 font-medium">{Number(o.quantidade_produzida || 0).toLocaleString('pt-BR')}</td>
                  <td className="py-2 px-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {String(o.data_fim || '').replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1') || '—'}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={CORES_SITUACAO[o.situacao_descricao] || 'badge-azul'}>
                      {o.situacao_descricao || o.situacao}
                    </span>
                  </td>
                  <td className="py-2 px-3 w-28">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${o.percentual_concluido || 0}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{o.percentual_concluido || 0}%</p>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => abrirEdicao(o)} aria-label={`Editar ordem ${o.numero}/${o.item}`} className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => setOrdemParaRemover(o)} aria-label={`Remover ordem ${o.numero}/${o.item}`} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && ordens.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma ordem em aberto. Cadastre uma nova ordem ou importe pela Administração.</p>}
        </div>
      </div>

      <ConfirmDialog
        aberto={!!ordemParaRemover}
        onConfirmar={confirmarRemocao}
        onCancelar={() => setOrdemParaRemover(null)}
        titulo="Remover ordem de produção"
        descricao={`Tem certeza que deseja remover a ordem ${ordemParaRemover?.numero}/${ordemParaRemover?.item}? Esta ação não pode ser desfeita.`}
        textoConfirmar="Remover"
        carregando={removendo}
      />
    </div>
  )
}

const DEMO_ORDENS = []
const DEMO_RESUMO = { total_ordens: 0, total_previsto: 0, total_produzido: 0, eficiencia: 0, por_situacao: {} }
