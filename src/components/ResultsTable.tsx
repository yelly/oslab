import type { SampleResult } from '../lib/processor'

export interface ResultRow {
  depth: number | null
  result: SampleResult
  isAveraged: boolean
}

interface Props {
  rows: ResultRow[]
}

function fmt(v: number, decimals = 1): string {
  return isFinite(v) ? v.toFixed(decimals) : '-'
}

function Cell({ vwe, decimals = 1 }: { vwe: { value: number; error: number }; decimals?: number }) {
  return (
    <td className="px-3 py-2 text-right text-sm tabular-nums">
      {fmt(vwe.value, decimals)}{' '}
      <span className="text-gray-400 text-xs">± {fmt(vwe.error, decimals)}</span>
    </td>
  )
}

export function ResultsTable({ rows }: Props) {
  const sorted = [...rows].sort((a, b) => (a.depth ?? Infinity) - (b.depth ?? Infinity))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
              Sample
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-600">Depth (cm)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
              IRSL Net
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
              IRSL Front
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
              IRSL Depl.
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
              OSL Net
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
              OSL Front
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
              OSL Depl.
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">
              IRSL/OSL
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-gray-100 ${row.isAveraged ? '' : 'bg-yellow-50'}`}
            >
              <td className="px-3 py-2 font-mono text-xs text-gray-700">{row.result.label}</td>
              <td className="px-3 py-2 text-right text-gray-700">{row.depth ?? '—'}</td>
              <Cell vwe={row.result.irslNet} />
              <Cell vwe={row.result.irslFront} />
              <Cell vwe={row.result.irslDepletion} decimals={3} />
              <Cell vwe={row.result.oslNet} />
              <Cell vwe={row.result.oslFront} />
              <Cell vwe={row.result.oslDepletion} decimals={3} />
              <Cell vwe={row.result.irslOsl} decimals={4} />
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.some((r) => !r.isAveraged) && (
        <p className="text-xs text-amber-700 mt-2 mb-2 px-3">Yellow rows: single samples</p>
      )}
    </div>
  )
}
