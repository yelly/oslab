export interface RawRow {
  label: string
  count: number
  error: number
  sequence: string
}

export interface RawSample {
  label: string
  rows: RawRow[] // exactly 7
  runName: string
}

export interface ParsedFile {
  runName: string
  originalFilename: string
  samples: RawSample[]
  parseWarnings: string[]
}

const ROW_REGEX = /^(\d{4})\s+(\w+\.\w+)\s+(\w+)\s+(-?\d+)\s+\+\/-\s+(\d+)\s+([\w][\w\s]*[\w])\s*$/

function fixDarkRows(rows: RawRow[]): void {
  let lastDarkCount = 0
  let negativeDarkRow: RawRow | null = null

  for (const row of rows) {
    if (!row.sequence.includes('DARK')) continue

    if (negativeDarkRow !== null) {
      negativeDarkRow.count = Math.round((lastDarkCount + row.count) / 2)
      negativeDarkRow = null
    }

    if (row.count < 0) {
      negativeDarkRow = row
    } else {
      lastDarkCount = row.count
    }
  }
}

export function parseSumFile(content: string, filename: string): ParsedFile {
  const lines = content.split(/\r?\n/)
  const warnings: string[] = []

  let runName = ''
  for (const line of lines) {
    const m = line.match(/^Run Name:\s+(\w+)/)
    if (m) {
      runName = m[1].trim()
      break
    }
  }
  if (!runName) {
    runName = filename.replace(/\.sum$/i, '')
    warnings.push('Could not detect run name from header; using filename.')
  }

  const allRows: RawRow[] = []
  for (const line of lines) {
    const m = line.match(ROW_REGEX)
    if (m) {
      allRows.push({
        label: m[3],
        count: parseInt(m[4], 10),
        error: parseInt(m[5], 10),
        sequence: m[6].trim(),
      })
    }
  }

  fixDarkRows(allRows)

  // Group rows by label in order of first appearance, then validate each group.
  const rowsByLabel = new Map<string, RawRow[]>()
  for (const row of allRows) {
    if (!rowsByLabel.has(row.label)) rowsByLabel.set(row.label, [])
    rowsByLabel.get(row.label)!.push(row)
  }

  const samples: RawSample[] = []
  for (const [label, rows] of rowsByLabel) {
    if (rows.length % 7 === 0 && rows.length > 7) {
      warnings.push(
        `Sample "${label}" has ${rows.length} rows (${rows.length / 7} runs); using the last 7.`,
      )
      samples.push({ label, rows: rows.slice(-7), runName })
    } else if (rows.length !== 7) {
      warnings.push(
        `Sample "${label}" has ${rows.length} row${rows.length === 1 ? '' : 's'} (expected 7); skipping.`,
      )
      continue
    } else {
      samples.push({ label, rows, runName })
    }
  }

  return { runName, originalFilename: filename, samples, parseWarnings: warnings }
}
