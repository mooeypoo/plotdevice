import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// The site in both languages and both themes: accessible, right to left in Hebrew, and complete.
const PAGES = [
  { name: 'the front page', en: '/plotdevice/', he: '/plotdevice/he/' },
  { name: 'a guide page', en: '/plotdevice/writing/formatting/', he: '/plotdevice/he/writing/formatting/' },
]

async function open(page: Page, path: string, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((chosen) => localStorage.setItem('starlight-theme', chosen), theme)
  await page.goto(path)
  // Screenshots load lazily; bring them all in, as a reader scrolling would.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  })
}

for (const { name, en, he } of PAGES) {
  for (const [lang, path] of [
    ['English', en],
    ['Hebrew', he],
  ] as const) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${name}, ${lang}, ${theme}: no serious accessibility problems`, async ({ page }) => {
        await open(page, path, theme)
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
        const serious = results.violations
          .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
          .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)
        expect(serious).toEqual([])
      })
    }
  }
}

test('Hebrew pages run right to left, with code and file names left to right', async ({ page }) => {
  await page.goto('/plotdevice/he/files/chapters/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'he')
  expect(
    await page
      .locator('pre')
      .first()
      .evaluate((pre) => getComputedStyle(pre).direction),
  ).toBe('ltr')
})

test('every screenshot on the front page has loaded, in the reader’s language', async ({ page }) => {
  await open(page, '/plotdevice/he/', 'light')
  const images = page.locator('.shot img.only-light')
  expect(await images.count()).toBeGreaterThan(4)
  for (const image of await images.all()) expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
})
