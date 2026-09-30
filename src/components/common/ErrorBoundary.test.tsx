import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function Boom({ explode }: { explode: boolean }): React.ReactElement {
  if (explode) throw new Error('boom')
  return <p>ok</p>
}

afterEach(cleanup)

describe('ErrorBoundary', () => {
  it('shows an error state instead of blanking, and resets on resetKey change', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Boom explode />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    rerender(
      <ErrorBoundary resetKey="/b">
        <Boom explode={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('ok')).toBeTruthy()
  })
})
