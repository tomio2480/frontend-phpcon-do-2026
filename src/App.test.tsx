import { render, screen } from '@testing-library/preact'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).not.toBeNull()
    expect(heading.textContent).toContain('北海道')
  })
})
