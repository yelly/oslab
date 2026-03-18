import React, { useState } from 'react'
import { HelpModal } from './components/HelpModal'
import { FileUpload } from './components/FileUpload'
import { SampleReview, type SampleAction } from './components/SampleReview'
import { ResultsTable, type ResultRow } from './components/ResultsTable'
import { DepthPlot, type PlotRow } from './components/DepthPlot'
import type { ParsedFile } from './lib/parser'
import { parseSampleName, getTotalDepth, getGroupKey } from './lib/naming'
import { processSample, averageResults, type SampleResult } from './lib/processor'
import { toExportRow, exportToCsv, downloadCsv } from './lib/export'

type Step = 'upload' | 'review' | 'results'

interface ProcessedData {
  tableRows: ResultRow[]
  plotRows: PlotRow[]
  siteName: string
  csvContent: string
}

function processFiles(
  files: ParsedFile[],
  siteName: string,
  actions: Record<string, SampleAction>,
): ProcessedData {
  // Collect all samples, apply actions
  const activeSamples = files
    .flatMap((f) => f.samples)
    .filter((s) => actions[s.label] === 'include')

  // Compute results for each sample
  const sampleResults: { result: SampleResult; label: string; runName: string }[] = []
  for (const s of activeSamples) {
    try {
      const action = actions[s.label]
      const effectiveLabel =
        typeof action === 'object' && 'renamed' in action ? action.renamed : s.label
      const result = processSample(effectiveLabel, s.rows)
      sampleResults.push({ result, label: effectiveLabel, runName: s.runName })
    } catch {
      // Skip samples that fail processing
    }
  }

  // Group replicates at the same depth for averaging
  const groups = new Map<
    string,
    { replicates: { result: SampleResult; replicate: string }[]; depth: number | null }
  >()
  for (const { result, label, runName } of sampleResults) {
    const parsed = parseSampleName(label, runName)
    if (!parsed) continue
    const depth = getTotalDepth(parsed, siteName)
    const key = getGroupKey(parsed, siteName)
    const existing = groups.get(key) ?? { replicates: [], depth }
    existing.replicates.push({ result, replicate: parsed.replicate })
    groups.set(key, existing)
  }

  const tableRows: ResultRow[] = []
  const plotRows: PlotRow[] = []
  const exportRows = []

  for (const [, group] of groups) {
    if (group.replicates.length === 0) continue

    group.replicates.sort((a, b) => a.replicate.localeCompare(b.replicate))
    const results = group.replicates.map((r) => r.result)
    const isAveraged = results.length > 1

    const baseLabel = results[0].label.replace(/[a-z]$/, '')
    const letters = group.replicates.map((r) => r.replicate).join('/')
    const label = isAveraged ? `${baseLabel}${letters}` : results[0].label
    const finalResult = isAveraged ? averageResults(results, label) : results[0]

    tableRows.push({ depth: group.depth, result: finalResult, isAveraged })
    if (group.depth !== null) {
      plotRows.push({ depth: group.depth, result: finalResult })
    }
    exportRows.push(toExportRow(finalResult, group.depth))
  }

  // Sort export rows by depth
  exportRows.sort((a, b) => Number(a.depth || 0) - Number(b.depth || 0))

  return {
    tableRows,
    plotRows,
    siteName,
    csvContent: exportToCsv(exportRows),
  }
}

export default function App() {
  const [step, setStep] = useState<Step>('upload')
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [processed, setProcessed] = useState<ProcessedData | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const handleFilesLoaded = (loaded: ParsedFile[]) => {
    setFiles(loaded)
    setStep('review')
  }

  const handleProceed = (siteName: string, actions: Record<string, SampleAction>) => {
    const data = processFiles(files, siteName, actions)
    setProcessed(data)
    setStep('results')
  }

  const handleStartOver = () => {
    setFiles([])
    setProcessed(null)
    setStep('upload')
  }

  const handleExport = () => {
    if (!processed) return
    const filename = `${processed.siteName}_osl_results.csv`
    downloadCsv(processed.csvContent, filename)
  }

  const steps = ['Upload', 'Review', 'Results']
  const stepIndex = { upload: 0, review: 1, results: 2 }[step]

  return (
    <div className="min-h-screen bg-gray-50">
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">OSLab</h1>
            <p className="text-xs text-gray-500">SUERC Portable OSL Reader · SAR Protocol</p>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1">
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  <span
                    className={`text-sm px-3 py-1 rounded-full ${
                      i === stepIndex
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : i < stepIndex
                          ? 'text-gray-400'
                          : 'text-gray-300'
                    }`}
                  >
                    {s}
                  </span>
                  {i < steps.length - 1 && <span className="text-gray-300">›</span>}
                </React.Fragment>
              ))}
            </nav>
            <button
              onClick={() => setShowHelp(true)}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="Help"
            >
              Help
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {step === 'upload' && <FileUpload onFilesLoaded={handleFilesLoaded} />}

        {step === 'review' && <SampleReview files={files} onProceed={handleProceed} />}

        {step === 'results' && processed && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Results — {processed.siteName}
                </h2>
                <p className="text-sm text-gray-500">
                  {processed.tableRows.length} samples · depths{' '}
                  {processed.plotRows.length > 0
                    ? `${Math.min(...processed.plotRows.map((r) => r.depth))}–${Math.max(...processed.plotRows.map((r) => r.depth))} cm`
                    : 'unknown'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleStartOver}
                  className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-medium text-gray-700">Measurements</h3>
              </div>
              <ResultsTable rows={processed.tableRows} />
            </div>

            {processed.plotRows.length >= 2 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-medium text-gray-700 mb-4">Depth Profile</h3>
                <DepthPlot rows={processed.plotRows} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
