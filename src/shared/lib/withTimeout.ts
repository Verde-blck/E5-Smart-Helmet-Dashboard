export class TimeoutError extends Error {
  constructor() {
    super('timeout')
  }
}

// Requests have no time limit of their own, so a server that never answers would leave a page
// loading forever. The original promise keeps running; callers can still use its late result.
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}
