import { logger } from "./logger";

export interface IconResult {
  provider: string
  prefix: string
  name: string
  body?: string
}

export async function searchIconify(query: string, limit = 50, offset = 0, signal?: AbortSignal) {
  if (!query) return [] as IconResult[]
  const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
  logger.debug('[iconify] fetch url', url)
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Network error')
  const data = await res.json()
  logger.debug('[iconify] raw response', data)
  let results: IconResult[] = []

  // Newer Iconify responses sometimes return an `icons` array with strings like 'mdi:user'
  if (Array.isArray(data.icons) && data.icons.every((i: any) => typeof i === 'string')) {
    results = data.icons.map((s: string) => {
      const parts = s.split(':')
      const prefix = parts[0] || ''
      const name = parts.slice(1).join(':') || ''
      return { provider: prefix, prefix, name } as IconResult
    })
  } else {
    results = (data.hits || data.results || []).map((h: any) => ({
      provider: h.provider || h.prefix || '',
      prefix: h.prefix || h.provider || '',
      name: h.name || h.id || h.body || '',
      body: h.body,
    }))
  }
  return results
}
