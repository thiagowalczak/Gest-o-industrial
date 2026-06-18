import { useEffect, useState } from 'react'
import { Brain, AlertTriangle, Lightbulb, RefreshCw, Clock } from 'lucide-react'
import api from '../services/api'

const NIVEL_COR = {
  alto:  { bg: 'bg-red-50 dark:bg-red-900/20',    borda: 'border-red-200 dark:border-red-800',    texto: 'text-red-700 dark:text-red-300',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  medio: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', borda: 'border-yellow-200 dark:border-yellow-800', texto: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  baixo: { bg: 'bg-blue-50 dark:bg-blue-900/20',   borda: 'border-blue-200 dark:border-blue-800',   texto: 'text-blue-700 dark:text-blue-300',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
}

const PRIORIDADE_COR = {
  alta:  { bg: 'bg-red-50 dark:bg-red-900/20',    borda: 'border-red-200 dark:border-red-800',    texto: 'text-red-700 dark:text-red-300',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  media: { bg: 'bg-orange-50 dark:bg-orange-900/20', borda: 'border-orange-200 dark:border-orange-800', texto: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  baixa: { bg: 'bg-green-50 dark:bg-green-900/20',  borda: 'border-green-200 dark:border-green-800',  texto: 'text-green-700 dark:text-green-300',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
}

function formatarData(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AnaliseIA() {
  const [analise, setAnalise] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    api.get('/analise/ultima')
      .then(r => setAnalise(r.data.analise))
      .catch(() => setErro('Erro ao carregar análise.'))
      .finally(() => setCarregando(false))
  }, [])

  async function gerarAnalise() {
    setGerando(true)
    setErro(null)
    try {
      const r = await api.post('/analise/gerar')
      setAnalise(r.data.analise)
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Erro ao gerar análise. Tente novamente.'
      setErro(msg)
    } finally {
      setGerando(false)
    }
  }

  const resultado = analise?.resultado

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <Brain size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Análise Inteligente</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Diagnóstico gerado por IA com base nos seus dados</p>
          </div>
        </div>
        <button
          onClick={gerarAnalise}
          disabled={gerando}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={gerando ? 'animate-spin' : ''} />
          {gerando ? 'Analisando...' : 'Gerar análise'}
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          {erro}
        </div>
      )}

      {/* Loading inicial */}
      {carregando && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Loading geração */}
      {gerando && (
        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Analisando dados de todos os módulos...</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Isso pode levar alguns segundos.</p>
        </div>
      )}

      {/* Sem análise */}
      {!carregando && !gerando && !resultado && !erro && (
        <div className="p-12 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <Brain size={28} className="text-gray-400 dark:text-gray-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">Nenhuma análise gerada ainda</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Clique em "Gerar análise" para obter um diagnóstico completo da sua empresa.</p>
          </div>
        </div>
      )}

      {/* Resultado */}
      {!gerando && resultado && (
        <div className="space-y-5">
          {/* Data */}
          {analise.criado_em && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <Clock size={13} />
              <span>Análise gerada em {formatarData(analise.criado_em)}</span>
            </div>
          )}

          {/* Resumo Geral */}
          <div className="p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Brain size={16} className="text-primary-500" />
              Resumo Geral
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{resultado.resumo_geral}</p>
          </div>

          {/* Alertas */}
          {resultado.alertas?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  Alertas ({resultado.alertas.length})
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {resultado.alertas.map((a, i) => {
                  const cor = NIVEL_COR[a.nivel] || NIVEL_COR.baixo
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${cor.bg} ${cor.borda}`}>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${cor.badge}`}>
                        {a.nivel}
                      </span>
                      <p className={`text-sm ${cor.texto}`}>{a.texto}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recomendações */}
          {resultado.recomendacoes?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Lightbulb size={16} className="text-yellow-500" />
                  Recomendações ({resultado.recomendacoes.length})
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {resultado.recomendacoes.map((r, i) => {
                  const cor = PRIORIDADE_COR[r.prioridade] || PRIORIDADE_COR.baixa
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${cor.bg} ${cor.borda}`}>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${cor.badge}`}>
                        {r.prioridade}
                      </span>
                      <p className={`text-sm ${cor.texto}`}>{r.texto}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
