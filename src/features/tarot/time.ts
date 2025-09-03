export function toBase(n: number, base: number): number[] {
  if (!Number.isFinite(n) || n < 0) return [0]
  if (n === 0) return [0]
  const digits: number[] = []
  let x = Math.floor(n)
  while (x > 0) {
    digits.push(x % base)
    x = Math.floor(x / base)
  }
  return digits.reverse()
}

export function currentUnix(): number {
  return Math.floor(Date.now() / 1000)
}


