import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchIconify } from '../../src/lib/iconify'

const mockResponse = {
  total: 2,
  hits: [
    { provider: 'mdi', prefix: 'mdi', name: 'home', body: '<svg/>' },
    { provider: 'mdi', prefix: 'mdi', name: 'account', body: '<svg/>' },
  ],
}

describe('searchIconify', () => {
  let realFetch: typeof global.fetch

  beforeEach(() => {
    realFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = realFetch
    vi.restoreAllMocks()
  })

  it('parses hits and returns IconResult array', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) } as any))

    const results = await searchIconify('home', 10, 0)

    expect(results).toHaveLength(2)
    expect(results[0].prefix).toBe('mdi')
    expect(results[0].name).toBe('home')
    expect(results[1].name).toBe('account')
  })

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false } as any))

    await expect(searchIconify('x', 5, 0)).rejects.toThrow('Network error')
  })

  it('parses icons string array format', async () => {
    const resp = { icons: ['mdi:user', 'solar:user-outline'] }
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(resp) } as any))

    const results = await searchIconify('user', 10, 0)
    expect(results).toHaveLength(2)
    expect(results[0].prefix).toBe('mdi')
    expect(results[0].name).toBe('user')
    expect(results[1].prefix).toBe('solar')
    expect(results[1].name).toBe('user-outline')
  })
})
