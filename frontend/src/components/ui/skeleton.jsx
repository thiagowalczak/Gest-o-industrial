import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-100 dark:bg-gray-700', className)} {...props} />
}

// Linhas de placeholder para tabelas em carregamento
export function TabelaSkeleton({ linhas = 5, colunas = 6 }) {
  return (
    <>
      {Array.from({ length: linhas }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50">
          {Array.from({ length: colunas }).map((_, j) => (
            <td key={j} className="py-2.5 px-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
