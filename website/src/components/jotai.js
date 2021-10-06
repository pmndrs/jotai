import React from 'react'
import cx from 'classnames'
import { Link } from 'gatsby'
import { useAtomValue } from 'jotai/utils'

import { docsAtom } from '../atoms'
import { Logo } from '../components'

export const Jotai = ({ small = false, ...rest }) => {
  const isDocsPage = useAtomValue(docsAtom)

  return (
    <div {...rest}>
      <h1 className="lg:px-2">
        <Link to="/" className="inline-block focus:ring-offset-4 rounded-lg">
          <Logo
            className={cx(
              isDocsPage
                ? 'text-gray-300 hover:text-black transition ease-in-out duration-300'
                : 'text-black',
              !small
                ? 'w-full max-w-[12rem] lg:max-w-[14rem] xl:max-w-[16rem] 2xl:max-w-[18rem]'
                : 'w-[6rem]'
            )}
          />
        </Link>
        <span className="sr-only">Jotai</span>
      </h1>
      <div
        className={cx(
          !small ? 'mt-2 lg:mt-8 space-x-6 lg:space-x-8' : 'space-x-4',
          'flex items-center text-gray-400 lg:text-gray-600'
        )}>
        <div
          className={cx(
            !small ? 'text-xl lg:text-2xl whitespace-nowrap' : 'hidden'
          )}>
          状態
        </div>
        <div
          className={cx(
            !small
              ? 'text-base lg:text-lg leading-snug'
              : 'text-xs leading-tight'
          )}>
          Primitive and flexible state management for React
        </div>
      </div>
    </div>
  )
}
