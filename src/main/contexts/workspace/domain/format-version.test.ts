import { describe, expect, it } from 'vitest'
import { readFormatVersion, SUPPORTED_FORMAT_VERSION } from './format-version'

describe('readFormatVersion', () => {
  it('accepts the supported version', () => {
    expect(readFormatVersion(1)).toEqual({ version: 1, readOnly: false })
  })

  it('assumes version 1 when the key is missing', () => {
    expect(readFormatVersion(undefined)).toMatchObject({
      version: 1,
      readOnly: false,
      warning: { code: 'format-missing' }
    })
  })

  it('opens a newer format read-only', () => {
    expect(readFormatVersion(SUPPORTED_FORMAT_VERSION + 1)).toMatchObject({
      version: SUPPORTED_FORMAT_VERSION + 1,
      readOnly: true,
      warning: { code: 'format-newer', version: SUPPORTED_FORMAT_VERSION + 1 }
    })
  })

  it.each([0, -1, 1.5, '1', 'one', null, [1]])('treats %j as version 1 with a warning', (value) => {
    expect(readFormatVersion(value)).toMatchObject({
      version: 1,
      readOnly: false,
      warning: { code: 'format-invalid', value: JSON.stringify(value) }
    })
  })
})
