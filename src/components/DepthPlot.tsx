import { useRef, useState } from 'react'
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
  siteName: string
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

export function DepthPlot({ rows, siteName }: Props) {
  const [metric, setMetric] = useState<MetricKey>('oslNet')
  const chartRef = useRef<HTMLDivElement>(null)

  const exportPng = () => {
    if (!chartRef.current) return
    const svg = chartRef.current.querySelector('svg')
    if (!svg) return

    const { width, height } = svg.getBoundingClientRect()
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('width', String(width))
    clone.setAttribute('height', String(height))
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    const svgStr = new XMLSerializer().serializeToString(clone)
    const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }))

    const img = new Image()
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')!
      ctx.scale(scale, scale)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${siteName}-${metric}.png`
      a.click()
    }
    img.src = url
  }

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
        <button
          onClick={exportPng}
          disabled={data.length === 0}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Export chart as PNG"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
            />
          </svg>
          PNG
        </button>
      </div>

      {data.length === 0 ? (
        <p className="text-gray-400 text-sm">No valid data to plot for this metric.</p>
      ) : (
        <div ref={chartRef}>
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
        </div>
      )}
    </div>
  )
}
