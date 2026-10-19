/** A successful outcome carrying a value. */
export interface Ok<T> {
  readonly ok: true
  readonly value: T
}

/** An expected failure carrying an error. */
export interface Err<E> {
  readonly ok: false
  readonly error: E
}

/**
 * The outcome of an operation that can fail in an expected way, such as invalid input or a missing
 * file. Throw only for bugs.
 */
export type Result<T, E> = Ok<T> | Err<E>

/** Wraps a value as a successful result. */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

/** Wraps an error as a failed result. */
export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}

/** Transforms the value of a successful result and passes failures through unchanged. */
export function map<T, U, E>(result: Result<T, E>, transform: (value: T) => U): Result<U, E> {
  return result.ok ? ok(transform(result.value)) : result
}

/** Runs the next fallible step on a successful value and passes failures through unchanged. */
export function andThen<T, U, E, F>(
  result: Result<T, E>,
  next: (value: T) => Result<U, F>
): Result<U, E | F> {
  return result.ok ? next(result.value) : result
}
