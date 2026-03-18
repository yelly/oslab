export interface SampleName {
  raw: string
  runName: string
  offset: number
  replicate: string // 'a', 'b', etc.
}

// Try to parse a label given the known run name.
// Label must be "{runName}_{offset}{letter}".
export function parseSampleName(label: string, runName: string): SampleName | null {
  const prefix = runName + '_'
  if (!label.startsWith(prefix)) return null
  const rest = label.slice(prefix.length)
  const m = rest.match(/^(\d+)([a-z])$/i)
  if (!m) return null
  return {
    raw: label,
    runName,
    offset: parseInt(m[1], 10),
    replicate: m[2],
  }
}

// Get run depth from run name given the site name.
// runName: "BED40150", siteName: "BED40" → 150
export function getRunDepth(runName: string, siteName: string): number | null {
  if (!runName.startsWith(siteName)) return null
  const depthStr = runName.slice(siteName.length)
  if (!/^\d+$/.test(depthStr)) return null
  return parseInt(depthStr, 10)
}

// Detect site name from a set of run names via longest common prefix.
// For a single run name, guesses by stripping the trailing 3-digit depth suffix
// (e.g. "BED40150" → "BED40"), falling back to the full run name if the pattern
// doesn't match, in which case the user should edit it manually.
export function detectSiteName(runNames: string[]): string {
  if (runNames.length === 0) return ''
  if (runNames.length === 1) {
    // Heuristic: strip last 3 digits if they form a multiple-of-10 depth
    const m = runNames[0].match(/^(\w+)(\d{3})$/)
    if (m && parseInt(m[2], 10) % 10 === 0) return m[1]
    return runNames[0]
  }
  let prefix = runNames[0]
  for (const name of runNames.slice(1)) {
    let i = 0
    while (i < prefix.length && i < name.length && prefix[i] === name[i]) i++
    prefix = prefix.slice(0, i)
  }
  return prefix
}

// Calculate total depth in cm.
export function getTotalDepth(name: SampleName, siteName: string): number | null {
  const runDepth = getRunDepth(name.runName, siteName)
  if (runDepth === null) return null
  return runDepth + name.offset
}

// Get group key for grouping replicates at the same depth.
export function getGroupKey(name: SampleName, siteName: string): string {
  const depth = getTotalDepth(name, siteName)
  return `${siteName}@${depth ?? name.runName + '_' + name.offset}`
}
