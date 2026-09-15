import { test, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tabs from './Tabs'

const tabs = [
  {
    title: 'Tab 1',
    key: 'tab-1',
    children: <h1>First Tab Content</h1>
  },
  {
    title: 'Tab 2',
    key: 'tab-2',
    children: <h1>Second Tab Content</h1>
  }
]

beforeEach(() => {
  delete window.location
  window.location = { href: 'http://localhost/', search: '' }
  window.history.replaceState = vi.fn()
})

test('renders first tab by default', () => {
  render(<Tabs tabs={tabs} />)
  expect(screen.getByText('First Tab Content')).toBeInTheDocument()
  expect(screen.queryByText('Second Tab Content')).not.toBeInTheDocument()
})

test('clicking a tab switches content and updates URL', async () => {
  const user = userEvent.setup()
  render(<Tabs tabs={tabs} />)

  expect(screen.getByText('First Tab Content')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Tab 2' }))

  expect(screen.queryByText('First Tab Content')).not.toBeInTheDocument()
  expect(screen.getByText('Second Tab Content')).toBeInTheDocument()
  expect(window.history.replaceState).toHaveBeenCalledWith(
    {},
    '',
    expect.objectContaining({
      searchParams: expect.any(URLSearchParams)
    })
  )
})

test('initializes from URL query param', () => {
  window.location.search = '?activeTab=tab-2'
  render(<Tabs tabs={tabs} />)
  expect(screen.getByText('Second Tab Content')).toBeInTheDocument()
})
