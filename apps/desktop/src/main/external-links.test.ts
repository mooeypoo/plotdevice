import { describe, expect, it } from 'vitest'
import { isAllowedExternalLink } from './external-links'

describe('links the app opens in the browser', () => {
  it('allows the author’s site and the documentation', () => {
    expect(isAllowedExternalLink('https://moriel.tech')).toBe(true)
    expect(isAllowedExternalLink('https://mooeypoo.github.io/plotdevice/')).toBe(true)
    expect(isAllowedExternalLink('https://mooeypoo.github.io/plotdevice/writing.html')).toBe(true)
  })

  it('refuses everything else, including look-alikes', () => {
    expect(isAllowedExternalLink('http://moriel.tech')).toBe(false)
    expect(isAllowedExternalLink('https://moriel.tech.example.com')).toBe(false)
    expect(isAllowedExternalLink('https://mooeypoo.github.io/other-project/')).toBe(false)
    expect(isAllowedExternalLink('https://mooeypoo.github.io/plotdevice-evil/')).toBe(false)
    expect(isAllowedExternalLink('file:///etc/passwd')).toBe(false)
    expect(isAllowedExternalLink('not a url')).toBe(false)
  })
})
