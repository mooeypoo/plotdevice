import type { IdGenerator } from '@plotdevice/application'
import { randomInt } from 'node:crypto'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** `ch-k3f9q2`: a prefix and six random characters, about 2 billion values per prefix (ADR 0008). */
export const randomIdGenerator: IdGenerator = {
  next: (prefix) => `${prefix}-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`,
}
