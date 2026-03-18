import type { RawRow } from './parser'

export interface ValueWithError {
  value: number
  error: number
}

function meanVWE(items: ValueWithError[]): ValueWithError {
  const n = items.length
  return {
    value: items.reduce((s, v) => s + v.value, 0) / n,
    error: items.reduce((s, v) => s + v.error, 0) / n,
  }
}

export interface SampleResult {
  label: string
  irslNet: ValueWithError
  irslFront: ValueWithError
  irslDepletion: ValueWithError
  oslNet: ValueWithError
  oslFront: ValueWithError
  oslDepletion: ValueWithError
  irslOsl: ValueWithError
}

function sq(x: number): number {
  return x * x
}

interface SignalMetrics {
  net: ValueWithError
  front: ValueWithError
  depletion: ValueWithError
}

// Shared calculation for one stimulation step.
// Rows in order: dark1, sig1, sig2, dark2
// For IRSL: (r1, r2, r3, r4); for OSL: (r4, r5, r6, r7)
function calcSignalMetrics(
  dark1: RawRow,
  sig1: RawRow,
  sig2: RawRow,
  dark2: RawRow,
): SignalMetrics {
  // Net signal: sig1 + sig2 − 2·dark1 − 2·dark2
  const netVal = sig1.count + sig2.count - 2 * dark1.count - 2 * dark2.count
  // Analytical propogation results in sqrt(s1^2 + s2^2 + 4d1^2 + 4d2^2) but the
  // formula in common use is used here instead.
  // TODO: check if this is an error.
  const netErr = Math.sqrt(
    sq(sig1.error) + sq(sig2.error) + 2 * sq(dark1.error) + 2 * sq(dark2.error),
  )

  // Front: sig1 − sig2, error via Poisson statistics
  const frontVal = sig1.count - sig2.count
  const frontErr = Math.sqrt(Math.abs(sig1.count) + Math.abs(sig2.count))

  // Depletion: (sig1 − dark1 − dark2) / (sig2 − dark1 − dark2)
  const depNumer = sig1.count - dark1.count - dark2.count
  const depDenom = sig2.count - dark1.count - dark2.count
  const depVal = depDenom !== 0 ? depNumer / depDenom : NaN
  const depErr =
    isFinite(depVal) && sig1.count !== 0 && sig2.count !== 0
      ? Math.abs(depVal) *
        Math.sqrt(
          sq(Math.sqrt(sq(sig1.error) + sq(dark1.error) + sq(dark2.error)) / sig1.count) +
            sq(Math.sqrt(sq(sig2.error) + sq(dark1.error) + sq(dark2.error)) / sig2.count),
        )
      : NaN

  return {
    net: { value: netVal, error: netErr },
    front: { value: frontVal, error: frontErr },
    depletion: { value: depVal, error: depErr },
  }
}

export function processSample(label: string, rows: RawRow[]): SampleResult {
  if (rows.length !== 7) throw new Error(`Expected 7 rows, got ${rows.length}`)
  const [r1, r2, r3, r4, r5, r6, r7] = rows

  const irsl = calcSignalMetrics(r1, r2, r3, r4)
  const osl = calcSignalMetrics(r4, r5, r6, r7)

  const irslOslVal = osl.net.value !== 0 ? irsl.net.value / osl.net.value : NaN
  const irslOslErr =
    isFinite(irslOslVal) && irsl.net.value !== 0 && osl.net.value !== 0
      ? Math.abs(irslOslVal) *
        Math.sqrt(sq(irsl.net.error / irsl.net.value) + sq(osl.net.error / osl.net.value))
      : NaN

  return {
    label,
    irslNet: irsl.net,
    irslFront: irsl.front,
    irslDepletion: irsl.depletion,
    oslNet: osl.net,
    oslFront: osl.front,
    oslDepletion: osl.depletion,
    irslOsl: { value: irslOslVal, error: irslOslErr },
  }
}

export function averageResults(results: SampleResult[], label: string): SampleResult {
  return {
    label,
    irslNet: meanVWE(results.map((r) => r.irslNet)),
    irslFront: meanVWE(results.map((r) => r.irslFront)),
    irslDepletion: meanVWE(results.map((r) => r.irslDepletion)),
    oslNet: meanVWE(results.map((r) => r.oslNet)),
    oslFront: meanVWE(results.map((r) => r.oslFront)),
    oslDepletion: meanVWE(results.map((r) => r.oslDepletion)),
    irslOsl: meanVWE(results.map((r) => r.irslOsl)),
  }
}
