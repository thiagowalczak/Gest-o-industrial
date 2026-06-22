import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import UploadPlanilha from '../components/UploadPlanilha'
import {
  Factory, Package, TrendingUp, ShoppingCart,
  CheckCircle2, ArrowRight, ArrowLeft, SkipForward, PartyPopper,
} from 'lucide-react'

const PASSOS = [
  { id: 'boas-vindas', label: 'Início' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'producao', label: 'Produção' },
  { id: 'compras', label: 'Compras' },
  { id: 'concluido', label: 'Concluído' },
]

export default function Onboarding() {
  const [passo, setPasso] = useState(0)
  const [concluindo, setConcluindo] = useState(false)
  const { usuario, concluirOnboarding } = useAuth()
  const navigate = useNavigate()

  const ultimo = passo === PASSOS.length - 1
  const atual = PASSOS[passo]

  const avancar = () => setPasso(p => Math.min(p + 1, PASSOS.length - 1))
  const voltar = () => setPasso(p => Math.max(p - 1, 0))

  const finalizar = async () => {
    setConcluindo(true)
    try {
      await concluirOnboarding()
      navigate('/')
    } catch {
      setConcluindo(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-500 rounded-2xl shadow-lg mb-3">
            <Factory size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Configuração inicial</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Bem-vindo(a), {usuario?.nome?.split(' ')[0]}. Vamos importar os dados que você já tem para começar.
          </p>
        </div>

        {/* Indicador de progresso */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {PASSOS.map((p, i) => (
            <div
              key={p.id}
              className={`h-1.5 rounded-full transition-all ${i === passo ? 'w-8 bg-primary-500' : i < passo ? 'w-4 bg-primary-300' : 'w-4 bg-gray-200 dark:bg-gray-700'}`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl p-6 space-y-5">
          {atual.id === 'boas-vindas' && (
            <div className="text-center py-6 space-y-3">
              <p className="text-gray-700 dark:text-gray-300">
                Você pode importar agora os dados de <strong>Estoque</strong>, <strong>Financeiro</strong>,{' '}
                <strong>Produção</strong> e <strong>Compras</strong> a partir de planilhas Excel ou CSV.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Depois disso, todo o dia a dia é alimentado direto pelo painel — você pode voltar a importar
                planilhas quando quiser pela aba Administração.
              </p>
            </div>
          )}

          {atual.id === 'estoque' && (
            <UploadPlanilha
              icone={Package}
              titulo="Estoque"
              descricao="Importe os itens já cadastrados no seu controle atual."
              urlImportar="/estoque/importar-excel"
              tipoModelo="estoque"
              nomeModelo="modelo-estoque.xlsx"
            />
          )}

          {atual.id === 'financeiro' && (
            <UploadPlanilha
              icone={TrendingUp}
              titulo="Financeiro"
              descricao="Importe contas a receber e a pagar (ou uma planilha de Fluxo de Caixa)."
              urlImportar="/financeiro/importar-excel"
              tipoModelo="financeiro"
              nomeModelo="modelo-financeiro.xlsx"
            />
          )}

          {atual.id === 'producao' && (
            <UploadPlanilha
              icone={Factory}
              titulo="Produção"
              descricao="Importe as ordens de produção em andamento."
              urlImportar="/producao/ordens/importar-excel"
              tipoModelo="producao"
              nomeModelo="modelo-producao.xlsx"
            />
          )}

          {atual.id === 'compras' && (
            <UploadPlanilha
              icone={ShoppingCart}
              titulo="Compras"
              descricao="Importe os pedidos de compra em aberto."
              urlImportar="/producao/compras/importar-excel"
              tipoModelo="compras"
              nomeModelo="modelo-compras.xlsx"
            />
          )}

          {atual.id === 'concluido' && (
            <div className="text-center py-6 space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full">
                <PartyPopper size={26} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">Tudo pronto!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                A partir de agora, você cadastra e atualiza tudo direto pelo painel. Se precisar, dá para
                importar novas planilhas a qualquer momento em Administração → Importar Planilhas.
              </p>
            </div>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <div>
              {passo > 0 && !ultimo && (
                <button onClick={voltar} className="btn-secondary text-sm flex items-center gap-1.5">
                  <ArrowLeft size={14} /> Voltar
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!ultimo && (
                <button onClick={finalizar} disabled={concluindo} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1.5 px-3 py-2">
                  <SkipForward size={14} /> Pular configuração
                </button>
              )}
              {ultimo ? (
                <button onClick={finalizar} disabled={concluindo} className="btn-primary text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} /> {concluindo ? 'Concluindo...' : 'Ir para o painel'}
                </button>
              ) : (
                <button onClick={avancar} className="btn-primary text-sm flex items-center gap-2">
                  Continuar <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
