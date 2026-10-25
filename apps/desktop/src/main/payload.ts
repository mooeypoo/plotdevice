/** A refused request. Only its message crosses to the renderer, never a stack or internals. */
export class IpcRefused extends Error {}

interface Schema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false }
}

/** The payload, validated; anything else is refused, because the renderer is treated as untrusted. */
export function parsePayload<T>(schema: Schema<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload)
  if (!parsed.success) throw new IpcRefused('invalid-payload')
  return parsed.data
}
