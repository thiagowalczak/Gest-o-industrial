import { AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from './ui/dialog'

/**
 * Diálogo de confirmação acessível (substitui window.confirm()).
 *
 * Props:
 * - aberto: boolean
 * - onConfirmar: () => void
 * - onCancelar: () => void
 * - titulo: string
 * - descricao: string
 * - textoConfirmar?: string
 * - variante?: 'perigo' | 'padrao'
 * - carregando?: boolean
 */
export default function ConfirmDialog({
  aberto, onConfirmar, onCancelar, titulo, descricao,
  textoConfirmar = 'Confirmar', variante = 'perigo', carregando = false,
}) {
  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onCancelar?.() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              variante === 'perigo' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
            }`}>
              <AlertTriangle size={18} />
            </div>
            <DialogTitle>{titulo}</DialogTitle>
          </div>
          {descricao && <DialogDescription className="pt-1">{descricao}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <button type="button" onClick={onCancelar} className="btn-secondary" disabled={carregando}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={carregando}
            className={variante === 'perigo' ? 'btn-danger' : 'btn-primary'}
          >
            {carregando ? 'Aguarde...' : textoConfirmar}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
