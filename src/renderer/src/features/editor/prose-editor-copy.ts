/** Interface-language copy used by the mounted prose editor and its link decorations. */
export interface ProseEditorCopy {
  readonly accessibleLabel: string
  readonly placeholder: string
  readonly linkTooltip: (target: string, embed: boolean) => string
}
