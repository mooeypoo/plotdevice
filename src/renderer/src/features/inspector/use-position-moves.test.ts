import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { usePositionMoves } from './use-position-moves'

let fake: ReturnType<typeof createFakePlotDeviceApi>

beforeEach(async () => {
  setActivePinia(createPinia())
  fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useManuscriptStore().load()
})

describe('usePositionMoves', () => {
  it('moves the first chapter down only', async () => {
    await useEditorStore().open('The Ferry.md')
    const moves = usePositionMoves()
    expect([moves.canMoveUp.value, moves.canMoveDown.value]).toEqual([false, true])
    await moves.moveDown()
    expect(fake.moves).toEqual(['The Ferry.md → Part One.md#1'])
  })

  it('moves the last chapter up', async () => {
    await useEditorStore().open('First frost.md')
    const moves = usePositionMoves()
    expect([moves.canMoveUp.value, moves.canMoveDown.value]).toEqual([true, false])
    await moves.moveUp()
    expect(fake.moves).toEqual(['First frost.md → Part One.md#0'])
  })

  it('offers the parts, and ignores a move to the part it is already in', async () => {
    await useEditorStore().open('First frost.md')
    const moves = usePositionMoves()
    expect(moves.partOptions.value.map((option) => option.path)).toEqual(['Part One.md'])
    await moves.moveToPart('Part One.md')
    expect(fake.moves).toEqual([])
  })

  it('places an unordered chapter at the end of a part', async () => {
    await useEditorStore().open('Lost.md')
    const moves = usePositionMoves()
    expect(moves.canMoveUp.value || moves.canMoveDown.value).toBe(false)
    await moves.moveToPart('Part One.md')
    expect(fake.moves).toEqual(['Lost.md → Part One.md#2'])
  })
})
