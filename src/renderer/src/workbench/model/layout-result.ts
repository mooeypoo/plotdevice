/** The outcome of a model operation that can be refused, in the same shape as `ApiResult`. */
export type LayoutResult<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }

/** Wraps a value as a successful result. */
export function succeed<T>(value: T): { readonly ok: true; readonly value: T } {
  return { ok: true, value }
}

/** Wraps a semantic refusal; the presentation layer chooses its words. */
export function refuse<E>(error: E): { readonly ok: false; readonly error: E } {
  return { ok: false, error }
}
