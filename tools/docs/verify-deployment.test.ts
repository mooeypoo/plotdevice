import { describe, expect, it } from 'vitest'
import { verifyDeployment } from './verify-deployment'
import { versionFeed, type ReleaseState } from '../release/published-release'

const state: ReleaseState = {
  schemaVersion: 1,
  source: 'github',
  generatedAt: '2026-10-20T12:00:00.000Z',
  stable: null
}

describe('anonymous deployment verification', () => {
  it('verifies the exact deployed feed and human URLs without auth headers', async () => {
    const calls: string[] = []
    const request: typeof fetch = (input, options) => {
      calls.push(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      expect(JSON.stringify(options?.headers ?? {})).not.toMatch(/authorization|token/i)
      return Promise.resolve(
        new Response(options?.method === 'HEAD' ? null : JSON.stringify(versionFeed(state)), {
          headers: { 'content-type': 'application/json' }
        })
      )
    }
    await verifyDeployment(state, request)
    expect(calls).toHaveLength(4)
    expect(calls[0]).toBe('https://mooeypoo.github.io/plotdevice/updates/v1/latest.json')
  })

  it.each(['old-feed', 'not-json', 'unavailable', 'oversize', 'page-unavailable', 'network'])(
    'rejects %s instead of reporting successful deployment',
    async (kind) => {
      const request: typeof fetch = (_input, options) => {
        if (kind === 'network') return Promise.reject(new Error('Offline'))
        if (options?.method === 'HEAD') {
          return Promise.resolve(
            new Response(null, { status: kind === 'page-unavailable' ? 404 : 200 })
          )
        }
        const text =
          kind === 'oversize'
            ? 'x'.repeat(70_000)
            : JSON.stringify(
                versionFeed({
                  ...state,
                  generatedAt: kind === 'old-feed' ? '2025-01-01T00:00:00.000Z' : state.generatedAt
                })
              )
        return Promise.resolve(
          new Response(text, {
            status: kind === 'unavailable' ? 404 : 200,
            headers: { 'content-type': kind === 'not-json' ? 'text/html' : 'application/json' }
          })
        )
      }
      await expect(verifyDeployment(state, request)).rejects.toThrow()
    }
  )
})
