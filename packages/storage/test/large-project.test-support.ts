import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PARAGRAPH = 'Ilka walked the north rows again, counting the trees that had gone white with salt. יעל הלכה אחריה, שותקת. The ferry horn sounded twice from Szeged, and nobody answered it.'

/**
 * A large book, generated rather than committed: 150 chapters of about 20 KB in 15 parts, and an
 * outline of 2,000 cards with details (Milestone 6, decision 6).
 */
export async function generateLargeProject(root: string): Promise<void> {
  await mkdir(join(root, 'manuscript'), { recursive: true })
  await mkdir(join(root, 'outlines'), { recursive: true })
  await writeFile(join(root, 'project.md'), '---\ntitle: A Long Book\nlanguage: en\nchapterNumbering: continuous\nid: prj-l4rg3b\nschemaVersion: 1\n---\n')
  const body = Array.from({ length: 110 }, () => PARAGRAPH).join('\n\n') + '\n'
  const contents = ['# A Long Book', '']
  for (let part = 1; part <= 15; part++) {
    contents.push(`- Part ${part}`)
    for (let n = 1; n <= 10; n++) {
      const number = (part - 1) * 10 + n
      const file = `chapter-${String(number).padStart(3, '0')}.md`
      await writeFile(join(root, 'manuscript', file), `---\ntitle: Chapter ${number}\nid: ch-${String(number).padStart(6, '0')}\n---\n${body}`)
      contents.push(`  - [Chapter ${number}](manuscript/${file})`)
    }
  }
  await writeFile(join(root, 'CONTENTS.md'), `${contents.join('\n')}\n`)
  const outline = ['# Everything', '']
  for (let section = 1; section <= 20; section++) {
    outline.push(`## Section ${section}`, '')
    for (let card = 1; card <= 100; card++) outline.push(`- Card ${section}.${card}: Ilka and the salt, see [Chapter ${card}](../manuscript/chapter-${String(card).padStart(3, '0')}.md)`, `  - A detail about card ${card}`)
    outline.push('')
  }
  await writeFile(join(root, 'outlines/everything.md'), outline.join('\n'))
}
