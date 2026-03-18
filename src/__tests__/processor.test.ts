import { describe, it, expect } from 'vitest'
import { processSample, averageResults } from '../lib/processor'
import type { RawRow } from '../lib/parser'

// Values from BED40150_40a sample
const BED40150_40a_ROWS: RawRow[] = [
  { label: 'BED40150_40a', count: 98, error: 11, sequence: 'DARK 15s' }, // r1
  { label: 'BED40150_40a', count: 8457, error: 92, sequence: 'S1 15 0 30s' }, // r2
  { label: 'BED40150_40a', count: 6067, error: 78, sequence: 'S1 15 0 30s' }, // r3
  { label: 'BED40150_40a', count: 76, error: 10, sequence: 'DARK 15s' }, // r4
  { label: 'BED40150_40a', count: 76300, error: 276, sequence: 'S2 15 0 30s' }, // r5
  { label: 'BED40150_40a', count: 39491, error: 199, sequence: 'S2 15 0 30s' }, // r6
  { label: 'BED40150_40a', count: 159, error: 14, sequence: 'DARK 15s' }, // r7
]

describe('processSample', () => {
  it('calculates IRSL Net correctly', () => {
    const result = processSample('BED40150_40a', BED40150_40a_ROWS)
    // irsl_net = 8457 + 6067 - 2*98 - 2*76 = 14524 - 196 - 152 = 14176
    expect(result.irslNet.value).toBe(14176)
  })

  it('calculates OSL Net correctly', () => {
    const result = processSample('BED40150_40a', BED40150_40a_ROWS)
    // osl_net = 76300 + 39491 - 2*76 - 2*159 = 115791 - 152 - 318 = 115321
    expect(result.oslNet.value).toBe(115321)
  })

  it('calculates IRSL Front correctly', () => {
    const result = processSample('BED40150_40a', BED40150_40a_ROWS)
    // irsl_front = 8457 - 6067 = 2390
    expect(result.irslFront.value).toBe(2390)
  })

  it('calculates OSL Front correctly', () => {
    const result = processSample('BED40150_40a', BED40150_40a_ROWS)
    // osl_front = 76300 - 39491 = 36809
    expect(result.oslFront.value).toBe(36809)
  })

  it('calculates IRSL/OSL ratio correctly', () => {
    const result = processSample('BED40150_40a', BED40150_40a_ROWS)
    // irsl_osl = 14176 / 115321 ≈ 0.12291
    expect(result.irslOsl.value).toBeCloseTo(14176 / 115321, 6)
  })

  it('handles zero denominator in depletion gracefully', () => {
    // Set r3 = r1 + r4 so that denominator (r3 - (r1+r4)) = 0
    const r1count = BED40150_40a_ROWS[0].count
    const r4count = BED40150_40a_ROWS[3].count
    const rows: RawRow[] = BED40150_40a_ROWS.map((r, i) =>
      i === 2 ? { ...r, count: r1count + r4count } : r,
    )
    const result = processSample('test', rows)
    expect(isFinite(result.irslDepletion.value)).toBe(false)
  })

  it('throws on wrong row count', () => {
    expect(() => processSample('test', BED40150_40a_ROWS.slice(0, 6))).toThrow()
  })
})

describe('averageResults', () => {
  it('averages two results correctly', () => {
    const r1 = processSample('BED40150_40a', BED40150_40a_ROWS)
    const r2 = processSample('BED40150_40b', BED40150_40a_ROWS) // same data for simplicity
    const avg = averageResults([r1, r2], 'BED40150_40a/b')
    expect(avg.irslNet.value).toBe(r1.irslNet.value)
    expect(avg.label).toBe('BED40150_40a/b')
  })
})
