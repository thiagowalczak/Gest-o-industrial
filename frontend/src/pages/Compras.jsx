import { useEffect, useState } from 'react'
import api from '../services/api'
import { ShoppingCart, RefreshCw, Plus, Trash2, Edit2, X } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import { TabelaSkeleton } from '../components/ui/skeleton'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const PEDIDO_VAZIO = {
  numero: '', item: '01', produto: '', descricao: '',
  quantidade: 0, preco_unitario: 0, valor_total: 0,
  data_entrega: '', fornecedor: '', nome_fornecedor: '', status: 'Aberto',
}

const dataParaInput = (v) => v && v.length === 8 ? `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}` : ''
const inputParaData = (v) => v ? v.replace(/-/g, '') : ''

export default function Compras() {
  const [pedidos, setPedidos] = useState([])
  const [status, setStatus] = useState(null)
  const [atualizado, setAtualizado] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(PEDIDO_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [pedidoParaRemover, setPedidoParaRemover] = useState(null)
  const [removendo, setRemovendo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const hoje = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  const carregar = () => {
    Promise.all([
      api.get('/producao/compras')
        .then(r => { setPedidos(r.data.pedidos || []); setAtualizado(new Date()) })
        .catch(() => setPedidos(DEMO)),
      api.get('/producao/compras/status')
        .then(r => setStatus(r.data))
        .catch(() => setStatus(null)),
    ]).finally(() => setCarregando(false))
  }

  useEffect(() => {
    carregar()
    const iv = setInterval(carregar, 15000) // atualiza a cada 15 segundos
    return () => clearInterval(iv)
  }, [])

  const total = pedidos.reduce((s, p) => s + Number(p.valor_total || 0), 0)

  const abrirNovo = () => {
    setEditando(null)
    setForm(PEDIDO_VAZIO)
    setErro('')
    setMostrarForm(true)
  }

  const abrirEdicao = (p) => {
    setEditando(p)
    setForm({
      numero: p.numero, item: p.item, produto: p.produto || '', descricao: p.descricao || '',
      quantidade: p.quantidade || 0, preco_unitario: p.preco_unitario || 0, valor_total: p.valor_total || 0,
      data_entrega: dataParaInput(p.data_entrega), fornecedor: p.fornecedor || '',
      nome_fornecedor: p.nome_fornecedor || '', status: p.status || 'Aberto',
    })
    setErro('')
    setMostrarForm(true)
  }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    const body = { ...form, data_entrega: inputParaData(form.data_entrega) }
    try {
      if (editando) {
        await api.put(`/producao/compras/${editando.id}`, body)
      } else {
        await api.post('/producao/compras', body)
      }
      setMostrarForm(false)
      carregar()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao salvar pedido de compra.')
    } finally {
      setSalvando(false)
    }
  }

  const confirmarRemocao = async () => {
    if (!pedidoParaRemover) return
    setRemovendo(true)
    try {
      await api.delete(`/producao/compras/${pedidoParaRemover.id}`)
      carregar()
    } catch {
    } finally {
      setRemovendo(false)
      setPedidoParaRemover(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Status */}
      <div className="card flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Pedidos de Compra</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {status ? `${status.total_pedidos} pedido(s) cadastrado(s)` : 'Carregando...'}
            {status?.atualizado_em ? ` • Última atualização: ${new Date(status.atualizado_em).toLocaleString('pt-BR')}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <RefreshCw size={12} />
          {atualizado ? `Painel atualizado às ${atualizado.toLocaleTimeString('pt-BR')}` : 'Carregando...'}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <ShoppingCart size={24} className="mx-auto text-primary-500 mb-2" />
          <p className="text-2xl font-bold text-primary-600">{pedidos.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pedidos em Aberto</p>
        </div>
        <div className="card text-center">
          <p className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-200">{fmt(total)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Valor Total</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {pedidos.filter(p => String(p.data_entrega || '') < hoje).length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Atrasados</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary-500" /> Pedidos de Compra
          </h3>
          <button onClick={abrirNovo} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={14} /> Novo Pedido
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={salvar} className="bg-gray-50 border border-gray-100 dark:bg-gray-900/40 dark:border-gray-700 rounded-xl p-4 mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{editando ? `Editar pedido ${editando.numero}/${editando.item}` : 'Novo pedido de compra'}</p>
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
                <label className="label">Descrição do Produto</label>
                <input className="input" value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))} />
              </div>
              <div>
                <label className="label">Quantidade</label>
                <input type="number" className="input" min={0} value={form.quantidade} onChange={e => setForm(f => ({...f, quantidade: Number(e.target.value)}))} />
              </div>
              <div>
                <label className="label">Preço Unitário</label>
                <input type="number" step="0.01" className="input" min={0} value={form.preco_unitario} onChange={e => setForm(f => ({...f, preco_unitario: Number(e.target.value)}))} />
              </div>
              <div>
                <label className="label">Valor Total (deixe 0 para calcular)</label>
                <input type="number" step="0.01" className="input" min={0} value={form.valor_total} onChange={e => setForm(f => ({...f, valor_total: Number(e.target.value)}))} />
              </div>
              <div>
                <label className="label">Código do Fornecedor</label>
                <input className="input" value={form.fornecedor} onChange={e => setForm(f => ({...f, fornecedor: e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Nome do Fornecedor</label>
                <input className="input" value={form.nome_fornecedor} onChange={e => setForm(f => ({...f, nome_fornecedor: e.target.value}))} />
              </div>
              <div>
                <label className="label">Data de Entrega</label>
                <input type="date" className="input" value={form.data_entrega} onChange={e => setForm(f => ({...f, data_entrega: e.target.value}))} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                  <option value="Aberto">Aberto</option>
                  <option value="Atendido">Atendido</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
            {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
            <button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Pedido</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Produto</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Fornecedor</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Qtd</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Valor Total</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Entrega</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando && pedidos.length === 0 && <TabelaSkeleton linhas={5} colunas={8} />}
              {pedidos.map((p, i) => {
                const atrasado = String(p.data_entrega || '') < hoje && (p.status || '').toLowerCase() === 'aberto'
                return (
                  <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/30 ${atrasado ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <td className="py-2 px-3 font-mono text-xs">{p.numero}/{p.item}</td>
                    <td className="py-2 px-3 text-xs truncate max-w-[180px]">{p.descricao || p.produto}</td>
                    <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{p.nome_fornecedor || p.fornecedor}</td>
                    <td className="py-2 px-3 text-right">{Number(p.quantidade || 0).toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-3 text-right font-semibold">{fmt(p.valor_total)}</td>
                    <td className={`py-2 px-3 font-mono text-xs ${atrasado ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                      {String(p.data_entrega || '').replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1') || '—'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {atrasado ? <span className="badge-vermelho">Atrasado</span> : <span className="badge-amarelo">{p.status || 'Pendente'}</span>}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => abrirEdicao(p)} aria-label={`Editar pedido ${p.numero}/${p.item}`} className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded"><Edit2 size={14} /></button>
                        <button onClick={() => setPedidoParaRemover(p)} aria-label={`Remover pedido ${p.numero}/${p.item}`} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!carregando && pedidos.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum pedido cadastrado. Cadastre um novo pedido ou importe pela Administração.</p>}
        </div>
      </div>

      <ConfirmDialog
        aberto={!!pedidoParaRemover}
        onConfirmar={confirmarRemocao}
        onCancelar={() => setPedidoParaRemover(null)}
        titulo="Remover pedido de compra"
        descricao={`Tem certeza que deseja remover o pedido ${pedidoParaRemover?.numero}/${pedidoParaRemover?.item}? Esta ação não pode ser desfeita.`}
        textoConfirmar="Remover"
        carregando={removendo}
      />
    </div>
  )
}

const DEMO = []
