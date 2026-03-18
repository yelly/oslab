import { useState } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ErrorBar,
  ResponsiveContainer,
  Label,
} from 'recharts'
import type { SampleResult } from '../lib/processor'

export interface PlotRow {
  depth: number
  result: SampleResult
}

interface Props {
  rows: PlotRow[]
}

type MetricKey =
  | 'irslNet'
  | 'irslFront'
  | 'irslDepletion'
  | 'oslNet'
  | 'oslFront'
  | 'oslDepletion'
  | 'irslOsl'

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'irslNet', label: 'IRSL Net' },
  { key: 'irslFront', label: 'IRSL Front' },
  { key: 'irslDepletion', label: 'IRSL Depletion' },
  { key: 'oslNet', label: 'OSL Net' },
  { key: 'oslFront', label: 'OSL Front' },
  { key: 'oslDepletion', label: 'OSL Depletion' },
  { key: 'irslOsl', label: 'IRSL/OSL' },
]

interface PlotPoint {
  depth: number
  value: number
  errorX: number
  label: string
}

export function DepthPlot({ rows }: Props) {
  const [metric, setMetric] = useState<MetricKey>('oslNet')

  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? metric

  const data: PlotPoint[] = rows
    .filter((r) => isFinite(r.result[metric].value))
    .map((r) => ({
      depth: r.depth,
      value: r.result[metric].value,
      errorX: r.result[metric].error,
      label: r.result.label,
    }))
    .sort((a, b) => a.depth - b.depth)

  const depths = data.map((d) => d.depth)
  const minDepth = Math.min(...depths)
  const maxDepth = Math.max(...depths)

  // Pick a round interval that gives ~5–8 ticks
  const range = maxDepth - minDepth || 1
  const rawInterval = range / 6
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)))
  const interval = Math.ceil(rawInterval / magnitude) * magnitude

  const tickMin = Math.floor(minDepth / interval) * interval
  const tickMax = Math.ceil(maxDepth / interval) * interval
  const depthTicks: number[] = []
  for (let t = tickMin; t <= tickMax; t += interval) depthTicks.push(t)

  const pad = interval * 0.5
  const depthDomain: [number, number] = [tickMin - pad, tickMax + pad]

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700">Metric:</label>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as MetricKey)}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {data.length === 0 ? (
        <p className="text-gray-400 text-sm">No valid data to plot for this metric.</p>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart layout="vertical" margin={{ top: 10, right: 30, bottom: 30, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" dataKey="value" name={metricLabel} domain={['auto', 'auto']}>
              <Label value={metricLabel} offset={-10} position="insideBottom" />
            </XAxis>
            <YAxis
              type="number"
              dataKey="depth"
              name="Depth"
              domain={depthDomain}
              ticks={depthTicks}
            >
              <Label value="Depth (cm)" angle={-90} position="insideLeft" offset={10} />
            </YAxis>
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload?.length) return null
                const p = payload[0].payload as PlotPoint
                return (
                  <div className="bg-white border border-gray-200 rounded shadow-sm p-2 text-xs">
                    <p className="font-medium">{p.label}</p>
                    <p>Depth: {p.depth} cm</p>
                    <p>
                      {metricLabel}: {p.value.toFixed(4)} ± {p.errorX.toFixed(4)}
                    </p>
                  </div>
                )
              }}
            />
            <Scatter data={data} dataKey="value" fill="#6366f1">
              <ErrorBar dataKey="errorX" direction="x" stroke="#6366f1" strokeOpacity={0.5} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
