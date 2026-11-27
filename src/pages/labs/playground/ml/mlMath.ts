/** Small, dependency-free numeric helpers for the ML labs. */

/** Deterministic PRNG (mulberry32) so a seed always produces the same dataset. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal via Box–Muller. */
export function gauss(r: () => number) {
  const u = Math.max(r(), 1e-12)
  const v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Solve A·x = b (A square) with Gaussian elimination and partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    const d = M[c][c] || 1e-12
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / d
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12))
}

/** Least-squares polynomial fit of the given degree, with optional ridge penalty λ. */
export function polyfit(xs: number[], ys: number[], degree: number, lambda = 0): number[] {
  const d = degree + 1
  const A = Array.from({ length: d }, () => new Array(d).fill(0))
  const b = new Array(d).fill(0)
  xs.forEach((x, i) => {
    const pw = Array.from({ length: d }, (_, k) => x ** k)
    for (let r = 0; r < d; r++) {
      b[r] += pw[r] * ys[i]
      for (let c = 0; c < d; c++) A[r][c] += pw[r] * pw[c]
    }
  })
  for (let k = 1; k < d; k++) A[k][k] += lambda
  return solve(A, b)
}

export function polyval(coef: number[], x: number) {
  return coef.reduce((s, c, k) => s + c * x ** k, 0)
}

export function mse(pred: number[], ys: number[]) {
  return pred.reduce((s, p, i) => s + (p - ys[i]) ** 2, 0) / Math.max(1, ys.length)
}

/** Map a value from a data range to an SVG pixel range. */
export function scale(v: number, d0: number, d1: number, r0: number, r1: number) {
  return r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0)
}

export const fmt = (v: number, digits = 3) => (Math.abs(v) >= 1e4 || (!Number.isFinite(v)) ? (Number.isFinite(v) ? v.toExponential(2) : '∞') : v.toFixed(digits))
