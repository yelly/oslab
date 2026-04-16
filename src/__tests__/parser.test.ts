import { describe, it, expect } from 'vitest'
import { parseSumFile } from '../lib/parser'

const MINIMAL_SUM = `=========================================================================================
Run Name:      TESTRUN

No.      Filename              Sample Label              Terminal Count        Sequence
---   ----------------   --------------------------   --------------------   ------------

0001   TESTRUN0001.psl   TESTRUN_10a                        50 +/-   10   DARK 15s
0001   TESTRUN0001.psl   TESTRUN_10a                       100 +/-   15   S1 15 0 30s
0001   TESTRUN0001.psl   TESTRUN_10a                        90 +/-   14   S1 15 0 30s
0001   TESTRUN0001.psl   TESTRUN_10a                        55 +/-   10   DARK 15s
0001   TESTRUN0001.psl   TESTRUN_10a                      1000 +/-   40   S2 15 0 30s
0001   TESTRUN0001.psl   TESTRUN_10a                       900 +/-   38   S2 15 0 30s
0001   TESTRUN0001.psl   TESTRUN_10a                        45 +/-    9   DARK 15s
`

describe('parseSumFile', () => {
  it('parses run name from header', () => {
    const result = parseSumFile(MINIMAL_SUM, 'TESTRUN.sum')
    expect(result.runName).toBe('TESTRUN')
  })

  it('parses one sample with 7 rows', () => {
    const result = parseSumFile(MINIMAL_SUM, 'TESTRUN.sum')
    expect(result.samples).toHaveLength(1)
    expect(result.samples[0].label).toBe('TESTRUN_10a')
    expect(result.samples[0].rows).toHaveLength(7)
  })

  it('parses counts and errors correctly', () => {
    const result = parseSumFile(MINIMAL_SUM, 'TESTRUN.sum')
    const rows = result.samples[0].rows
    expect(rows[0].count).toBe(50)
    expect(rows[0].error).toBe(10)
    expect(rows[1].count).toBe(100)
    expect(rows[1].error).toBe(15)
  })

  it('fixes negative dark counts by interpolation', () => {
    const sumWithNegDark = MINIMAL_SUM.replace(
      '0001   TESTRUN0001.psl   TESTRUN_10a                        50 +/-   10   DARK 15s',
      '0001   TESTRUN0001.psl   TESTRUN_10a                       -50 +/-   10   DARK 15s',
    )
    const result = parseSumFile(sumWithNegDark, 'TESTRUN.sum')
    // Negative first dark should be replaced with avg of 0 (last_dark_count) and 55 = 27
    // Actually: last_dark_count starts at 0, negative_dark_row = r1 (-50)
    // When we reach r4 (55, positive dark): negative_dark_row.count = round((0 + 55) / 2) = 28
    const rows = result.samples[0].rows
    expect(rows[0].count).toBe(28)
  })

  it('correctly parses samples after one with a missing row', () => {
    // TESTRUN_10a is missing its last DARK row (only 6 rows)
    const truncatedFirst = MINIMAL_SUM.replace(/0001.*DARK 15s\s*$/m, '')
    // Append a second complete sample
    const withSecond =
      truncatedFirst +
      `0002   TESTRUN0002.psl   TESTRUN_20a                        50 +/-   10   DARK 15s
0002   TESTRUN0002.psl   TESTRUN_20a                       100 +/-   15   S1 15 0 30s
0002   TESTRUN0002.psl   TESTRUN_20a                        90 +/-   14   S1 15 0 30s
0002   TESTRUN0002.psl   TESTRUN_20a                        55 +/-   10   DARK 15s
0002   TESTRUN0002.psl   TESTRUN_20a                      1000 +/-   40   S2 15 0 30s
0002   TESTRUN0002.psl   TESTRUN_20a                       900 +/-   38   S2 15 0 30s
0002   TESTRUN0002.psl   TESTRUN_20a                        45 +/-    9   DARK 15s
`
    const result = parseSumFile(withSecond, 'TESTRUN.sum')
    // First sample is skipped (6 rows), second is parsed correctly
    expect(result.samples).toHaveLength(1)
    expect(result.samples[0].label).toBe('TESTRUN_20a')
    expect(result.parseWarnings.some((w) => w.includes('TESTRUN_10a'))).toBe(true)
  })

  it('uses last 7 rows when sample has a multiple of 7 rows', () => {
    // Append a second complete run of the same sample (14 rows total)
    const secondRunRows = `0002   TESTRUN0002.psl   TESTRUN_10a                        60 +/-   11   DARK 15s
0002   TESTRUN0002.psl   TESTRUN_10a                       110 +/-   16   S1 15 0 30s
0002   TESTRUN0002.psl   TESTRUN_10a                        95 +/-   14   S1 15 0 30s
0002   TESTRUN0002.psl   TESTRUN_10a                        58 +/-   10   DARK 15s
0002   TESTRUN0002.psl   TESTRUN_10a                      1050 +/-   41   S2 15 0 30s
0002   TESTRUN0002.psl   TESTRUN_10a                       950 +/-   39   S2 15 0 30s
0002   TESTRUN0002.psl   TESTRUN_10a                        48 +/-    9   DARK 15s
`
    const result = parseSumFile(MINIMAL_SUM + secondRunRows, 'TESTRUN.sum')
    expect(result.samples).toHaveLength(1)
    // The last 7 rows come from the second run; first dark count should be 60
    expect(result.samples[0].rows[0].count).toBe(60)
    expect(result.parseWarnings.some((w) => w.includes('2 runs'))).toBe(true)
  })

  it('uses filename as run name when header missing', () => {
    const noHeader = MINIMAL_SUM.replace('Run Name:      TESTRUN', '')
    const result = parseSumFile(noHeader, 'MYRUN.sum')
    expect(result.runName).toBe('MYRUN')
    expect(result.parseWarnings.length).toBeGreaterThan(0)
  })
})
