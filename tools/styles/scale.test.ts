import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))
const renderer = join(root, 'src/renderer/src')

function styleFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return entry.name === 'preview' ? [] : styleFiles(path)
    return /\.(vue|css)$/u.test(entry.name) ? [path] : []
  })
}

/** The CSS of a file: a stylesheet, or a component's style blocks. */
function stylesOf(path: string, source: string): string {
  if (path.endsWith('.css')) return source
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gu)].map((m) => m[1]).join('\n')
}

const SCALED =
  /^(font-size|border(-[a-z-]+)?-radius|padding|margin|gap|row-gap|column-gap)(-[a-z-]+)?$/u
/** A size written as a number, other than 0 and a 1px hairline. */
const LITERAL = /(?<![\w-])(?!0(?:px|rem)\b|1px\b)\d+(?:\.\d+)?(px|rem)\b/u

/** Declarations that write a size the scales (ADR 0021) should give, without saying why. */
function offScale(css: string): string[] {
  return css.split('\n').flatMap((line, index) => {
    const declaration = /^\s*([a-z-]+)\s*:\s*([^;{}]+);/u.exec(line)
    if (declaration === null || line.includes('off-scale')) return []
    const [, property = '', value = ''] = declaration
    return SCALED.test(property) && LITERAL.test(value)
      ? [`line ${String(index + 1)}: ${line.trim()}`]
      : []
  })
}

describe('sizes', () => {
  // ADR 0021: type, space and corners come from the scales, so the app keeps one rhythm.
  it('come from the type, space and radius scales everywhere', () => {
    const strays = styleFiles(renderer).flatMap((file) =>
      offScale(stylesOf(file, readFileSync(file, 'utf8'))).map(
        (found) => `${relative(root, file)}: ${found}`
      )
    )
    expect(strays).toEqual([])
  })

  it('find a literal size, and accept tokens, hairlines, em and a reasoned exception', () => {
    const css = [
      'a {',
      '  padding: 6px var(--space-2);',
      '  font-size: var(--text-small);',
      '  border: 1px solid;',
      '  margin: 0 auto;',
      '  gap: 1px;',
      '  font-size: 1.2em;',
      '  border-radius: 7px;',
      '  font-size: 3rem; /* off-scale: the wordmark */',
      '}'
    ].join('\n')
    expect(offScale(css)).toEqual([
      'line 2: padding: 6px var(--space-2);',
      'line 8: border-radius: 7px;'
    ])
  })
})
