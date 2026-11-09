import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// The site in both languages and both themes: accessible, right to left in Hebrew, and complete.
const PAGES = [
  { name: 'the front page', path: '' },
  { name: 'the support page', path: 'support/' },
  { name: 'the languages page', path: 'languages/' },
  { name: 'the comparison page', path: 'compare/' },
  { name: 'a guide page', path: 'docs/writing/formatting/' },
]

/** English is the default, at the root; Hebrew is under /he/. */
const at = (lang: 'en' | 'he', path: string): string => (lang === 'en' ? `/${path}` : `/he/${path}`)

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

for (const { name, path } of PAGES) {
  for (const lang of ['en', 'he'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${name}, ${lang}, ${theme}: no serious accessibility problems`, async ({ page }) => {
        await open(page, at(lang, path), theme)
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
        const serious = results.violations
          .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
          .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)
        expect(serious).toEqual([])
      })
    }

    test(`${name}, ${lang}: in its language and direction, and fits a phone`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      await page.goto(at(lang, path))
      await expect(page.locator('html')).toHaveAttribute('lang', lang)
      await expect(page.locator('html')).toHaveAttribute('dir', lang === 'he' ? 'rtl' : 'ltr')
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    })
  }
}

test('Hebrew pages run right to left, with code and file names left to right', async ({ page }) => {
  await page.goto('/he/docs/technical/files/chapters/')
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
  await open(page, '/he/', 'light')
  const images = page.locator('.shot img.only-light')
  expect(await images.count()).toBeGreaterThan(4)
  for (const image of await images.all()) expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  const hebrew = await images.first().getAttribute('src')
  await page.goto('/')
  expect(await page.locator('.shot img.only-light').first().getAttribute('src')).not.toBe(hebrew)
})

test('the footer offers the same page in the other language', async ({ page }) => {
  await page.goto('/he/support/')
  await page.locator('.site-footer a[hreflang="en"]').click()
  await expect(page).toHaveURL(/:\d+\/support\/$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.locator('.site-footer a[hreflang="he"]').click()
  await expect(page).toHaveURL(/\/he\/support\/$/)
})

test('the guide’s language menu goes to the same guide page in the other language', async ({ page }) => {
  await page.goto('/docs/writing/formatting/')
  await page.locator('starlight-lang-select select:visible').selectOption({ label: 'עברית' })
  await expect(page).toHaveURL(/\/he\/docs\/writing\/formatting\/$/)
})

test('the header links lead to the site’s pages, from the guide too', async ({ page }) => {
  await page.goto('/he/docs/start/install/')
  const links = page.locator('.site-links:visible a')
  await expect(links).toHaveText(['למה Plot Device', 'מדריך', 'תמיכה'])
  await links.nth(2).click()
  await expect(page).toHaveURL(/\/he\/support\/$/)
})

test('the guide’s own address starts at installing', async ({ page }) => {
  await page.goto('/docs/')
  await expect(page).toHaveURL(/:\d+\/docs\/start\/install\/$/)
})

test('a missing page answers in its own language', async ({ page }) => {
  const response = await page.goto('/he/docs/no-such-page/')
  expect(response?.status()).toBe(404)
  await expect(page.locator('html')).toHaveAttribute('lang', 'he')
})

test('asking for a language: a form Netlify keeps, filled in and sent by keyboard alone', async ({ page }) => {
  await page.goto('/he/languages/')
  const form = page.locator('form[name="language-request"]')
  await expect(form).toHaveAttribute('data-netlify', 'true')
  await expect(form).toHaveAttribute('netlify-honeypot', 'bot-field')
  await expect(form.locator('input[type="hidden"][name="form-name"]')).toHaveValue('language-request')
  await expect(form.locator('input[name="bot-field"]')).toBeHidden()

  await page.getByLabel('שפה', { exact: true }).focus()
  await page.keyboard.type('Español')
  await page.keyboard.press('Tab')
  await page.keyboard.type('writer@example.com')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Gracias')
  await page.keyboard.press('Tab')
  await expect(form.locator('button[type="submit"]')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/he\/languages\/thanks\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('תודה')
})

test('the root is the English front page, with a language menu in the top bar, also on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write the novel. Keep the files.')
  const menu = page.locator('header starlight-lang-select select:visible')
  await expect(menu).toHaveCount(1)
  await menu.selectOption({ label: 'עברית' })
  await expect(page).toHaveURL(/\/he\/$/)
})

test('the install page offers Windows, Linux and macOS, with macOS coming soon', async ({ page }) => {
  await page.goto('/docs/start/install/')
  await expect(page.getByRole('tab')).toHaveText(['Windows', 'Linux', 'macOS'])
  await page.getByRole('tab', { name: 'macOS' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Coming soon')
})

test.describe('a browser that prefers Hebrew', () => {
  test.use({ locale: 'he-IL' })

  test('is sent from the root to the Hebrew front page on its first visit', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/he\/$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'he')
  })

  test('keeps English once the reader chooses it', async ({ page }) => {
    await page.goto('/')
    await page.locator('header starlight-lang-select select:visible').selectOption({ label: 'English' })
    await expect(page).toHaveURL(/:\d+\/$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('reaches an English page by its own address', async ({ page }) => {
    await page.goto('/support/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })
})

test('the guide’s sidebar lists only guide pages; the technical docs have their own, with a way back', async ({ page }) => {
  await page.goto('/docs/writing/formatting/')
  const guide = page.locator('#starlight__sidebar')
  await expect(guide.getByRole('link', { name: 'Formatting' })).toBeVisible()
  await expect(guide.locator('a[href*="/technical/"]')).toHaveCount(0)
  await expect(page.locator('.starlight-sidebar-topics')).toHaveCount(0)

  await page.goto('/he/docs/technical/files/folder/')
  const technical = page.locator('#starlight__sidebar')
  await expect(technical.locator('a[href*="/writing/"]')).toHaveCount(0)
  await technical.getByRole('link', { name: '→ חזרה למדריך' }).click()
  await expect(page).toHaveURL(/\/he\/docs\/start\/install\/$/)
})

test('the technical docs are reached from the footer, not the header', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.site-links a[href*="/technical/"]')).toHaveCount(0)
  await page.locator('.site-footer').getByRole('link', { name: 'Technical docs' }).click()
  await expect(page).toHaveURL(/\/docs\/technical\/files\/folder\/$/)
})

test('the comparison table keeps its row names in view while it scrolls on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/compare/')
  const box = page.getByRole('region', { name: /compared/ })
  await expect(box).toBeVisible()
  const rowName = box.locator('tbody th[scope="row"]').first()
  const before = await rowName.boundingBox()
  await box.evaluate((element) => element.scrollBy(400, 0))
  expect((await rowName.boundingBox())?.x).toBe(before?.x)
  await expect(page.getByRole('columnheader', { name: 'Plot Device' })).toBeAttached()
})
