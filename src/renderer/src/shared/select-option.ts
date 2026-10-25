/** One choice in a {@link SelectField}. `lang` and `dir` mark choices written in another script. */
export interface SelectOption {
  readonly value: string
  readonly label: string
  readonly disabled?: boolean
  readonly lang?: string
  readonly dir?: 'ltr' | 'rtl' | 'auto'
  /** Extra detail shown on hover, such as a file path. */
  readonly title?: string
}
