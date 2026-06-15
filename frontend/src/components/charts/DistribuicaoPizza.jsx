import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useTheme } from '../../context/ThemeContext'

/**
 * Gráfico de pizza/rosca para distribuição por categoria (ex: ordens por situação).
 *
 * Props:
 * - dados: [{ nome, valor, cor }]
 * - formatador?: (v) => string
 * - altura?: number
 */
export default function DistribuicaoPizza({ dados, formatador = (v) => v, altura = 220 }) {
  const { tema } = useTheme()
  const escuro = tema === 'dark'
  const total = dados.reduce((s, d) => s + (d.valor || 0), 0)

  if (total === 0) {
    return <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">Sem dados para exibir.</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={altura}>
        <PieChart>
          <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
            {dados.map((d, i) => <Cell key={i} fill={d.cor} />)}
          </Pie>
          <Tooltip
            formatter={(v) => formatador(v)}
            contentStyle={{ borderRadius: 8, border: escuro ? '1px solid #334155' : '1px solid #f3f4f6', fontSize: 12, background: escuro ? '#1e293b' : '#fff', color: escuro ? '#e2e8f0' : '#111827' }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, color: escuro ? '#cbd5e1' : '#374151' }} />
        </PieChart>
      </ResponsiveContainer>
      {/* Alternativa textual para leitores de tela */}
      <table className="sr-only">
        <caption>Distribuição</caption>
        <tbody>
          {dados.map((d, i) => (
            <tr key={i}><th scope="row">{d.nome}</th><td>{formatador(d.valor)} ({total ? Math.round((d.valor || 0) / total * 100) : 0}%)</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
