export interface SampleName {
  raw: string
  runName: string
  offset: number
  replicate: string // 'a', 'b', etc.
}

// Try to parse a label given the known run name and optional site name.
// Accepts "{runName}_{offset}{letter}" (standard), "{siteName}_{offset}{letter}"
// (site-prefixed), or "{siteName}{runDepth}_{offset}{letter}" (compound prefix,
// used when the label encodes both the site name and the run depth together).
export function parseSampleName(
  label: string,
  runName: string,
  siteName?: string,
  runDepthOverrides?: Record<string, number>,
): SampleName | null {
  const tryPrefix = (prefix: string): SampleName | null => {
    if (!label.startsWith(prefix)) return null
    const rest = label.slice(prefix.length)
    const m = rest.match(/^(\d+)([a-z])$/i)
    if (!m) return null
    return {
      raw: label,
      runName,
      offset: parseInt(m[1], 10),
      replicate: m[2].toLowerCase(),
    }
  }
  const result = tryPrefix(runName + '_') ?? (siteName ? tryPrefix(siteName + '_') : null)
  if (result) return result
  if (siteName) {
    const runDepth = runDepthOverrides?.[runName] ?? getRunDepth(runName, siteName)
    if (runDepth !== null) return tryPrefix(siteName + runDepth + '_')
  }
  return null
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

// Infer a site name from sample labels by taking the longest common prefix of
// the part of each label before the last underscore. Useful as a fallback when
// the run-name heuristic over-shoots (e.g. "BED420150" → "BED420" when labels
// actually use the shorter prefix "BED42").
export function detectSiteNameFromLabels(labels: string[]): string {
  const prefixes = labels
    .map((l) => {
      const idx = l.lastIndexOf('_')
      return idx > 0 ? l.slice(0, idx) : ''
    })
    .filter((p) => p.length > 0)
  if (prefixes.length === 0) return ''
  let prefix = prefixes[0]
  for (const p of prefixes.slice(1)) {
    let i = 0
    while (i < prefix.length && i < p.length && prefix[i] === p[i]) i++
    prefix = prefix.slice(0, i)
    if (!prefix) break
  }
  return prefix
}

// Calculate total depth in cm. runDepthOverrides allows manual correction of
// the run depth when it cannot be inferred from the run name alone.
export function getTotalDepth(
  name: SampleName,
  siteName: string,
  runDepthOverrides?: Record<string, number>,
): number | null {
  const runDepth = runDepthOverrides?.[name.runName] ?? getRunDepth(name.runName, siteName)
  if (runDepth === null) return null
  return runDepth + name.offset
}

// Get group key for grouping replicates at the same depth.
export function getGroupKey(
  name: SampleName,
  siteName: string,
  runDepthOverrides?: Record<string, number>,
): string {
  const depth = getTotalDepth(name, siteName, runDepthOverrides)
  return `${siteName}@${depth ?? name.runName + '_' + name.offset}`
}
