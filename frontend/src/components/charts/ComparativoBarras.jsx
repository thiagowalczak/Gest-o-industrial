import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { useTheme } from '../../context/ThemeContext'

/**
 * Gráfico de barras comparativo simples (ex: A Receber x A Pagar).
 *
 * Props:
 * - dados: [{ nome, valor, cor }]
 * - formatador?: (v) => string
 * - altura?: number
 */
export default function ComparativoBarras({ dados, formatador = (v) => v, altura = 200 }) {
  const { tema } = useTheme()
  const escuro = tema === 'dark'
  const semDados = dados.every(d => !d.valor)

  if (semDados) {
    return <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">Sem dados para exibir no período.</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={dados} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="nome" tick={{ fontSize: 12, fill: escuro ? '#94a3b8' : '#6b7280' }} axisLine={{ stroke: escuro ? '#475569' : '#e5e7eb' }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: escuro ? '#94a3b8' : '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={formatador} width={64} />
          <Tooltip
            formatter={(v) => formatador(v)}
            cursor={{ fill: escuro ? '#33415540' : '#f9fafb' }}
            contentStyle={{ borderRadius: 8, border: escuro ? '1px solid #334155' : '1px solid #f3f4f6', fontSize: 12, background: escuro ? '#1e293b' : '#fff', color: escuro ? '#e2e8f0' : '#111827' }}
            labelStyle={{ color: escuro ? '#e2e8f0' : '#111827' }}
          />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={72}>
            {dados.map((d, i) => <Cell key={i} fill={d.cor} />)}
            <LabelList dataKey="valor" position="top" formatter={formatador} style={{ fontSize: 11, fill: escuro ? '#e2e8f0' : '#374151', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Alternativa textual para leitores de tela */}
      <table className="sr-only">
        <caption>Valores do gráfico</caption>
        <tbody>
          {dados.map((d, i) => (
            <tr key={i}><th scope="row">{d.nome}</th><td>{formatador(d.valor)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
