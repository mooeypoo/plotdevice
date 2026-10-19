import type { FileProblemDto } from '../../../../contract/dtos'

/** A short, plain explanation of why a file can't be fully used. */
export function describeFileProblem(problem: FileProblemDto): string {
  switch (problem.problem) {
    case 'unreadable-file':
      return "Can't be read. Check the file's permissions."
    case 'invalid-encoding':
      return 'Not saved as UTF-8 text, so it is left untouched.'
    case 'unclosed-frontmatter':
      return 'The frontmatter block is never closed with ---.'
    case 'unparseable-frontmatter':
      return "The frontmatter isn't valid YAML, so it is left untouched."
    case 'unknown-type':
      return `Unknown type "${problem.detail ?? ''}", so it is listed as untyped.`
    case 'nested-project':
      return 'Another project (has its own novel.md). Its files are not part of this one.'
  }
}
