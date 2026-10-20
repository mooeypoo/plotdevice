// Renders SVG icons to PNG with Electron itself, so the project needs no image library.
//
//   electron tools/render-icons.mjs --out <dir> --sizes 512,256,32 icon.svg …
//   electron tools/render-icons.mjs --sheet preview.png a.svg b.svg …
//   electron tools/render-icons.mjs --app-icons      (all of the app's icons, from build/icon*.svg)
//
// Each SVG is drawn inline in a page that loads the bundled Literata, so text in an icon renders
// in the app's own typeface. (Run with ELECTRON_RUN_AS_NODE unset.)
import { app, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--inspect'))
const option = (name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args.splice(index, 2)[1]
}
const out = option('--out')
const sizes = (option('--sizes') ?? '512').split(',').map(Number)
const sheet = option('--sheet')
const appIcons = args.includes('--app-icons')
const svgs = args.filter((arg) => arg.endsWith('.svg'))

const fonts = resolve('src/renderer/src/assets/fonts/files')
const fontFace = ['latin', 'latin-ext']
  .map(
    (subset) => `@font-face { font-family: 'Literata Variable'; font-weight: 200 900;
      src: url(${pathToFileURL(join(fonts, `literata-${subset}-opsz-normal.woff2`))}) format('woff2-variations'); }`
  )
  .join('\n')

const page = (
  body,
  background = 'transparent'
) => `<!doctype html><html><head><meta charset="utf-8">
<style>${fontFace} html, body { margin: 0; background: ${background}; overflow: hidden; }
svg { display: block; } .sheet { display: flex; gap: 40px; padding: 32px; align-items: flex-end;
font: 14px system-ui; color: #888; } .item { display: flex; flex-direction: column; gap: 12px; width: 340px;
align-items: center; } .sizes { display: flex; gap: 14px; align-items: flex-end; }
.light { background: #f4f1ea; padding: 10px; border-radius: 8px; }</style></head>
<body>${body}</body></html>`

// One offscreen window for every image: creating a window per image fails to load after the first.
let canvas

async function capture(html, width, height) {
  canvas ??= new BrowserWindow({
    width: 1600,
    height: 1000,
    show: false,
    frame: false,
    transparent: true,
    useContentSize: true,
    webPreferences: { offscreen: true }
  })
  await canvas.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  await canvas.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
  await new Promise((done) => setTimeout(done, 200))
  const image = await canvas.webContents.capturePage({ x: 0, y: 0, width, height })
  return image.resize({ width, height, quality: 'best' }).toPNG()
}

const sized = (svg, size) => svg.replace('<svg ', `<svg width="${size}" height="${size}" `)

/**
 * An ICO file holding PNG images (supported since Windows Vista): a 6-byte header, a 16-byte
 * entry per image, then the images.
 */
function packIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)])
}

/**
 * The app's icons: the small design up to 32 px (where detail turns to mush), the full one above.
 * Linux gets a PNG per size in build/icons, Windows a multi-size ICO, the window its 512 px PNG.
 */
async function renderAppIcons() {
  const full = readFileSync('build/icon.svg', 'utf8')
  const small = readFileSync('build/icon-small.svg', 'utf8')
  const render = (size) => capture(page(sized(size <= 32 ? small : full, size)), size, size)
  mkdirSync('build/icons', { recursive: true })
  const images = []
  for (const size of [16, 24, 32, 48, 64, 128, 256, 512]) {
    const png = await render(size)
    writeFileSync(`build/icons/${size}x${size}.png`, png)
    images.push({ size, png })
  }
  const large = images.find((image) => image.size === 512).png
  writeFileSync('build/icon.png', large)
  writeFileSync('resources/icon.png', large)
  writeFileSync('build/icon.ico', packIco(images.filter((image) => image.size <= 256)))
}

app.disableHardwareAcceleration()
process.on('unhandledRejection', (error) => {
  console.error(error)
  app.exit(1)
})

app.whenReady().then(async () => {
  if (appIcons) await renderAppIcons()
  if (sheet !== undefined) {
    const items = svgs
      .map((file) => {
        const svg = readFileSync(file, 'utf8')
        const label = basename(file, '.svg')
        return `<div class="item">${sized(svg, 256)}<div class="sizes">${[64, 32, 16]
          .map((size) => sized(svg, size))
          .join(
            ''
          )}<div class="light sizes">${[64, 32, 16].map((size) => sized(svg, size)).join('')}</div></div>${label}</div>`
      })
      .join('')
    const width = svgs.length * 380 + 64
    writeFileSync(
      sheet,
      await capture(page(`<div class="sheet">${items}</div>`, '#0e0f11'), width, 420)
    )
  }
  if (out !== undefined) {
    mkdirSync(out, { recursive: true })
    for (const file of svgs) {
      const svg = readFileSync(file, 'utf8')
      for (const size of sizes) {
        const name =
          sizes.length === 1
            ? `${basename(file, '.svg')}.png`
            : `${basename(file, '.svg')}-${size}.png`
        writeFileSync(join(out, name), await capture(page(sized(svg, size)), size, size))
      }
    }
  }
  app.quit()
})
