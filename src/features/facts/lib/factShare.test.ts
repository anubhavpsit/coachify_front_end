import { describe, expect, it } from 'vitest'
import { shareText } from './factShare'

describe('shareText', () => {
  it('question facts share the question and options as text, not HTML or the answer', () => {
    const content = '<p>Which surface has the <b>most</b> friction?</p><ol type="a"><li>Glass</li><li>Sandpaper &amp; grit</li></ol>'
    expect(shareText({ title: 'Solve it', content, fact_kind: 'question' })).toBe('Solve it\n\nWhich surface has the most friction?\n(a) Glass\n(b) Sandpaper & grit')
  })
  it('other facts are unchanged', () => {
    expect(shareText({ title: 'Honey', content: 'Never spoils.' })).toBe('Honey\n\nNever spoils.')
    expect(shareText({ title: 'Honey', content: null })).toBe('Honey')
  })
})
