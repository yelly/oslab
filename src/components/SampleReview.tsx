import { useState, useMemo } from 'react'
import type { ParsedFile } from '../lib/parser'
import { parseSampleName, getTotalDepth, detectSiteName } from '../lib/naming'

export type SampleAction = 'include' | 'test' | 'drop' | { renamed: string }

interface Props {
  files: ParsedFile[]
  onProceed: (siteName: string, actions: Record<string, SampleAction>) => void
}

export function SampleReview({ files, onProceed }: Props) {
  const allRunNames = useMemo(() => [...new Set(files.map((f) => f.runName))], [files])
  const [siteName, setSiteName] = useState(() => detectSiteName(allRunNames))
  const [actions, setActions] = useState<Record<string, SampleAction>>({})
  const [renameInputs, setRenameInputs] = useState<Record<string, string>>({})

  const allSamples = useMemo(() => files.flatMap((f) => f.samples), [files])

  const sampleStatuses = useMemo(
    () =>
      allSamples.map((s) => {
        const parsed = parseSampleName(s.label, s.runName)
        const depth = parsed ? getTotalDepth(parsed, siteName) : null
        const conforming = parsed !== null && depth !== null
        return { sample: s, parsed, depth, conforming }
      }),
    [allSamples, siteName],
  )

  const canProceed = sampleStatuses.every(
    ({ conforming, sample }) => conforming || actions[sample.label] !== undefined,
  )

  const setAction = (label: string, action: SampleAction) => {
    setActions((prev) => ({ ...prev, [label]: action }))
  }

  const handleProceed = () => {
    const finalActions: Record<string, SampleAction> = {}
    for (const { sample, conforming } of sampleStatuses) {
      if (conforming) {
        finalActions[sample.label] = actions[sample.label] ?? 'include'
      } else {
        finalActions[sample.label] = actions[sample.label] ?? 'drop'
      }
    }
    onProceed(siteName, finalActions)
  }

  const warnings = files.flatMap((f) => f.parseWarnings)

  return (
    <div className="max-w-4xl mx-auto">
      {warnings.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          {warnings.map((w, i) => (
            <p key={i} className="text-amber-800 text-sm">
              {w}
            </p>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Site Configuration</h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 whitespace-nowrap">Site name:</label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm font-mono flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-xs text-gray-400">
            Run depths:{' '}
            {allRunNames
              .map((r) =>
                siteName && r.startsWith(siteName) ? r.slice(siteName.length) + ' cm' : r,
              )
              .join(', ')}
          </span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-800">
            Samples ({allSamples.length})
            <span className="ml-2 text-sm font-normal text-gray-500">
              {sampleStatuses.filter((s) => !s.conforming).length} require review
            </span>
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {sampleStatuses.map(({ sample, parsed: _parsed, depth, conforming }) => {
            const action = actions[sample.label]
            return (
              <div
                key={`${sample.runName}-${sample.label}`}
                className={`px-5 py-3 flex items-center gap-3 ${
                  !conforming && !action
                    ? 'bg-amber-50'
                    : action === 'drop'
                      ? 'bg-gray-50 opacity-60'
                      : ''
                }`}
              >
                <div className="w-5 text-center flex-shrink-0">
                  {conforming || action === 'include' || (action && typeof action === 'object') ? (
                    <span className="text-green-500">✓</span>
                  ) : action === 'test' ? (
                    <span className="text-blue-400">T</span>
                  ) : action === 'drop' ? (
                    <span className="text-gray-400">✗</span>
                  ) : (
                    <span className="text-amber-500">!</span>
                  )}
                </div>
                <span className="font-mono text-sm text-gray-800 w-48 flex-shrink-0">
                  {sample.label}
                </span>
                <span className="text-xs text-gray-400 w-24 flex-shrink-0">
                  {conforming && depth !== null ? `${depth} cm` : _parsed ? '? cm' : 'non-standard'}
                </span>

                {!conforming && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {action === undefined && (
                      <>
                        <button
                          onClick={() => setAction(sample.label, 'test')}
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Test sample
                        </button>
                        <button
                          onClick={() => setAction(sample.label, 'drop')}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          Drop
                        </button>
                        <button
                          onClick={() => {
                            setActions((prev) => ({
                              ...prev,
                              [sample.label]: {
                                renamed: renameInputs[sample.label] || sample.label,
                              },
                            }))
                          }}
                          className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                        >
                          Rename
                        </button>
                        <input
                          type="text"
                          placeholder={`e.g. ${sample.runName}_10a`}
                          value={renameInputs[sample.label] || ''}
                          onChange={(e) =>
                            setRenameInputs((prev) => ({ ...prev, [sample.label]: e.target.value }))
                          }
                          className="text-xs border border-gray-200 rounded px-2 py-1 font-mono w-40 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                      </>
                    )}
                    {action !== undefined && (
                      <button
                        onClick={() =>
                          setActions((prev) => {
                            const n = { ...prev }
                            delete n[sample.label]
                            return n
                          })
                        }
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                      >
                        undo
                      </button>
                    )}
                    {typeof action === 'object' && 'renamed' in action && (
                      <span className="text-xs text-green-700 font-mono">→ {action.renamed}</span>
                    )}
                    {action === 'test' && (
                      <span className="text-xs text-blue-600">Marked as test sample</span>
                    )}
                    {action === 'drop' && (
                      <span className="text-xs text-gray-500">Will be dropped</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {canProceed
            ? `${sampleStatuses.filter((s) => s.conforming || (actions[s.sample.label] && actions[s.sample.label] !== 'drop' && actions[s.sample.label] !== 'test')).length} samples ready to process`
            : 'Review all flagged samples before proceeding'}
        </p>
        <button
          onClick={handleProceed}
          disabled={!canProceed}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Process Samples →
        </button>
      </div>
    </div>
  )
}
