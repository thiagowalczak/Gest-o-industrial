import { useState } from 'react'
import { Upload, Download, AlertCircle } from 'lucide-react'
import api from '../services/api'

export default function UploadPlanilha({ icone: Icone, titulo, descricao, urlImportar, tipoModelo, nomeModelo }) {
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')

  const baixarModelo = async () => {
    try {
      const { data } = await api.get(`/admin/modelo/${tipoModelo}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.download = nomeModelo
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setErro('Não foi possível baixar o modelo.')
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportando(true)
    setErro('')
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await api.post(urlImportar, form)
      setResultado(data)
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao importar planilha.')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        {Icone && (
          <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex-shrink-0">
            <Icone size={20} className="text-primary-600" />
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-200">{titulo}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{descricao}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-sm">
          <Upload size={14} />
          {importando ? 'Importando...' : 'Selecionar arquivo .xlsx ou .csv'}
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} disabled={importando} />
        </label>
        <button
          onClick={baixarModelo}
          className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
        >
          <Download size={14} /> Baixar modelo
        </button>
      </div>

      {erro && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{erro}</p>
      )}

      {resultado && (
        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          {resultado.criados ?? 0} registro(s) importado(s) de {resultado.total_linhas ?? 0} linha(s)
        </div>
      )}
    </div>
  )
}
