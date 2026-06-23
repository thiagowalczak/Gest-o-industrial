import { useEffect, useState } from 'react'
import api from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import { Building2, RefreshCw, Power, PowerOff } from 'lucide-react'

const PLANOS = ['trial', 'basico', 'pro']

export default function Clientes() {
  const [empresas, setEmpresas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvandoId, setSalvandoId] = useState(null)
  const [empresaParaDesativar, setEmpresaParaDesativar] = useState(null)
  const [desativando, setDesativando] = useState(false)

  const carregar = () => {
    setCarregando(true)
    api.get('/empresa/todas').then(r => setEmpresas(r.data)).catch(() => setEmpresas([])).finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  const alterarPlano = async (empresa, novoPlano) => {
    setSalvandoId(empresa.id)
    try {
      const { data } = await api.put(`/empresa/${empresa.id}/gerenciar`, { plano: novoPlano })
      setEmpresas(lista => lista.map(e => e.id === data.id ? data : e))
    } catch {
      alert('Não foi possível alterar o plano.')
    } finally {
      setSalvandoId(null)
    }
  }

  const alternarAtivo = async (empresa) => {
    setSalvandoId(empresa.id)
    try {
      const { data } = await api.put(`/empresa/${empresa.id}/gerenciar`, { ativo: !empresa.ativo })
      setEmpresas(lista => lista.map(e => e.id === data.id ? data : e))
    } catch {
      alert('Não foi possível alterar o status.')
    } finally {
      setSalvandoId(null)
      setEmpresaParaDesativar(null)
    }
  }

  const confirmarDesativacao = () => {
    if (!empresaParaDesativar) return
    setDesativando(true)
    alternarAtivo(empresaParaDesativar).finally(() => setDesativando(false))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg"><Building2 size={20} className="text-primary-600" /></div>
        <div>
          <p className="font-bold text-gray-900 dark:text-gray-100">Clientes (Empresas)</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Controle de plano e acesso de cada empresa cliente</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{empresas.length} empresa(s) cadastrada(s)</p>
          <button onClick={carregar} className="btn-secondary text-sm flex items-center gap-1"><RefreshCw size={14} /> Atualizar</button>
        </div>

        {carregando ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">Carregando...</p>
        ) : empresas.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">Nenhuma empresa cadastrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Empresa</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">CNPJ</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Funcionários</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Plano</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Cliente desde</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Ação</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map(emp => (
                  <tr key={emp.id} className={`border-b border-gray-50 hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/30 ${!emp.ativo ? 'opacity-60' : ''}`}>
                    <td className="py-2 px-3 font-medium text-gray-800 dark:text-gray-200">{emp.nome}</td>
                    <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">{emp.cnpj || '—'}</td>
                    <td className="py-2 px-3 text-center">{emp.total_funcionarios}</td>
                    <td className="py-2 px-3 text-center">
                      <select
                        className="input py-1 text-sm capitalize"
                        value={emp.plano}
                        disabled={salvandoId === emp.id}
                        onChange={e => alterarPlano(emp, e.target.value)}
                      >
                        {PLANOS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {emp.ativo ? <span className="badge-verde">Ativa</span> : <span className="badge-vermelho">Inativa</span>}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">
                      {emp.criado_em ? new Date(emp.criado_em).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {emp.ativo ? (
                        <button
                          onClick={() => setEmpresaParaDesativar(emp)}
                          disabled={salvandoId === emp.id}
                          title="Desativar empresa"
                          aria-label={`Desativar empresa ${emp.nome}`}
                          className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <PowerOff size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => alternarAtivo(emp)}
                          disabled={salvandoId === emp.id}
                          title="Reativar empresa"
                          aria-label={`Reativar empresa ${emp.nome}`}
                          className="text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                          <Power size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        aberto={!!empresaParaDesativar}
        onConfirmar={confirmarDesativacao}
        onCancelar={() => setEmpresaParaDesativar(null)}
        titulo="Desativar empresa"
        descricao={`Tem certeza que deseja desativar "${empresaParaDesativar?.nome}"? Todos os usuários dessa empresa perderão acesso ao sistema imediatamente.`}
        textoConfirmar="Desativar"
        carregando={desativando}
      />
    </div>
  )
}
