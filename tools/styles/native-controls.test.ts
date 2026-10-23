import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'vue/compiler-sfc'

const root = fileURLToPath(new URL('../../', import.meta.url))
const renderer = join(root, 'src/renderer/src')
const shared = join(renderer, 'shared')
const NATIVE_INPUTS = new Set(['checkbox', 'radio', 'range'])

// The template AST's node kinds (NodeTypes in @vue/compiler-core), which compiler-sfc doesn't re-export.
const ELEMENT = 1
const ATTRIBUTE = 6

interface TemplateNode {
  readonly type: number
  readonly tag?: string
  readonly props?: readonly { type: number; name: string; value?: { content: string } }[]
  readonly children?: readonly TemplateNode[]
  readonly loc: { readonly start: { readonly line: number } }
}

function vueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return vueFiles(path)
    return entry.name.endsWith('.vue') ? [path] : []
  })
}

function staticType(element: TemplateNode): string | undefined {
  return element.props?.find((prop) => prop.type === ATTRIBUTE && prop.name === 'type')?.value
    ?.content
}

/** Native selects, checkboxes, radios and ranges in a component's template. */
function nativeControls(source: string, filename: string): string[] {
  const found: string[] = []
  const visit = (nodes: readonly TemplateNode[]): void => {
    for (const node of nodes) {
      if (node.type !== ELEMENT) continue
      const type = staticType(node)
      if (node.tag === 'select') found.push(`<select> on line ${String(node.loc.start.line)}`)
      else if (node.tag === 'input' && type !== undefined && NATIVE_INPUTS.has(type))
        found.push(`<input type="${type}"> on line ${String(node.loc.start.line)}`)
      visit(node.children ?? [])
    }
  }
  const template = parse(source, { filename }).descriptor.template
  if (template?.ast) visit(template.ast.children as readonly TemplateNode[])
  return found
}

describe('native form controls', () => {
  // ADR 0021: every select, checkbox, switch and slider is one of the shared, styled controls.
  it('appear only inside the shared controls', () => {
    const strays = vueFiles(renderer)
      .filter((file) => !file.startsWith(shared))
      .flatMap((file) =>
        nativeControls(readFileSync(file, 'utf8'), file).map(
          (control) => `${relative(root, file)}: ${control}`
        )
      )
    expect(strays).toEqual([])
  })

  it('finds a native control nested anywhere in a template', () => {
    const source = `<template><div><label><input type="checkbox" /></label>
      <select><option>a</option></select><input type="text" /></div></template>`
    expect(nativeControls(source, 'Sample.vue')).toEqual([
      '<input type="checkbox"> on line 1',
      '<select> on line 2'
    ])
  })
})
