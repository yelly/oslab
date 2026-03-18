import { describe, it, expect } from 'vitest'
import {
  parseSampleName,
  detectSiteName,
  getRunDepth,
  getTotalDepth,
  getGroupKey,
} from '../lib/naming'

describe('parseSampleName', () => {
  it('parses standard sample name', () => {
    const result = parseSampleName('BED40150_40a', 'BED40150')
    expect(result).not.toBeNull()
    expect(result!.offset).toBe(40)
    expect(result!.replicate).toBe('a')
    expect(result!.runName).toBe('BED40150')
  })

  it('parses replicate b', () => {
    const result = parseSampleName('BED40150_40b', 'BED40150')
    expect(result!.replicate).toBe('b')
  })

  it('returns null for non-conforming names', () => {
    expect(parseSampleName('F1', 'BED40150')).toBeNull()
    expect(parseSampleName('f2', 'BED40150')).toBeNull()
    expect(parseSampleName('BED40150_40', 'BED40150')).toBeNull() // no letter
  })

  it('returns null when label does not start with runName', () => {
    expect(parseSampleName('OTHER150_40a', 'BED40150')).toBeNull()
  })
})

describe('detectSiteName', () => {
  it('finds common prefix of multiple run names', () => {
    expect(detectSiteName(['BED40150', 'BED40300'])).toBe('BED40')
  })

  it('strips 3-digit depth suffix for single file', () => {
    expect(detectSiteName(['BED40150'])).toBe('BED40')
    expect(detectSiteName(['BED40300'])).toBe('BED40')
  })

  it('falls back to full run name if suffix is not a multiple of 10', () => {
    expect(detectSiteName(['SITE123'])).toBe('SITE123')
  })

  it('handles empty array', () => {
    expect(detectSiteName([])).toBe('')
  })
})

describe('getRunDepth', () => {
  it('extracts run depth from run name', () => {
    expect(getRunDepth('BED40150', 'BED40')).toBe(150)
    expect(getRunDepth('BED40300', 'BED40')).toBe(300)
  })

  it('returns null for mismatched site name', () => {
    expect(getRunDepth('BED40150', 'OTHER')).toBeNull()
  })
})

describe('getTotalDepth', () => {
  it('computes total depth correctly', () => {
    const name = parseSampleName('BED40150_40a', 'BED40150')!
    expect(getTotalDepth(name, 'BED40')).toBe(190) // 150 + 40
  })

  it('computes depth for 300 run', () => {
    const name = parseSampleName('BED40300_10a', 'BED40300')!
    expect(getTotalDepth(name, 'BED40')).toBe(310) // 300 + 10
  })
})

describe('getGroupKey', () => {
  it('gives same key for a and b replicates', () => {
    const a = parseSampleName('BED40150_40a', 'BED40150')!
    const b = parseSampleName('BED40150_40b', 'BED40150')!
    expect(getGroupKey(a, 'BED40')).toBe(getGroupKey(b, 'BED40'))
  })

  it('gives different keys for different depths', () => {
    const d40 = parseSampleName('BED40150_40a', 'BED40150')!
    const d50 = parseSampleName('BED40150_50a', 'BED40150')!
    expect(getGroupKey(d40, 'BED40')).not.toBe(getGroupKey(d50, 'BED40'))
  })
})
