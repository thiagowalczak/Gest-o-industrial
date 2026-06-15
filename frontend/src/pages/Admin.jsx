import { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { Users, UserPlus, Pencil, UserX, UserCheck, Shield, RefreshCw, Upload, AlertCircle, FileSpreadsheet, FileDown, Download, Building2, Save, PlusCircle } from 'lucide-react'

const SETORES = ['financeiro', 'compras', 'estoque', 'producao', 'admin', 'diretoria']
const PLANOS = ['trial', 'basico', 'pro']

const vazio = { nome: '', email: '', matricula: '', senha: '', setor: 'financeiro', cargo: '', admin: false }
const empresaVazia = { nome: '', cnpj: '' }
const novaEmpresaVazia = {
  nome: '', cnpj: '', plano: 'trial',
  admin_nome: '', admin_email: '', admin_matricula: '', admin_cargo: '', admin_senha: '',
}

export default function Admin() {
  const [aba, setAba] = useState('empresa')

  const [usuarios, setUsuarios] = useState([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultados, setResultados] = useState({})
  const [importando, setImportando] = useState('')
  const [tipoFinanceiro, setTipoFinanceiro] = useState('receber')
  const [tipoExportFinanceiro, setTipoExportFinanceiro] = useState('receber')
  const [exportando, setExportando] = useState('')
  const [usuarioParaBloquear, setUsuarioParaBloquear] = useState(null)
  const [bloqueando, setBloqueando] = useState(false)

  const [empresa, setEmpresa] = useState(null)
  const [formEmpresa, setFormEmpresa] = useState(empresaVazia)
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false)
  const [erroEmpresa, setErroEmpresa] = useState('')
  const [msgEmpresa, setMsgEmpresa] = useState('')

  const [formNovaEmpresa, setFormNovaEmpresa] = useState(novaEmpresaVazia)
  const [salvandoNovaEmpresa, setSalvandoNovaEmpresa] = useState(false)
  const [erroNovaEmpresa, setErroNovaEmpresa] = useState('')
  const [msgNovaEmpresa, setMsgNovaEmpresa] = useState('')

  const carregar = () => {
    api.get('/usuarios/').then(r => setUsuarios(r.data)).catch(() => setUsuarios(DEMO_USERS))
  }

  const carregarEmpresa = () => {
    api.get('/empresa/').then(r => {
      setEmpresa(r.data)
      setFormEmpresa({ nome: r.data.nome || '', cnpj: r.data.cnpj || '' })
    }).catch(() => {})
  }

  useEffect(() => { carregar(); carregarEmpresa() }, [])

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

  const salvarEmpresa = async (e) => {
    e.preventDefault()
    setSalvandoEmpresa(true)
    setErroEmpresa('')
    setMsgEmpresa('')
    try {
      const { data } = await api.put('/empresa/', formEmpresa)
      setEmpresa(data)
      setMsgEmpresa('Dados da empresa atualizados com sucesso.')
    } catch (err) {
      setErroEmpresa(err.response?.data?.detail || 'Erro ao salvar dados da empresa.')
    } finally {
      setSalvandoEmpresa(false)
    }
  }

  const salvarNovaEmpresa = async (e) => {
    e.preventDefault()
    setSalvandoNovaEmpresa(true)
    setErroNovaEmpresa('')
    setMsgNovaEmpresa('')
    try {
      const { data } = await api.post('/empresa/', formNovaEmpresa)
      setMsgNovaEmpresa(`Empresa "${data.nome}" cadastrada com sucesso. Use o e-mail "${formNovaEmpresa.admin_email}" para fazer login como administrador dessa empresa.`)
      setFormNovaEmpresa(novaEmpresaVazia)
    } catch (err) {
      setErroNovaEmpresa(err.response?.data?.detail || 'Erro ao cadastrar nova empresa.')
    } finally {
      setSalvandoNovaEmpresa(false)
    }
  }

  const confirmarBloqueio = async () => {
    if (!usuarioParaBloquear) return
    setBloqueando(true)
    try {
      await api.delete(`/usuarios/${usuarioParaBloquear.id}`)
      carregar()
    } catch {
    } finally {
      setBloqueando(false)
      setUsuarioParaBloquear(null)
    }
  }

  const reativar = async (id) => {
    try { await api.post(`/usuarios/${id}/reativar`); carregar() } catch {}
  }

  const baixarModelo = async (tipo, nomeArquivo) => {
    try {
      const { data } = await api.get(`/admin/modelo/${tipo}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Não foi possível baixar o modelo.')
    }
  }

  const exportarCsv = async (chave, url, nomeArquivo) => {
    setExportando(chave)
    try {
      const { data } = await api.get(url, { responseType: 'blob' })
      const blobUrl = window.URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      alert('Não foi possível exportar a planilha.')
    } finally {
      setExportando('')
    }
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
      {/* Cabeçalho da página */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg"><Shield size={20} className="text-primary-600" /></div>
        <div>
          <p className="font-bold text-gray-900 dark:text-gray-100">Administração</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Empresa, equipe e importação de dados</p>
        </div>
      </div>

      <div className="card">
        {/* Abas */}
        <div className="flex gap-1 mb-4 border-b border-gray-100 dark:border-gray-700 pb-3 flex-wrap">
          {[['empresa', 'Empresa'], ['nova-empresa', 'Nova Empresa'], ['funcionarios', `Funcionários (${ativos.length})`], ['importar', 'Importar Planilhas'], ['exportar', 'Exportar Planilhas']].map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)} aria-pressed={aba === id}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                aba === id ? 'bg-primary-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Aba Empresa */}
        {aba === 'empresa' && (
          <form onSubmit={salvarEmpresa} className="max-w-2xl space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg"><Building2 size={20} className="text-primary-600" /></div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">Dados da Empresa</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Informações cadastrais da sua empresa</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nome / Razão social</label>
                <input className="input" value={formEmpresa.nome} onChange={e => setFormEmpresa(f => ({...f, nome: e.target.value}))} required />
              </div>
              <div>
                <label className="label">CNPJ</label>
                <input className="input" value={formEmpresa.cnpj} onChange={e => setFormEmpresa(f => ({...f, cnpj: e.target.value}))} placeholder="00.000.000/0000-00" />
              </div>
            </div>

            {empresa && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Plano</p>
                  <span className="badge-laranja capitalize mt-1 inline-block">{empresa.plano}</span>
                </div>
                <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Funcionários ativos</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mt-1">{empresa.total_funcionarios}</p>
                </div>
                <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cliente desde</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {empresa.criado_em ? new Date(empresa.criado_em).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
              </div>
            )}

            {erroEmpresa && <p className="text-sm text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 px-3 py-2 rounded-lg">{erroEmpresa}</p>}
            {msgEmpresa && <p className="text-sm text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20 px-3 py-2 rounded-lg">{msgEmpresa}</p>}

            <button type="submit" className="btn-primary flex items-center gap-2" disabled={salvandoEmpresa}>
              <Save size={16} /> {salvandoEmpresa ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        )}

        {/* Aba Nova Empresa */}
        {aba === 'nova-empresa' && (
          <form onSubmit={salvarNovaEmpresa} className="max-w-2xl space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg"><PlusCircle size={20} className="text-primary-600" /></div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">Cadastrar Nova Empresa</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cria uma nova empresa e o usuário administrador inicial dela</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nome / Razão social *</label>
                <input className="input" value={formNovaEmpresa.nome} onChange={e => setFormNovaEmpresa(f => ({...f, nome: e.target.value}))} required />
              </div>
              <div>
                <label className="label">CNPJ</label>
                <input className="input" value={formNovaEmpresa.cnpj} onChange={e => setFormNovaEmpresa(f => ({...f, cnpj: e.target.value}))} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className="label">Plano</label>
                <select className="input" value={formNovaEmpresa.plano} onChange={e => setFormNovaEmpresa(f => ({...f, plano: e.target.value}))}>
                  {PLANOS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Administrador inicial</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nome completo *</label>
                  <input className="input" value={formNovaEmpresa.admin_nome} onChange={e => setFormNovaEmpresa(f => ({...f, admin_nome: e.target.value}))} required />
                </div>
                <div>
                  <label className="label">Matrícula *</label>
                  <input className="input" value={formNovaEmpresa.admin_matricula} onChange={e => setFormNovaEmpresa(f => ({...f, admin_matricula: e.target.value}))} required />
                </div>
                <div>
                  <label className="label">Cargo</label>
                  <input className="input" value={formNovaEmpresa.admin_cargo} onChange={e => setFormNovaEmpresa(f => ({...f, admin_cargo: e.target.value}))} />
                </div>
                <div className="col-span-2">
                  <label className="label">E-mail *</label>
                  <input type="email" className="input" value={formNovaEmpresa.admin_email} onChange={e => setFormNovaEmpresa(f => ({...f, admin_email: e.target.value}))} required />
                </div>
                <div className="col-span-2">
                  <label className="label">Senha inicial *</label>
                  <input type="password" className="input" value={formNovaEmpresa.admin_senha} onChange={e => setFormNovaEmpresa(f => ({...f, admin_senha: e.target.value}))} required />
                </div>
              </div>
            </div>

            {erroNovaEmpresa && <p className="text-sm text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 px-3 py-2 rounded-lg">{erroNovaEmpresa}</p>}
            {msgNovaEmpresa && <p className="text-sm text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20 px-3 py-2 rounded-lg">{msgNovaEmpresa}</p>}

            <button type="submit" className="btn-primary flex items-center gap-2" disabled={salvandoNovaEmpresa}>
              <PlusCircle size={16} /> {salvandoNovaEmpresa ? 'Cadastrando...' : 'Cadastrar empresa'}
            </button>
          </form>
        )}

        {/* Aba Funcionários */}
        {aba === 'funcionarios' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg"><Users size={20} className="text-primary-600" /></div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">Gestão de Usuários</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{ativos.length} ativos · {inativos.length} inativos</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={carregar} className="btn-secondary text-sm flex items-center gap-1"><RefreshCw size={14} /> Atualizar</button>
                <button onClick={abrirNovo} className="btn-primary text-sm flex items-center gap-2"><UserPlus size={16} /> Novo Usuário</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Nome</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Matrícula</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">E-mail</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Setor</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Cargo</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Perfil</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/30 ${!u.ativo ? 'opacity-50' : ''}`}>
                      <td className="py-2 px-3 font-medium text-gray-800 dark:text-gray-200">{u.nome}</td>
                      <td className="py-2 px-3 font-mono text-xs">{u.matricula}</td>
                      <td className="py-2 px-3 text-gray-500 dark:text-gray-400 text-xs">{u.email}</td>
                      <td className="py-2 px-3 capitalize">
                        <span className="badge-laranja">{u.setor}</span>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">{u.cargo || '—'}</td>
                      <td className="py-2 px-3 text-center">
                        {u.admin ? (
                          <span className="badge-laranja flex items-center gap-1 justify-center"><Shield size={10} /> Admin</span>
                        ) : (
                          <span className="badge-azul">Usuário</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {u.ativo ? <span className="badge-verde">Ativo</span> : <span className="badge-vermelho">Bloqueado</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => abrirEditar(u)} className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded" title="Editar" aria-label={`Editar usuário ${u.nome}`}>
                            <Pencil size={14} />
                          </button>
                          {u.ativo ? (
                            <button onClick={() => setUsuarioParaBloquear(u)} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded" title="Bloquear acesso" aria-label={`Bloquear acesso de ${u.nome}`}>
                              <UserX size={14} />
                            </button>
                          ) : (
                            <button onClick={() => reativar(u.id)} className="text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 rounded" title="Liberar acesso" aria-label={`Liberar acesso de ${u.nome}`}>
                              <UserCheck size={14} />
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
        )}

        {/* Aba Importar Planilhas */}
        {aba === 'importar' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg"><FileSpreadsheet size={20} className="text-primary-600" /></div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">Importar Planilhas (Excel)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Envie arquivos .xlsx para popular rapidamente o financeiro, estoque, produção e compras</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Financeiro */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Financeiro (Contas a Receber/Pagar)</p>
                <select className="input" value={tipoFinanceiro} onChange={e => setTipoFinanceiro(e.target.value)}>
                  <option value="receber">Contas a Receber</option>
                  <option value="pagar">Contas a Pagar</option>
                </select>
                <div className="flex flex-wrap gap-2">
                  <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
                    <Upload size={14} />
                    {importando === 'financeiro' ? 'Importando...' : 'Selecionar arquivo .xlsx ou .csv'}
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => handleUpload('financeiro', `/financeiro/importar-excel?tipo=${tipoFinanceiro}`, e)}
                      disabled={!!importando} />
                  </label>
                  <button onClick={() => baixarModelo('financeiro', 'modelo-financeiro.xlsx')}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                    <Download size={14} /> Baixar modelo
                  </button>
                </div>
                {resultados.financeiro && (
                  <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                    <AlertCircle size={14} />
                    {resultados.financeiro.criados} título(s) importado(s) de {resultados.financeiro.total_linhas} linha(s) ({resultados.financeiro.tipo})
                  </div>
                )}
              </div>

              {/* Estoque */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Estoque (Itens)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cria ou atualiza itens com base no código do produto</p>
                <div className="flex flex-wrap gap-2">
                  <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
                    <Upload size={14} />
                    {importando === 'estoque' ? 'Importando...' : 'Selecionar arquivo .xlsx ou .csv'}
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => handleUpload('estoque', '/estoque/importar-excel', e)}
                      disabled={!!importando} />
                  </label>
                  <button onClick={() => baixarModelo('estoque', 'modelo-estoque.xlsx')}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                    <Download size={14} /> Baixar modelo
                  </button>
                </div>
                {resultados.estoque && (
                  <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                    <AlertCircle size={14} />
                    {resultados.estoque.criados} criado(s), {resultados.estoque.atualizados} atualizado(s) de {resultados.estoque.total_linhas} linha(s)
                  </div>
                )}
              </div>

              {/* Produção */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Produção (Ordens)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cria ordens de produção a partir da planilha</p>
                <div className="flex flex-wrap gap-2">
                  <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
                    <Upload size={14} />
                    {importando === 'producao' ? 'Importando...' : 'Selecionar arquivo .xlsx ou .csv'}
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => handleUpload('producao', '/producao/ordens/importar-excel', e)}
                      disabled={!!importando} />
                  </label>
                  <button onClick={() => baixarModelo('producao', 'modelo-producao.xlsx')}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                    <Download size={14} /> Baixar modelo
                  </button>
                </div>
                {resultados.producao && (
                  <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                    <AlertCircle size={14} />
                    {resultados.producao.criados} ordem(ns) importada(s) de {resultados.producao.total_linhas} linha(s)
                  </div>
                )}
              </div>

              {/* Compras */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Compras (Pedidos)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cria pedidos de compra a partir da planilha (também atualiza estoque e contas a pagar)</p>
                <div className="flex flex-wrap gap-2">
                  <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
                    <Upload size={14} />
                    {importando === 'compras' ? 'Importando...' : 'Selecionar arquivo .xlsx ou .csv'}
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => handleUpload('compras', '/producao/compras/importar-excel', e)}
                      disabled={!!importando} />
                  </label>
                  <button onClick={() => baixarModelo('compras', 'modelo-compras.xlsx')}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                    <Download size={14} /> Baixar modelo
                  </button>
                </div>
                {resultados.compras && (
                  <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                    <AlertCircle size={14} />
                    {resultados.compras.criados} pedido(s) importado(s) de {resultados.compras.total_linhas} linha(s)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Aba Exportar Planilhas */}
        {aba === 'exportar' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg"><FileDown size={20} className="text-primary-600" /></div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">Exportar Planilhas (CSV)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Baixe os dados atuais do financeiro, estoque, produção e compras em formato .csv</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Financeiro */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Financeiro (Contas a Receber/Pagar)</p>
                <select className="input" value={tipoExportFinanceiro} onChange={e => setTipoExportFinanceiro(e.target.value)}>
                  <option value="receber">Contas a Receber</option>
                  <option value="pagar">Contas a Pagar</option>
                </select>
                <button
                  onClick={() => exportarCsv('financeiro', `/admin/exportar/financeiro?tipo=${tipoExportFinanceiro}`, `financeiro-${tipoExportFinanceiro}.csv`)}
                  disabled={!!exportando}
                  className="btn-secondary text-sm flex items-center gap-2">
                  <Download size={14} /> {exportando === 'financeiro' ? 'Exportando...' : 'Exportar CSV'}
                </button>
              </div>

              {/* Estoque */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Estoque (Itens)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Exporta todos os itens cadastrados no estoque</p>
                <button
                  onClick={() => exportarCsv('estoque', '/admin/exportar/estoque', 'estoque.csv')}
                  disabled={!!exportando}
                  className="btn-secondary text-sm flex items-center gap-2">
                  <Download size={14} /> {exportando === 'estoque' ? 'Exportando...' : 'Exportar CSV'}
                </button>
              </div>

              {/* Produção */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Produção (Ordens)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Exporta todas as ordens de produção cadastradas</p>
                <button
                  onClick={() => exportarCsv('producao', '/admin/exportar/producao', 'producao.csv')}
                  disabled={!!exportando}
                  className="btn-secondary text-sm flex items-center gap-2">
                  <Download size={14} /> {exportando === 'producao' ? 'Exportando...' : 'Exportar CSV'}
                </button>
              </div>

              {/* Compras */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Compras (Pedidos)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Exporta todos os pedidos de compra cadastrados</p>
                <button
                  onClick={() => exportarCsv('compras', '/admin/exportar/compras', 'compras.csv')}
                  disabled={!!exportando}
                  className="btn-secondary text-sm flex items-center gap-2">
                  <Download size={14} /> {exportando === 'compras' ? 'Exportando...' : 'Exportar CSV'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        aberto={modal}
        onFechar={() => setModal(false)}
        titulo={editando ? 'Editar Usuário' : 'Novo Usuário'}
        subtitulo={editando ? 'Atualize os dados e o setor de acesso' : 'Cadastre um novo membro da equipe'}
        icone={editando ? Pencil : UserPlus}
        rodape={
          <>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" form="form-usuario" disabled={salvando} className="btn-primary">{salvando ? 'Salvando...' : 'Salvar'}</button>
          </>
        }
      >
        <form id="form-usuario" onSubmit={salvar} className="space-y-4">
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
                  <label htmlFor="admin" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">Conceder acesso de administrador</label>
                </div>
              </div>
          {erro && <p className="text-sm text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 px-3 py-2 rounded-lg">{erro}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        aberto={!!usuarioParaBloquear}
        onConfirmar={confirmarBloqueio}
        onCancelar={() => setUsuarioParaBloquear(null)}
        titulo="Bloquear acesso do usuário"
        descricao={`Tem certeza que deseja bloquear o acesso de "${usuarioParaBloquear?.nome}"? O usuário não conseguirá mais fazer login até ser reativado.`}
        textoConfirmar="Bloquear"
        carregando={bloqueando}
      />
    </div>
  )
}

const DEMO_USERS = [
  { id: 1, nome: 'Administrador', email: 'admin@empresa.com', matricula: 'ADM001', setor: 'admin', cargo: 'Administrador', ativo: true, admin: true },
]
