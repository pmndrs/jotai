import React from 'react'
import cx from 'classnames'
import { Link } from 'gatsby'

import { Logo } from '../components'

export const Jotai = ({ isDocsPage = false, small = false, ...rest }) => {
  return (
    <div {...rest}>
      <h1>
        <Link to="/" className="inline-block focus:ring-offset-4 rounded-lg">
          <Logo
            className={cx(
              isDocsPage || small
                ? 'text-gray-300 hover:text-black transition ease-in-out duration-300'
                : 'text-black',
              !small
                ? 'w-full max-w-[12rem] lg:max-w-[16rem] 2xl:max-w-[18rem]'
                : 'w-[4rem]'
            )}
          />
        </Link>
        <span className="sr-only">Jotai</span>
      </h1>
      <div
        className={cx(
          !small
            ? 'mt-2 2xl:mt-6 space-x-6 lg:space-x-4 2xl:space-x-6 text-gray-400'
            : 'relative -top-1 space-x-2 text-[#bcbcbc]',
          'flex items-center '
        )}>
        <div
          className={cx(
            !small ? 'text-lg 2xl:text-xl' : 'text-xs',
            'whitespace-nowrap'
          )}>
          状態
        </div>
        <div
          className={cx(
            !small
              ? 'text-sm 2xl:text-base leading-snug'
              : 'text-xs leading-tight'
          )}>
          Primitive and flexible state management for React
        </div>
      </div>
    </div>
  )
}
