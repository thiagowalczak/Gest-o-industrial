import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { Package, AlertTriangle, Search, Settings, CheckCircle, Plus, Trash2, PieChart, DollarSign, Factory } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import DistribuicaoPizza from '../components/charts/DistribuicaoPizza'
import { TabelaSkeleton } from '../components/ui/skeleton'
import toast from 'react-hot-toast'

const ITEM_VAZIO = {
  codigo: '', descricao: '', deposito: '', quantidade: 0, custo_medio: 0,
  unidade: '', grupo: '', estoque_minimo: 0, ponto_reposicao: 0,
}

export default function Estoque() {
  const [itens, setItens] = useState([])
  const [alertas, setAlertas] = useState([])
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState('itens')
  const [config, setConfig] = useState({ produto_codigo: '', estoque_minimo: 0, ponto_reposicao: 0, quantidade_reposicao: 0 })
  const [novoItem, setNovoItem] = useState(ITEM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgItem, setMsgItem] = useState('')
  const [itemParaRemover, setItemParaRemover] = useState(null)
  const [removendo, setRemovendo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [limpando, setLimpando] = useState(false)
  const [consumoProducao, setConsumoProducao] = useState([])

  const carregar = async () => {
    try {
      const [estoqueRes, alertasRes, consumoRes] = await Promise.all([
        api.get('/estoque/').catch(() => ({ data: { itens: DEMO_ITENS } })),
        api.get('/estoque/alertas').catch(() => ({ data: DEMO_ALERTAS })),
        api.get('/producao/consumo-materiais').catch(() => ({ data: [] })),
      ])
      setItens(estoqueRes.data.itens || [])
      setAlertas(alertasRes.data || [])
      setConsumoProducao(consumoRes.data || [])
    } catch {
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const handleLimparTudo = async () => {
    if (!window.confirm('Remover TODOS os itens do estoque? Esta ação não pode ser desfeita.')) return
    setLimpando(true)
    try {
      const res = await api.delete('/estoque/limpar-tudo')
      toast.success(`${res.data.removidos} item(ns) removido(s)`)
      carregar()
    } catch {
      toast.error('Erro ao limpar estoque')
    } finally {
      setLimpando(false)
    }
  }

  const itensFiltrados = itens.filter(i =>
    !busca || i.descricao?.toLowerCase().includes(busca.toLowerCase()) || i.codigo?.includes(busca)
  )

  const distribuicaoEstoque = useMemo(() => [
    { nome: 'Normal', valor: itens.filter(i => !i.alerta).length, cor: '#22c55e' },
    { nome: 'Crítico', valor: itens.filter(i => i.alerta).length, cor: '#ef4444' },
  ], [itens])

  const valorTotalEstoque = useMemo(
    () => itens.reduce((acc, i) => acc + (i.quantidade || 0) * (i.custo_medio || 0), 0),
    [itens]
  )
  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  const salvarConfig = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.post('/estoque/configurar', config)
      setMsg('Configuração salva com sucesso!')
      await carregar()
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Erro ao salvar. Verifique o código do produto.')
    } finally {
      setSalvando(false)
    }
  }

  const salvarNovoItem = async (e) => {
    e.preventDefault()
    setSalvando(true)
    setMsgItem('')
    try {
      await api.post('/estoque/', novoItem)
      setMsgItem('Item cadastrado com sucesso!')
      setNovoItem(ITEM_VAZIO)
      await carregar()
      setTimeout(() => setMsgItem(''), 3000)
    } catch (err) {
      setMsgItem(err.response?.data?.detail || 'Erro ao cadastrar item.')
    } finally {
      setSalvando(false)
    }
  }

  const confirmarRemocao = async () => {
    if (!itemParaRemover) return
    setRemovendo(true)
    try {
      await api.delete(`/estoque/${itemParaRemover.id}`)
      await carregar()
    } catch {
    } finally {
      setRemovendo(false)
      setItemParaRemover(null)
    }
  }

  const resolverAlerta = async (id) => {
    try {
      await api.post(`/estoque/alertas/${id}/resolver`)
      setAlertas(a => a.filter(x => x.id !== id))
    } catch {}
  }

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <Package size={24} className="mx-auto text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-blue-600">{itens.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total de Itens</p>
        </div>
        <div className="card text-center">
          <DollarSign size={24} className="mx-auto text-primary-500 mb-2" />
          <p className="text-lg sm:text-2xl font-bold text-primary-600">{fmt(valorTotalEstoque)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Valor Total em Estoque</p>
        </div>
        <div className="card text-center">
          <AlertTriangle size={24} className="mx-auto text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-amber-600">{alertas.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Alertas Pendentes</p>
        </div>
        <div className="card text-center">
          <Package size={24} className="mx-auto text-green-500 mb-2" />
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{itens.filter(i => !i.alerta).length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Itens Normais</p>
        </div>
        <div className="card text-center">
          <AlertTriangle size={24} className="mx-auto text-red-500 mb-2" />
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{itens.filter(i => i.alerta).length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Abaixo do Mínimo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {itens.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
              <PieChart size={18} className="text-primary-500" /> Distribuição do Estoque
            </h3>
            <DistribuicaoPizza dados={distribuicaoEstoque} formatador={(v) => Number(v).toLocaleString('pt-BR')} />
          </div>
        )}

        {consumoProducao.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
              <Factory size={18} className="text-primary-500" /> Consumo pela Produção
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Total já consumido pelas ordens de produção e o quanto resta em estoque agora.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Material</th>
                    <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Consumido</th>
                    <th className="text-right py-1.5 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Estoque atual</th>
                  </tr>
                </thead>
                <tbody>
                  {consumoProducao.slice(0, 10).map(c => (
                    <tr key={c.item_codigo} className="border-b border-gray-50 dark:border-gray-700/50">
                      <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300 truncate max-w-[160px]">{c.item_codigo} — {c.descricao}</td>
                      <td className="py-1.5 px-2 text-right text-primary-600 dark:text-primary-400 font-medium">{Number(c.total_consumido).toLocaleString('pt-BR')}</td>
                      <td className={`py-1.5 px-2 text-right font-semibold ${c.estoque_atual <= 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {Number(c.estoque_atual).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        {/* Abas */}
        <div className="flex gap-1 mb-4 border-b border-gray-100 dark:border-gray-700 pb-3 flex-wrap">
          {[['itens','Estoque Atual'],['novo','Novo Item'],['alertas',`Alertas (${alertas.length})`],['configurar','Configurar Mínimos']].map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)} aria-pressed={aba === id}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                aba === id ? 'bg-primary-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {aba === 'itens' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-9" placeholder="Buscar por código ou descrição..." value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <button
                onClick={handleLimparTudo}
                disabled={limpando || itens.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <AlertTriangle size={13} />
                {limpando ? 'Removendo...' : 'Limpar tudo'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Código</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Descrição</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Depósito</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Quantidade</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Mínimo</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando && itensFiltrados.length === 0 && <TabelaSkeleton linhas={5} colunas={7} />}
                  {itensFiltrados.slice(0, 100).map((item, i) => (
                    <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/30 ${item.alerta ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                      <td className="py-2 px-3 font-mono text-xs">{item.codigo}</td>
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{item.descricao}</td>
                      <td className="py-2 px-3 text-gray-500 dark:text-gray-400 text-xs">{item.deposito}</td>
                      <td className="py-2 px-3 text-right font-semibold">{Number(item.quantidade || 0).toLocaleString('pt-BR')} {item.unidade}</td>
                      <td className="py-2 px-3 text-right text-gray-500 dark:text-gray-400">{item.estoque_minimo != null ? Number(item.estoque_minimo).toLocaleString('pt-BR') : '—'}</td>
                      <td className="py-2 px-3 text-center">
                        {item.alerta ? <span className="badge-vermelho">Crítico</span> : <span className="badge-verde">Normal</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => setItemParaRemover(item)}
                          aria-label={`Remover item ${item.descricao}`}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!carregando && itensFiltrados.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum item encontrado. Cadastre um item na aba "Novo Item" ou importe uma planilha na Administração.</p>}
            </div>
          </>
        )}

        {aba === 'novo' && (
          <form onSubmit={salvarNovoItem} className="max-w-2xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Plus size={16} className="text-primary-500" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cadastrar novo item de estoque</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Código *</label>
                <input className="input" value={novoItem.codigo} onChange={e => setNovoItem(c => ({...c, codigo: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Descrição *</label>
                <input className="input" value={novoItem.descricao} onChange={e => setNovoItem(c => ({...c, descricao: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Depósito</label>
                <input className="input" value={novoItem.deposito} onChange={e => setNovoItem(c => ({...c, deposito: e.target.value}))} />
              </div>
              <div>
                <label className="label">Unidade</label>
                <input className="input" value={novoItem.unidade} onChange={e => setNovoItem(c => ({...c, unidade: e.target.value}))} />
              </div>
              <div>
                <label className="label">Grupo</label>
                <input className="input" value={novoItem.grupo} onChange={e => setNovoItem(c => ({...c, grupo: e.target.value}))} />
              </div>
              <div>
                <label className="label">Quantidade</label>
                <input type="number" className="input" min={0} value={novoItem.quantidade} onChange={e => setNovoItem(c => ({...c, quantidade: Number(e.target.value)}))} />
              </div>
              <div>
                <label className="label">Custo Médio</label>
                <input type="number" step="0.01" className="input" min={0} value={novoItem.custo_medio} onChange={e => setNovoItem(c => ({...c, custo_medio: Number(e.target.value)}))} />
              </div>
              <div>
                <label className="label">Estoque Mínimo</label>
                <input type="number" className="input" min={0} value={novoItem.estoque_minimo} onChange={e => setNovoItem(c => ({...c, estoque_minimo: Number(e.target.value)}))} />
              </div>
              <div>
                <label className="label">Ponto de Reposição</label>
                <input type="number" className="input" min={0} value={novoItem.ponto_reposicao} onChange={e => setNovoItem(c => ({...c, ponto_reposicao: Number(e.target.value)}))} />
              </div>
            </div>
            {msgItem && <p className={`text-sm ${msgItem.includes('Erro') || msgItem.includes('já existe') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{msgItem}</p>}
            <button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Cadastrar Item'}</button>
          </form>
        )}

        {aba === 'alertas' && (
          <div className="space-y-3">
            {alertas.length === 0 && (
              <div className="text-center py-10">
                <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum alerta pendente</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Todos os produtos estão acima do estoque mínimo</p>
              </div>
            )}
            {alertas.map(a => (
              <div key={a.id} className="flex items-center gap-4 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 rounded-xl p-4">
                <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{a.produto_descricao}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Código: {a.produto_codigo}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    Estoque atual: <strong>{a.estoque_atual}</strong> | Mínimo: <strong>{a.estoque_minimo}</strong>
                  </p>
                </div>
                <button onClick={() => resolverAlerta(a.id)} className="btn-secondary text-xs">Resolver</button>
              </div>
            ))}
          </div>
        )}

        {aba === 'configurar' && (
          <form onSubmit={salvarConfig} className="max-w-md space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings size={16} className="text-primary-500" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Configurar estoque mínimo por produto</p>
            </div>
            <div>
              <label className="label">Código do Produto</label>
              <input className="input" value={config.produto_codigo} onChange={e => setConfig(c => ({...c, produto_codigo: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Estoque Mínimo</label>
              <input type="number" className="input" min={0} value={config.estoque_minimo} onChange={e => setConfig(c => ({...c, estoque_minimo: Number(e.target.value)}))} required />
            </div>
            <div>
              <label className="label">Ponto de Reposição</label>
              <input type="number" className="input" min={0} value={config.ponto_reposicao} onChange={e => setConfig(c => ({...c, ponto_reposicao: Number(e.target.value)}))} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Dica: o produto precisa estar cadastrado na aba "Novo Item" (ou importado por planilha) antes de configurar o mínimo.</p>
            {msg && <p className={`text-sm ${msg.includes('Erro') || msg.includes('não encontrado') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{msg}</p>}
            <button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar Configuração'}</button>
          </form>
        )}
      </div>

      <ConfirmDialog
        aberto={!!itemParaRemover}
        onConfirmar={confirmarRemocao}
        onCancelar={() => setItemParaRemover(null)}
        titulo="Remover item do estoque"
        descricao={`Tem certeza que deseja remover "${itemParaRemover?.descricao}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Remover"
        carregando={removendo}
      />
    </div>
  )
}

const DEMO_ITENS = []
const DEMO_ALERTAS = []
