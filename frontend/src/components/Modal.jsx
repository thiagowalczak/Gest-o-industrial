import { X } from 'lucide-react'

const TAMANHOS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

/**
 * Modal padrão (premium SaaS) usado em todo o sistema.
 *
 * Props:
 * - aberto: boolean
 * - onFechar: () => void
 * - titulo: string
 * - subtitulo?: string
 * - icone?: componente lucide-react
 * - tamanho?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 * - rodape?: ReactNode (ações do modal)
 */
export default function Modal({ aberto, onFechar, titulo, subtitulo, icone: Icone, tamanho = 'md', rodape, children }) {
  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar?.() }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full ${TAMANHOS[tamanho] || TAMANHOS.md} max-h-[90vh] flex flex-col overflow-hidden animate-[scaleIn_0.15s_ease-out]`}>
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
          {Icone && (
            <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
              <Icone size={18} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 leading-tight truncate">{titulo}</h3>
            {subtitulo && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitulo}</p>}
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5 overflow-y-auto">
          {children}
        </div>

        {/* Rodapé */}
        {rodape && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0 bg-gray-50/50">
            {rodape}
          </div>
        )}
      </div>
    </div>
  )
}
