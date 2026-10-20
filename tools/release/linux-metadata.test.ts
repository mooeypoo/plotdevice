import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { z } from 'zod'

describe('Linux software-center metadata', () => {
  const metadataPath = 'build/tech.moriel.plotdevice.metainfo.xml'
  const homepage = 'https://mooeypoo.github.io/plotdevice/'

  it('installs AppStream and license files at their system locations', () => {
    const configuration: unknown = parse(readFileSync('electron-builder.yml', 'utf8'))
    expect(configuration).toMatchObject({
      appId: 'tech.moriel.plotdevice',
      linux: {
        vendor: 'Moriel Schottlender',
        maintainer: 'Moriel Schottlender <mooeypoo@gmail.com>'
      },
      deb: {
        packageCategory: 'editors',
        fpm: [
          `${metadataPath}=/usr/share/metainfo/tech.moriel.plotdevice.metainfo.xml`,
          'build/debian-copyright=/usr/share/doc/plotdevice/copyright',
          'LICENSE=/usr/share/doc/plotdevice/LICENSE'
        ]
      }
    })
  })

  it('describes the real developer, GPL license, desktop identity, and documentation homepage', () => {
    const manifest: unknown = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(manifest).toMatchObject({ homepage, license: 'GPL-3.0-or-later' })
    const xml = readFileSync(metadataPath, 'utf8')
    for (const element of [
      '<id>tech.moriel.plotdevice</id>',
      '<metadata_license>CC0-1.0</metadata_license>',
      '<project_license>GPL-3.0-or-later</project_license>',
      '<developer id="tech.moriel">',
      '<name>Moriel Schottlender</name>',
      '<launchable type="desktop-id">plotdevice.desktop</launchable>',
      `<url type="homepage">${homepage}</url>`,
      `<url type="help">${homepage}guide/start.html</url>`
    ]) {
      expect(xml).toContain(element)
    }
    expect(xml).toContain('https://github.com/mooeypoo/plotdevice/issues')
    expect(xml).toContain(
      'https://raw.githubusercontent.com/mooeypoo/plotdevice/main/docs/images/editor.png'
    )
    expect(readFileSync('build/debian-copyright', 'utf8')).toContain('License: GPL-3.0-or-later')
  })

  it('keeps release dates in sync with dated candidate notes without inventing a release', () => {
    const manifest = z
      .object({ version: z.string() })
      .parse(JSON.parse(readFileSync('package.json', 'utf8')) as unknown)
    const changelog = readFileSync('CHANGELOG.md', 'utf8')
    const heading = changelog
      .split('\n')
      .find((line) => line.startsWith(`## [${manifest.version}] - `))
    const xml = readFileSync(metadataPath, 'utf8')
    if (heading === undefined) {
      expect(xml).toContain('<releases/>')
    } else {
      const date = heading.split(' - ')[1]
      expect(xml).toContain(`version="${manifest.version}"`)
      expect(xml).toContain(`date="${String(date)}"`)
    }
  })
})
