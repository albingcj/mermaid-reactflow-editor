import React from 'react'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import IconSearch from '../src/components/IconSearch'

describe('IconSearch', () => {
  beforeEach(() => {
    // mock global fetch
    globalThis.fetch = vi.fn(async (input: any) => {
      const url = String(input)
      if (url.includes('api.iconify.design/search')) {
        return {
          ok: true,
          json: async () => ({ hits: [ { provider: 'mdi', prefix: 'mdi', name: 'account', body: '<svg/>' } ] })
        }
      }
      return { ok: false }
    }) as any
  })

  it('searches and shows results and calls onSelect', async () => {
    const onSelect = vi.fn()
    render(<IconSearch onSelect={onSelect} />)

    // type query
    const input = screen.getByPlaceholderText(/Search icons/i)
    fireEvent.change(input, { target: { value: 'user' } })

    const btn = screen.getByRole('button', { name: /Search/i })
    fireEvent.click(btn)

    // wait for icon to appear
    await waitFor(() => expect(screen.getByText(/account/)).toBeInTheDocument())

    const iconBtn = screen.getByRole('button', { name: /mdi:account/i })
    fireEvent.click(iconBtn)

    expect(onSelect).toHaveBeenCalled()
  })
})
