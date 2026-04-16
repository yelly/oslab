import { useState, useMemo, useEffect, useRef } from 'react'
import type { ParsedFile } from '../lib/parser'
import {
  parseSampleName,
  getTotalDepth,
  detectSiteName,
  detectSiteNameFromLabels,
  getRunDepth,
} from '../lib/naming'

export type SampleAction = 'include' | 'test' | 'drop' | { renamed: string }

export interface ReviewState {
  siteName: string
  actions: Record<string, SampleAction>
  runDepthOverrides: Record<string, number>
}

interface Props {
  files: ParsedFile[]
  initialState?: ReviewState
  onBack: () => void
  onProceed: (state: ReviewState) => void
}

export function SampleReview({ files, initialState, onBack, onProceed }: Props) {
  const allRunNames = useMemo(() => [...new Set(files.map((f) => f.runName))], [files])
  const runNameToFilename = useMemo(
    () =>
      Object.fromEntries(files.map((f) => [f.runName, f.originalFilename.replace(/\.sum$/i, '')])),
    [files],
  )
  const allSamples = useMemo(() => files.flatMap((f) => f.samples), [files])
  const [siteName, setSiteName] = useState(() => {
    if (initialState?.siteName) return initialState.siteName
    const fromRunNames = detectSiteName(allRunNames)
    // If no sample parses with the run-name-derived site, fall back to the
    // longest common prefix of the label prefixes (the part before the last '_').
    const anyConforms = allSamples.some((s) => {
      const parsed = parseSampleName(s.label, s.runName, fromRunNames)
      return parsed !== null && getTotalDepth(parsed, fromRunNames) !== null
    })
    if (anyConforms) return fromRunNames
    const fromLabels = detectSiteNameFromLabels(allSamples.map((s) => s.label)) || fromRunNames
    // If the label-derived prefix itself encodes a depth suffix (e.g. 'BED42150' → 'BED42')
    // and none of the run names carry that depth, strip it so the site name is cleaner.
    const innerSite = detectSiteName([fromLabels])
    const labelDepthStr = fromLabels.slice(innerSite.length)
    const allRunsNeedOverride = allRunNames.every((rn) => getRunDepth(rn, fromLabels) === null)
    if (/^\d+$/.test(labelDepthStr) && labelDepthStr.length > 0 && allRunsNeedOverride) {
      return innerSite
    }
    return fromLabels
  })
  const [runDepthOverrides, setRunDepthOverrides] = useState<Record<string, number>>(() => {
    if (initialState?.runDepthOverrides) return initialState.runDepthOverrides
    // If the label-derived prefix encodes a depth (e.g. 'BED42150' → depth 150) and
    // that depth cannot be derived from any run name, pre-populate the overrides so the
    // user doesn't have to type it in manually.
    const overrides: Record<string, number> = {}
    const fromLabels = detectSiteNameFromLabels(allSamples.map((s) => s.label))
    const innerSite = detectSiteName([fromLabels])
    const labelDepthStr = fromLabels.slice(innerSite.length)
    if (/^\d+$/.test(labelDepthStr) && labelDepthStr.length > 0) {
      const hintDepth = parseInt(labelDepthStr, 10)
      for (const runName of allRunNames) {
        if (getRunDepth(runName, fromLabels) === null) {
          overrides[runName] = hintDepth
        }
      }
    }
    return overrides
  })
  const [actions, setActions] = useState<Record<string, SampleAction>>(
    () => initialState?.actions ?? {},
  )
  const [renameInputs, setRenameInputs] = useState<Record<string, string>>({})

  const sampleStatuses = useMemo(
    () =>
      allSamples.map((s) => {
        const parsed = parseSampleName(s.label, s.runName, siteName, runDepthOverrides)
        const depth = parsed ? getTotalDepth(parsed, siteName, runDepthOverrides) : null
        const conforming = parsed !== null && depth !== null
        return { sample: s, parsed, depth, conforming }
      }),
    [allSamples, siteName, runDepthOverrides],
  )

  // When site config changes, clear stale actions on samples that just became conforming.
  // isFirstEffectRef prevents clearing initialActions on mount.
  const isFirstEffectRef = useRef(true)
  const prevConformingRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const nowConforming = new Set(
      sampleStatuses.filter((s) => s.conforming).map((s) => s.sample.label),
    )
    if (isFirstEffectRef.current) {
      isFirstEffectRef.current = false
      prevConformingRef.current = nowConforming
      return
    }
    const newlyConforming = [...nowConforming].filter(
      (label) => !prevConformingRef.current.has(label),
    )
    prevConformingRef.current = nowConforming
    if (newlyConforming.length > 0) {
      setActions((prev) => {
        const next = { ...prev }
        let changed = false
        for (const label of newlyConforming) {
          if (next[label] !== undefined) {
            delete next[label]
            changed = true
          }
        }
        return changed ? next : prev
      })
    }
  }, [sampleStatuses])

  const suggestRename = (label: string, runName: string): string | null => {
    const m = label.match(/_(\d+)([a-z])$/i)
    if (!m) return null
    const rd = runDepthOverrides[runName] ?? getRunDepth(runName, siteName)
    const prefix = rd !== null ? `${siteName}${rd}` : siteName
    return `${prefix}_${m[1]}${m[2].toLowerCase()}`
  }

  const isRenameValid = (runName: string, renamed: string): boolean => {
    const parsed = parseSampleName(renamed, runName, siteName, runDepthOverrides)
    return parsed !== null && getTotalDepth(parsed, siteName, runDepthOverrides) !== null
  }

  const canProceed = sampleStatuses.every(({ conforming, sample }) => {
    const action = actions[sample.label]
    if (action === 'drop' || action === 'test') return true
    if (typeof action === 'object' && 'renamed' in action) {
      return isRenameValid(sample.runName, action.renamed)
    }
    return conforming
  })

  const setAction = (label: string, action: SampleAction) => {
    setActions((prev) => ({ ...prev, [label]: action }))
  }

  const clearAction = (label: string) => {
    setActions((prev) => {
      const n = { ...prev }
      delete n[label]
      return n
    })
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
    onProceed({ siteName, actions: finalActions, runDepthOverrides })
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
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm text-gray-600 whitespace-nowrap">Site name:</label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm font-mono w-40 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div className="space-y-2">
          {allRunNames.map((runName) => {
            const autoDepth = getRunDepth(runName, siteName)
            const overriddenDepth = runDepthOverrides[runName]
            const displayDepth = overriddenDepth ?? autoDepth ?? ''
            return (
              <div key={runName} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                  {allRunNames.length > 1
                    ? `${runNameToFilename[runName]} run depth:`
                    : 'Run depth:'}
                </span>
                <input
                  type="number"
                  min={0}
                  value={displayDepth}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val)) {
                      setRunDepthOverrides((prev) => ({ ...prev, [runName]: val }))
                    } else {
                      setRunDepthOverrides((prev) => {
                        const n = { ...prev }
                        delete n[runName]
                        return n
                      })
                    }
                  }}
                  className={`border rounded px-2 py-1 text-sm font-mono w-24 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                    overriddenDepth !== undefined
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-300'
                  }`}
                />
                <span className="text-xs text-gray-500">cm</span>
                {overriddenDepth !== undefined &&
                  autoDepth !== null &&
                  overriddenDepth !== autoDepth && (
                    <span className="text-xs text-indigo-500">(auto-detected: {autoDepth} cm)</span>
                  )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-800">
            Samples ({allSamples.length})
            {sampleStatuses.filter(({ conforming, sample }) => {
              const action = actions[sample.label]
              if (!conforming && action === undefined) return true
              if (typeof action === 'object' && 'renamed' in action) {
                return !isRenameValid(sample.runName, action.renamed)
              }
              return false
            }).length > 0 && (
              <span className="ml-2 text-sm font-normal text-amber-600">
                {
                  sampleStatuses.filter(({ conforming, sample }) => {
                    const action = actions[sample.label]
                    if (!conforming && action === undefined) return true
                    if (typeof action === 'object' && 'renamed' in action) {
                      return !isRenameValid(sample.runName, action.renamed)
                    }
                    return false
                  }).length
                }{' '}
                require review
              </span>
            )}
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {sampleStatuses.map(({ sample, depth, conforming }) => {
            const action = actions[sample.label]
            const effectiveAction = action ?? (conforming ? 'include' : undefined)
            const isDropped = effectiveAction === 'drop'
            const isTest = effectiveAction === 'test'
            const isRename = typeof action === 'object' && 'renamed' in action
            const renameOk =
              isRename && isRenameValid(sample.runName, (action as { renamed: string }).renamed)
            const needsReview = (!conforming && action === undefined) || (isRename && !renameOk)

            return (
              <div
                key={`${sample.runName}-${sample.label}`}
                className={`px-5 py-3 flex items-center gap-3 ${
                  needsReview ? 'bg-amber-50' : isDropped ? 'bg-gray-50 opacity-60' : ''
                }`}
              >
                {/* Status icon */}
                <div className="w-5 text-center flex-shrink-0">
                  {isDropped ? (
                    <span className="text-gray-400">✗</span>
                  ) : isTest ? (
                    <span className="text-blue-400">T</span>
                  ) : isRename && !renameOk ? (
                    <span className="text-amber-500">!</span>
                  ) : effectiveAction === 'include' || isRename ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-amber-500">!</span>
                  )}
                </div>

                {/* Label */}
                <span className="font-mono text-sm text-gray-800 w-40 flex-shrink-0">
                  {sample.label}
                  {typeof action === 'object' && 'renamed' in action && (
                    <span className="text-indigo-600"> → {action.renamed}</span>
                  )}
                </span>

                {/* Depth */}
                <span className="text-xs text-gray-400 w-20 flex-shrink-0">
                  {(() => {
                    if (conforming && depth !== null) return `${depth} cm`
                    if (typeof action === 'object' && 'renamed' in action) {
                      const parsed = parseSampleName(
                        action.renamed,
                        sample.runName,
                        siteName,
                        runDepthOverrides,
                      )
                      const d = parsed ? getTotalDepth(parsed, siteName, runDepthOverrides) : null
                      return d !== null ? `${d} cm` : 'non-standard'
                    }
                    return 'non-standard'
                  })()}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Non-conforming samples with no action yet */}
                  {!conforming && action === undefined && (
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
                          const suggestion = suggestRename(sample.label, sample.runName)
                          setAction(sample.label, {
                            renamed: renameInputs[sample.label] ?? suggestion ?? sample.label,
                          })
                        }}
                        className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                      >
                        Rename to
                      </button>
                      <input
                        type="text"
                        placeholder={(() => {
                          const rd =
                            runDepthOverrides[sample.runName] ??
                            getRunDepth(sample.runName, siteName)
                          const prefix = rd !== null ? `${siteName}${rd}` : siteName
                          return `e.g. ${prefix}_10a`
                        })()}
                        value={
                          renameInputs[sample.label] ??
                          suggestRename(sample.label, sample.runName) ??
                          ''
                        }
                        onChange={(e) =>
                          setRenameInputs((prev) => ({ ...prev, [sample.label]: e.target.value }))
                        }
                        className="text-xs border border-gray-200 rounded px-2 py-1 font-mono w-40 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                    </>
                  )}

                  {/* Conforming samples: show optional override buttons */}
                  {conforming && action === undefined && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setAction(sample.label, 'test')}
                        className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                      >
                        Mark test
                      </button>
                      <button
                        onClick={() => setAction(sample.label, 'drop')}
                        className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        Drop
                      </button>
                    </div>
                  )}

                  {/* Undo for any explicit action */}
                  {action !== undefined && (
                    <>
                      <button
                        onClick={() => clearAction(sample.label)}
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                      >
                        undo
                      </button>
                      {action === 'test' && (
                        <span className="text-xs text-blue-600">marked as test</span>
                      )}
                      {action === 'drop' && (
                        <span className="text-xs text-gray-500">will be dropped</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <p className="text-sm text-gray-500">
            {canProceed
              ? `${
                  sampleStatuses.filter(({ sample, conforming }) => {
                    const a = actions[sample.label] ?? (conforming ? 'include' : 'drop')
                    return a === 'include' || (typeof a === 'object' && 'renamed' in a)
                  }).length
                } samples ready to process`
              : 'Review all flagged samples before proceeding'}
          </p>
        </div>
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
