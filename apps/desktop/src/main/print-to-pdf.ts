import type { PrintFont } from '@plotdevice/export'
import { BrowserWindow, session } from 'electron'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import literataItalic from '@fontsource-variable/literata/files/literata-latin-wght-italic.woff2?asset'
import literataExtItalic from '@fontsource-variable/literata/files/literata-latin-ext-wght-italic.woff2?asset'
import literataExtNormal from '@fontsource-variable/literata/files/literata-latin-ext-wght-normal.woff2?asset'
import literataNormal from '@fontsource-variable/literata/files/literata-latin-wght-normal.woff2?asset'
import notoSerifHebrew from '@fontsource-variable/noto-serif-hebrew/files/noto-serif-hebrew-hebrew-wght-normal.woff2?asset'

// The ranges each file covers, as the font packages' own CSS gives them.
const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
const LATIN_EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'
const HEBREW = 'U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F'

/** The app's own prose fonts (Literata, Noto Serif Hebrew), for the PDF. */
export const PRINT_FONTS: readonly PrintFont[] = [
  { family: 'Literata', url: pathToFileURL(literataNormal).href, style: 'normal', unicodeRange: LATIN },
  { family: 'Literata', url: pathToFileURL(literataExtNormal).href, style: 'normal', unicodeRange: LATIN_EXT },
  { family: 'Literata', url: pathToFileURL(literataItalic).href, style: 'italic', unicodeRange: LATIN },
  { family: 'Literata', url: pathToFileURL(literataExtItalic).href, style: 'italic', unicodeRange: LATIN_EXT },
  { family: 'Noto Serif Hebrew', url: pathToFileURL(notoSerifHebrew).href, style: 'normal', unicodeRange: HEBREW },
]
export const PRINT_FAMILIES = ['Literata', 'Noto Serif Hebrew'] as const

/**
 * Prints a self-contained page (`printHtml`) to PDF in a hidden window (Milestone 22). The window has
 * its own session that loads only local files, so nothing in the book can reach the network, and no
 * preload. The page is written to a temporary folder, which is removed afterwards.
 */
export async function printToPdf(html: string): Promise<Uint8Array> {
  const folder = await mkdtemp(join(tmpdir(), 'plotdevice-print-'))
  const printing = session.fromPartition('plotdevice-print')
  printing.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith('file:') }))
  const window = new BrowserWindow({
    show: false,
    webPreferences: { session: printing, sandbox: true, contextIsolation: true, nodeIntegration: false, spellcheck: false },
  })
  try {
    const page = join(folder, 'book.html')
    await writeFile(page, html, 'utf8')
    await window.loadFile(page)
    // Fonts load as text needs them; wait until every one is ready, or the PDF shows fallbacks.
    await window.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
    const pdf = await window.webContents.printToPDF({
      preferCSSPageSize: true,
      printBackground: false,
      generateDocumentOutline: true,
      generateTaggedPDF: true,
    })
    return new Uint8Array(pdf)
  } finally {
    window.destroy()
    await rm(folder, { recursive: true, force: true })
  }
}
