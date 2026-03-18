import type { SampleResult } from './processor'

export interface ExportRow {
  sample: string
  depth: number
  irslNet: number
  irslNetError: number
  irslFront: number
  irslFrontError: number
  irslDepletion: number
  irslDepletionError: number
  oslNet: number
  oslNetError: number
  oslFront: number
  oslFrontError: number
  oslDepletion: number
  oslDepletionError: number
  irslOsl: number
  irslOslError: number
}

export function toExportRow(result: SampleResult, depth: number | null): ExportRow {
  return {
    sample: result.label,
    depth: depth ?? NaN,
    irslNet: result.irslNet.value,
    irslNetError: result.irslNet.error,
    irslFront: result.irslFront.value,
    irslFrontError: result.irslFront.error,
    irslDepletion: result.irslDepletion.value,
    irslDepletionError: result.irslDepletion.error,
    oslNet: result.oslNet.value,
    oslNetError: result.oslNet.error,
    oslFront: result.oslFront.value,
    oslFrontError: result.oslFront.error,
    oslDepletion: result.oslDepletion.value,
    oslDepletionError: result.oslDepletion.error,
    irslOsl: result.irslOsl.value,
    irslOslError: result.irslOsl.error,
  }
}

const HEADERS = [
  'Sample',
  'Depth (cm)',
  'IRSL Net',
  'IRSL Net Error',
  'IRSL Front',
  'IRSL Front Error',
  'IRSL Depletion',
  'IRSL Depletion Error',
  'OSL Net',
  'OSL Net Error',
  'OSL Front',
  'OSL Front Error',
  'OSL Depletion',
  'OSL Depletion Error',
  'IRSL/OSL',
  'IRSL/OSL Error',
]

function rowToCsv(row: ExportRow): string {
  const vals = [
    row.sample,
    row.depth,
    row.irslNet,
    row.irslNetError,
    row.irslFront,
    row.irslFrontError,
    row.irslDepletion,
    row.irslDepletionError,
    row.oslNet,
    row.oslNetError,
    row.oslFront,
    row.oslFrontError,
    row.oslDepletion,
    row.oslDepletionError,
    row.irslOsl,
    row.irslOslError,
  ]
  return vals.map((v) => (typeof v === 'number' && !isFinite(v) ? '' : String(v))).join(',')
}

export function exportToCsv(rows: ExportRow[]): string {
  return [HEADERS.join(','), ...rows.map(rowToCsv)].join('\n')
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
