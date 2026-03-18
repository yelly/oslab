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

  const samples: RawSample[] = []
  if (allRows.length % 7 !== 0) {
    warnings.push(
      `Row count (${allRows.length}) is not a multiple of 7; some samples may be incomplete.`,
    )
  }
  for (let i = 0; i + 7 <= allRows.length; i += 7) {
    const chunk = allRows.slice(i, i + 7)
    const labels = [...new Set(chunk.map((r) => r.label))]
    const label = labels[0]
    if (labels.length > 1) {
      warnings.push(`Mixed labels in sample group at row ${i}: ${labels.join(', ')}. Using first.`)
    }
    samples.push({ label, rows: chunk, runName })
  }

  return { runName, originalFilename: filename, samples, parseWarnings: warnings }
}
