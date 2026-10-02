import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

// jsdom lacks these; Radix/motion touch them.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= RO as unknown as typeof ResizeObserver

class IO {
  private cb: IntersectionObserverCallback
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb
  }
  observe(el: Element) {
    this.cb([{ isIntersecting: true, target: el, intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
globalThis.IntersectionObserver ??= IO as unknown as typeof IntersectionObserver

// ProseMirror (Tiptap) asks for layout info that jsdom doesn't implement.
const emptyRects = () => Object.assign([], { item: () => null }) as unknown as DOMRectList
const zeroRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect
if (!Range.prototype.getClientRects) Range.prototype.getClientRects = emptyRects
if (!Range.prototype.getBoundingClientRect) Range.prototype.getBoundingClientRect = zeroRect
if (!Element.prototype.getClientRects) Element.prototype.getClientRects = emptyRects
if (!document.elementFromPoint) document.elementFromPoint = () => null
