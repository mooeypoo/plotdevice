import { parseFileName } from '../../../shared-kernel/file-name'
import { joinProjectPath, type ProjectPath } from '../../../shared-kernel/project-path'
import type { CodexKind } from '../domain/codex-entry'
import type { CodexSettings } from '../domain/codex-settings'

/** Where a kind's template lives: `<template folder>/<kind>.md`. */
export function templatePath(settings: CodexSettings, kind: CodexKind): ProjectPath | undefined {
  const name = parseFileName(`${kind}.md`)
  return name.ok ? joinProjectPath(settings.templateFolder, name.value) : undefined
}
