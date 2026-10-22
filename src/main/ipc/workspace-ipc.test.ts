import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createUiLanguageService } from '../ui-language'
import { showFolderDialog } from './workspace-ipc'

const electronMock = vi.hoisted(() => ({
  showOpenDialog: vi.fn<
    (options: { title?: string; properties?: readonly string[] }) => Promise<{
      canceled: boolean
      filePaths: string[]
    }>
  >()
}))

vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: vi.fn() },
  dialog: { showOpenDialog: electronMock.showOpenDialog }
}))

beforeEach(() => {
  vi.clearAllMocks()
})

async function createLanguageService(): Promise<
  Awaited<ReturnType<typeof createUiLanguageService>>
> {
  return createUiLanguageService(
    {
      load: () => Promise.resolve({ ok: true, value: 'en' }),
      save: () => Promise.resolve({ ok: true, value: undefined })
    },
    [],
    vi.fn()
  )
}

describe('showFolderDialog', () => {
  it.each([
    ['en', 'Open or create a project folder'],
    ['he', 'פתיחה או יצירה של תיקיית פרויקט']
  ] as const)('uses the selected %s title and returns the chosen folder', async (locale, title) => {
    const language = await createLanguageService()
    if (locale !== 'en') await language.set(locale)
    electronMock.showOpenDialog.mockResolvedValueOnce({
      canceled: false,
      filePaths: ['/novels']
    })

    await expect(showFolderDialog(null, language)).resolves.toBe('/novels')
    expect(electronMock.showOpenDialog).toHaveBeenCalledExactlyOnceWith({
      title,
      properties: ['openDirectory', 'createDirectory']
    })
  })

  it('preserves cancellation without turning it into a folder selection', async () => {
    const language = await createLanguageService()
    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] })

    await expect(showFolderDialog(null, language)).resolves.toBeUndefined()
    expect(electronMock.showOpenDialog).toHaveBeenCalledExactlyOnceWith({
      title: 'Open or create a project folder',
      properties: ['openDirectory', 'createDirectory']
    })
  })
})
