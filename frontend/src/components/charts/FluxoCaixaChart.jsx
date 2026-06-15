import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useTheme } from '../../context/ThemeContext'

/**
 * Gráfico de área para projeção de fluxo de caixa (entradas x saídas por período).
 *
 * Props:
 * - dados: [{ periodo, entradas, saidas }]
 * - formatador?: (v) => string
 */
export default function FluxoCaixaChart({ dados, formatador = (v) => v }) {
  const { tema } = useTheme()
  const escuro = tema === 'dark'
  const semDados = dados.every(d => !d.entradas && !d.saidas)

  if (semDados) {
    return <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">Sem títulos previstos para o período.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={dados} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={escuro ? '#334155' : '#f3f4f6'} />
        <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: escuro ? '#94a3b8' : '#6b7280' }} axisLine={{ stroke: escuro ? '#475569' : '#e5e7eb' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: escuro ? '#94a3b8' : '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={formatador} width={64} />
        <Tooltip
          formatter={(v) => formatador(v)}
          contentStyle={{ borderRadius: 8, border: escuro ? '1px solid #334155' : '1px solid #f3f4f6', fontSize: 12, background: escuro ? '#1e293b' : '#fff', color: escuro ? '#e2e8f0' : '#111827' }}
          labelStyle={{ color: escuro ? '#e2e8f0' : '#111827' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: escuro ? '#cbd5e1' : '#374151' }} />
        <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#22c55e" fill="url(#gradEntradas)" strokeWidth={2} />
        <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#ef4444" fill="url(#gradSaidas)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
