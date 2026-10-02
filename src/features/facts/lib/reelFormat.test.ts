import { describe, expect, it } from 'vitest'
import { compactCount, hostOf, timeAgo } from './reelFormat'

describe('reel formatting', () => {
  it('compactCount', () => {
    expect(compactCount(3)).toBe('3')
    expect(compactCount(1240)).toBe('1.2K')
    expect(compactCount(2_500_000)).toBe('2.5M')
    expect(compactCount(undefined)).toBe('0')
  })

  it('timeAgo', () => {
    const now = Date.parse('2026-10-02T12:00:00Z')
    expect(timeAgo('2026-10-02T11:59:40Z', now)).toBe('just now')
    expect(timeAgo('2026-10-02T09:00:00Z', now)).toBe('3 hours ago')
    expect(timeAgo('2026-09-30T08:00:00Z', now)).toBe('2 days ago')
    expect(timeAgo('2026-09-10T08:00:00Z', now)).toBe('3 weeks ago')
    expect(timeAgo('2026-08-25T08:00:00Z', now)).toBe('last month')
    expect(timeAgo(null, now)).toBe('')
    expect(timeAgo('nope', now)).toBe('')
  })

  it('hostOf', () => {
    expect(hostOf('https://www.en.wikipedia.org/wiki/Octopus')).toBe('en.wikipedia.org')
    expect(hostOf('not a url')).toBe('')
  })
})
