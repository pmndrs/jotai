import { fireEvent, render, waitFor } from '@testing-library/react'
import { createMachine } from 'xstate'
import { useAtom } from 'jotai'
import { RESET } from 'jotai/utils'
import { atomWithMachine } from 'jotai/xstate'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('toggle machine', async () => {
  const toggleMachine = createMachine({
    id: 'toggle',
    initial: 'inactive',
    on: { DISABLE: '.final' },
    states: {
      inactive: {
        on: { TOGGLE: 'active' },
      },
      active: {
        on: { TOGGLE: 'inactive' },
      },
      final: {
        type: 'final',
      },
    },
  })

  const toggleMachineAtom = atomWithMachine(() => toggleMachine)

  const Toggler = () => {
    const [state, send] = useAtom(toggleMachineAtom)

    return (
      <>
        <button
          onClick={() => send('TOGGLE')}
          disabled={state.value === 'final'}>
          {state.value === 'inactive'
            ? 'Click to activate'
            : state.value === 'active'
            ? 'Active! Click to deactivate'
            : 'Not actionable'}
        </button>
        <button
          onClick={() => {
            send(state.value === 'final' ? RESET : 'DISABLE')
          }}>
          {state.value === 'final' ? 'Restart machine' : 'Go to final state'}
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Toggler />
    </Provider>
  )

  await findByText('Click to activate')

  fireEvent.click(getByText('Click to activate'))
  await findByText('Active! Click to deactivate')

  fireEvent.click(getByText('Active! Click to deactivate'))
  await findByText('Click to activate')

  fireEvent.click(getByText('Go to final state'))
  await findByText('Not actionable')

  fireEvent.click(getByText('Restart machine'))
  await waitFor(() => expect(findByText('Click to activate')).toBeDefined())
})
