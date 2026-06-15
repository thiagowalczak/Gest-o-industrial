import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const TAMANHOS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

const SELETOR_FOCAVEL = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

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
  const tituloId = useId()
  const dialogRef = useRef(null)
  const gatilhoRef = useRef(null)

  // Foco inicial + retorno do foco ao elemento que abriu o modal
  useEffect(() => {
    if (!aberto) return
    gatilhoRef.current = document.activeElement
    const primeiro = dialogRef.current?.querySelector(SELETOR_FOCAVEL)
    primeiro?.focus()
    return () => {
      gatilhoRef.current?.focus?.()
    }
  }, [aberto])

  // Escape para fechar + Tab/Shift+Tab presos dentro do modal
  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e) => {
      if (e.key === 'Escape') {
        onFechar?.()
        return
      }
      if (e.key !== 'Tab') return
      const focaveis = dialogRef.current?.querySelectorAll(SELETOR_FOCAVEL)
      if (!focaveis || focaveis.length === 0) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar?.() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={`bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full ${TAMANHOS[tamanho] || TAMANHOS.md} max-h-[90vh] flex flex-col overflow-hidden animate-[scaleIn_0.15s_ease-out] dark:bg-gray-800 dark:ring-white/10`}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0 dark:border-gray-700">
          {Icone && (
            <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0 dark:bg-primary-900/40 dark:text-primary-400">
              <Icone size={18} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 id={tituloId} className="font-bold text-gray-900 leading-tight truncate dark:text-gray-100">{titulo}</h3>
            {subtitulo && <p className="text-xs text-gray-500 mt-0.5 truncate dark:text-gray-400">{subtitulo}</p>}
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
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
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/30">
            {rodape}
          </div>
        )}
      </div>
    </div>
  )
}
