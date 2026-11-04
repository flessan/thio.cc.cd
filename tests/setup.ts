/**
 * jsdom is missing a few browser APIs the workspace uses. Provide the smallest
 * believable stand-ins so component tests exercise real code paths.
 */
import { beforeAll, vi } from 'vitest'

beforeAll(() => {
  if (typeof window === 'undefined') return

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })) as unknown as typeof window.matchMedia

  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()

  if (!navigator.clipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    })
  }

  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ ok: false, error: { code: 'not-connected' } }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    })
  ) as unknown as typeof fetch
})
