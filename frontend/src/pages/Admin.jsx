import { useEffect, useState } from 'react'
import api from '../services/api'
import { Users, UserPlus, Pencil, UserX, Shield, RefreshCw, Upload, AlertCircle, FileSpreadsheet } from 'lucide-react'

const SETORES = ['financeiro', 'compras', 'estoque', 'producao', 'admin', 'diretoria']

const vazio = { nome: '', email: '', matricula: '', senha: '', setor: 'financeiro', cargo: '', admin: false }

export default function Admin() {
  const [usuarios, setUsuarios] = useState([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultados, setResultados] = useState({})
  const [importando, setImportando] = useState('')
  const [tipoFinanceiro, setTipoFinanceiro] = useState('receber')

  const carregar = () => {
    api.get('/usuarios/').then(r => setUsuarios(r.data)).catch(() => setUsuarios(DEMO_USERS))
  }

  useEffect(() => { carregar() }, [])

  const abrirNovo = () => { setForm(vazio); setEditando(null); setErro(''); setModal(true) }
  const abrirEditar = (u) => {
    setForm({ nome: u.nome, email: u.email, matricula: u.matricula, senha: '', setor: u.setor, cargo: u.cargo || '', admin: u.admin })
    setEditando(u.id)
    setErro('')
    setModal(true)
  }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      if (editando) {
        const { senha, ...rest } = form
        await api.put(`/usuarios/${editando}`, rest)
      } else {
        await api.post('/usuarios/', form)
      }
      setModal(false)
      carregar()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao salvar usuário.')
    } finally {
      setSalvando(false)
    }
  }

  const desativar = async (id) => {
    if (!confirm('Desativar este usuário?')) return
    try { await api.delete(`/usuarios/${id}`); carregar() } catch {}
  }

  const handleUpload = async (chave, url, e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportando(chave)
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await api.post(url, form)
      setResultados(r => ({ ...r, [chave]: data }))
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao importar planilha.')
    } finally {
      setImportando('')
      e.target.value = ''
    }
  }

  const ativos = usuarios.filter(u => u.ativo)
  const inativos = usuarios.filter(u => !u.ativo)

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg"><Users size={20} className="text-primary-600" /></div>
          <div>
            <p className="font-bold text-gray-900">Gestão de Usuários</p>
            <p className="text-xs text-gray-500">{ativos.length} ativos · {inativos.length} inativos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar} className="btn-secondary text-sm flex items-center gap-1"><RefreshCw size={14} /> Atualizar</button>
          <button onClick={abrirNovo} className="btn-primary text-sm flex items-center gap-2"><UserPlus size={16} /> Novo Usuário</button>
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Nome</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Matrícula</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">E-mail</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Setor</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Cargo</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Perfil</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!u.ativo ? 'opacity-50' : ''}`}>
                  <td className="py-2 px-3 font-medium text-gray-800">{u.nome}</td>
                  <td className="py-2 px-3 font-mono text-xs">{u.matricula}</td>
                  <td className="py-2 px-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="py-2 px-3 capitalize">
                    <span className="badge-laranja">{u.setor}</span>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-500">{u.cargo || '—'}</td>
                  <td className="py-2 px-3 text-center">
                    {u.admin ? (
                      <span className="badge-laranja flex items-center gap-1 justify-center"><Shield size={10} /> Admin</span>
                    ) : (
                      <span className="badge-azul">Usuário</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {u.ativo ? <span className="badge-verde">Ativo</span> : <span className="badge-vermelho">Inativo</span>}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => abrirEditar(u)} className="text-gray-400 hover:text-primary-600 transition-colors" title="Editar">
                        <Pencil size={14} />
                      </button>
                      {u.ativo && (
                        <button onClick={() => desativar(u.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Desativar">
                          <UserX size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Importação de planilhas */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 rounded-lg"><FileSpreadsheet size={20} className="text-primary-600" /></div>
          <div>
            <p className="font-bold text-gray-900">Importar Planilhas (Excel)</p>
            <p className="text-xs text-gray-500">Envie arquivos .xlsx para popular rapidamente o financeiro, estoque, produção e compras</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Financeiro */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">Financeiro (Contas a Receber/Pagar)</p>
            <select className="input" value={tipoFinanceiro} onChange={e => setTipoFinanceiro(e.target.value)}>
              <option value="receber">Contas a Receber</option>
              <option value="pagar">Contas a Pagar</option>
            </select>
            <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
              <Upload size={14} />
              {importando === 'financeiro' ? 'Importando...' : 'Selecionar arquivo .xlsx'}
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => handleUpload('financeiro', `/financeiro/importar-excel?tipo=${tipoFinanceiro}`, e)}
                disabled={!!importando} />
            </label>
            {resultados.financeiro && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {resultados.financeiro.criados} título(s) importado(s) de {resultados.financeiro.total_linhas} linha(s) ({resultados.financeiro.tipo})
              </div>
            )}
          </div>

          {/* Estoque */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">Estoque (Itens)</p>
            <p className="text-xs text-gray-500">Cria ou atualiza itens com base no código do produto</p>
            <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
              <Upload size={14} />
              {importando === 'estoque' ? 'Importando...' : 'Selecionar arquivo .xlsx'}
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => handleUpload('estoque', '/estoque/importar-excel', e)}
                disabled={!!importando} />
            </label>
            {resultados.estoque && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {resultados.estoque.criados} criado(s), {resultados.estoque.atualizados} atualizado(s) de {resultados.estoque.total_linhas} linha(s)
              </div>
            )}
          </div>

          {/* Produção */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">Produção (Ordens)</p>
            <p className="text-xs text-gray-500">Cria ordens de produção a partir da planilha</p>
            <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
              <Upload size={14} />
              {importando === 'producao' ? 'Importando...' : 'Selecionar arquivo .xlsx'}
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => handleUpload('producao', '/producao/ordens/importar-excel', e)}
                disabled={!!importando} />
            </label>
            {resultados.producao && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {resultados.producao.criados} ordem(ns) importada(s) de {resultados.producao.total_linhas} linha(s)
              </div>
            )}
          </div>

          {/* Compras */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">Compras (Pedidos)</p>
            <p className="text-xs text-gray-500">Use o modelo MODELO-PLANILHA-COMPRAS.xlsx</p>
            <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
              <Upload size={14} />
              {importando === 'compras' ? 'Importando...' : 'Selecionar arquivo .xlsx'}
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => handleUpload('compras', '/producao/compras/importar-excel', e)}
                disabled={!!importando} />
            </label>
            {resultados.compras && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {resultados.compras.criados} pedido(s) importado(s) de {resultados.compras.total_linhas} linha(s)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{editando ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={salvar} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nome completo</label>
                  <input className="input" value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} required />
                </div>
                <div>
                  <label className="label">Matrícula</label>
                  <input className="input" value={form.matricula} onChange={e => setForm(f => ({...f, matricula: e.target.value}))} required disabled={!!editando} />
                </div>
                <div>
                  <label className="label">Setor</label>
                  <select className="input" value={form.setor} onChange={e => setForm(f => ({...f, setor: e.target.value}))}>
                    {SETORES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">E-mail</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
                </div>
                <div className="col-span-2">
                  <label className="label">Cargo</label>
                  <input className="input" value={form.cargo} onChange={e => setForm(f => ({...f, cargo: e.target.value}))} />
                </div>
                {!editando && (
                  <div className="col-span-2">
                    <label className="label">Senha inicial</label>
                    <input type="password" className="input" value={form.senha} onChange={e => setForm(f => ({...f, senha: e.target.value}))} required />
                  </div>
                )}
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="admin" checked={form.admin} onChange={e => setForm(f => ({...f, admin: e.target.checked}))} className="accent-primary-500" />
                  <label htmlFor="admin" className="text-sm text-gray-700 cursor-pointer">Conceder acesso de administrador</label>
                </div>
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={salvando} className="btn-primary flex-1">{salvando ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const DEMO_USERS = [
  { id: 1, nome: 'Administrador', email: 'admin@empresa.com', matricula: 'ADM001', setor: 'admin', cargo: 'Administrador', ativo: true, admin: true },
]
