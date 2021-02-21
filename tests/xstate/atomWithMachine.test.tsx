import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { createMachine } from 'xstate'
import { Provider, useAtom } from '../../src/index'
import { atomWithMachine } from '../../src/xstate'

it('toggle machine', async () => {
  const toggleMachine = createMachine({
    id: 'toggle',
    initial: 'inactive',
    states: {
      inactive: {
        on: { TOGGLE: 'active' },
      },
      active: {
        on: { TOGGLE: 'inactive' },
      },
    },
  })

  const toggleMachineAtom = atomWithMachine(() => toggleMachine)

  const Toggler: React.FC = () => {
    const [state, send] = useAtom(toggleMachineAtom)

    return (
      <button onClick={() => send('TOGGLE')}>
        {state.value === 'inactive'
          ? 'Click to activate'
          : 'Active! Click to deactivate'}
      </button>
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
})
