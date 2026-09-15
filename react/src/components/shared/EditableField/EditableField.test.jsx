import { test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import EditableField from './EditableField'

function ControlledEditableField(props) {
  const [value, setValue] = useState(props.value)
  return <EditableField {...props} value={value} setValue={setValue} />
}

test('text read mode displays value', () => {
  render(<EditableField type='text' value='Test Value' editMode={false} />)
  expect(screen.getByText('Test Value')).toBeInTheDocument()
})

test('text edit mode renders input', () => {
  render(<EditableField type='text' value='Test' editMode={true} />)
  const input = screen.getByRole('textbox')
  expect(input).toBeInTheDocument()
  expect(input).toHaveValue('Test')
})

test('text onChange updates value', async () => {
  const user = userEvent.setup()
  render(<ControlledEditableField type='text' value='' editMode={true} />)

  const input = screen.getByRole('textbox')
  await user.type(input, 'New Text')

  expect(input).toHaveValue('New Text')
})

test('empty value shows emptyDisplayValue', () => {
  render(<EditableField type='text' value='' emptyDisplayValue='No value set' editMode={false} />)
  expect(screen.getByText('No value set')).toBeInTheDocument()
})

test('number formats with locale', () => {
  render(<EditableField type='number' value={1000} editMode={false} />)
  expect(screen.getByText('1,000')).toBeInTheDocument()
})

test('number applies prefix', () => {
  render(<EditableField type='number' value={50} prefix='$' editMode={false} />)
  expect(screen.getByText('$50')).toBeInTheDocument()
})

test('number onChange converts to Number type', async () => {
  const user = userEvent.setup()
  render(<ControlledEditableField type='number' value={0} editMode={true} />)

  const input = screen.getByRole('spinbutton')
  await user.clear(input)
  await user.type(input, '42')

  expect(input).toHaveValue(42)
})

test('number respects min/max/step', () => {
  render(<EditableField type='number' value={5} min={0} max={10} step={0.5} editMode={true} />)

  const input = screen.getByRole('spinbutton')
  expect(input).toHaveAttribute('min', '0')
  expect(input).toHaveAttribute('max', '10')
  expect(input).toHaveAttribute('step', '0.5')
})

test('number uses formatOptions', () => {
  render(
    <EditableField
      type='number'
      value={1234.56}
      formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
      editMode={false}
    />
  )
  expect(screen.getByText('1,234.56')).toBeInTheDocument()
})

test('select read mode displays value', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' }
  ]
  render(<EditableField type='select' value='opt1' options={options} editMode={false} />)
  expect(screen.getByText('opt1')).toBeInTheDocument()
})

test('select read mode uses displayValue override', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' }
  ]
  render(
    <EditableField
      type='select'
      value='opt1'
      displayValue='Custom Display'
      options={options}
      editMode={false}
    />
  )
  expect(screen.getByText('Custom Display')).toBeInTheDocument()
  expect(screen.queryByText('opt1')).not.toBeInTheDocument()
})

test('select edit mode renders select with options', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' }
  ]
  render(<EditableField type='select' value='opt1' options={options} editMode={true} />)

  const select = screen.getByRole('combobox')
  expect(select).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Option 2' })).toBeInTheDocument()
})

test('select onChange updates value', async () => {
  const user = userEvent.setup()
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' }
  ]
  render(<ControlledEditableField type='select' value='opt1' options={options} editMode={true} />)

  await user.selectOptions(screen.getByRole('combobox'), 'opt2')

  expect(screen.getByRole('combobox')).toHaveValue('opt2')
})

test('select options render with key/value/label', () => {
  const options = [
    { value: 'val1', label: 'Label 1' },
    { value: 'val2', label: 'Label 2' }
  ]
  render(<EditableField type='select' value='val1' options={options} editMode={true} />)

  const option1 = screen.getByRole('option', { name: 'Label 1' })
  const option2 = screen.getByRole('option', { name: 'Label 2' })

  expect(option1).toHaveValue('val1')
  expect(option2).toHaveValue('val2')
})

test('routes select type to EditableSelectField', () => {
  const options = [{ value: 'opt1', label: 'Option 1' }]
  render(<EditableField type='select' value='opt1' options={options} editMode={true} />)

  expect(screen.getByRole('combobox')).toBeInTheDocument()
})

test('routes text/number to BasicEditableField', () => {
  const { rerender } = render(<EditableField type='text' value='text' editMode={true} />)
  expect(screen.getByRole('textbox')).toBeInTheDocument()

  rerender(<EditableField type='number' value={42} editMode={true} />)
  expect(screen.getByRole('spinbutton')).toBeInTheDocument()
})
