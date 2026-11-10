import { describe, expect, it } from 'vitest'
import { isAllowedExternalLink } from './external-links'

describe('links the app opens in the browser', () => {
  it('allows the author’s site and the documentation', () => {
    expect(isAllowedExternalLink('https://moriel.tech')).toBe(true)
    expect(isAllowedExternalLink('https://plotdevice.app/download/')).toBe(true)
    expect(isAllowedExternalLink('https://plotdevice.app/he/download/')).toBe(true)
    expect(isAllowedExternalLink('https://plotdevice.app.example.com/download/')).toBe(false)
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

describe('release notes, issue forms and the coffee page', () => {
  it('allows the project’s GitHub pages and the author’s coffee page', () => {
    expect(isAllowedExternalLink('https://github.com/mooeypoo/plotdevice/releases/tag/v0.4.0')).toBe(true)
    expect(isAllowedExternalLink('https://github.com/mooeypoo/plotdevice/issues/new?template=problem.yml&version=0.3.0')).toBe(true)
    expect(isAllowedExternalLink('https://buymeacoffee.com/mooeypoo')).toBe(true)
  })

  it('refuses other GitHub projects and other coffee pages', () => {
    expect(isAllowedExternalLink('https://github.com/mooeypoo/plotdevice-evil/releases')).toBe(false)
    expect(isAllowedExternalLink('https://github.com/someone/plotdevice/')).toBe(false)
    expect(isAllowedExternalLink('https://buymeacoffee.com/someone')).toBe(false)
  })
})

describe('the documentation in each language', () => {
  it('allows the Hebrew documentation, and any future language under the same site', () => {
    expect(isAllowedExternalLink('https://mooeypoo.github.io/plotdevice/he/')).toBe(true)
    expect(isAllowedExternalLink('https://mooeypoo.github.io/plotdevice/fr/writing/formatting/')).toBe(true)
  })
})
