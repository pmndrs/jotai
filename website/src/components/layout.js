import React from 'react'
import { useUpdateAtom, useHydrateAtoms } from 'jotai/utils'

import { homeAtom, docsAtom } from '../atoms'
import { Wrapper, Sidebar, Main, Footer, Menu } from '../components'

export const Layout = ({
  isHomePage = false,
  isDocsPage = false,
  children,
}) => {
  useHydrateAtoms([
    [homeAtom, isHomePage],
    [docsAtom, isDocsPage],
  ])

  const setIsHomePage = useUpdateAtom(homeAtom)
  const setIsDocsPage = useUpdateAtom(docsAtom)

  setIsHomePage(isHomePage)
  setIsDocsPage(isDocsPage)

  return (
    <>
      <Wrapper>
        <Sidebar />
        <Main>
          <div className="prose">{children}</div>
          <Footer />
        </Main>
      </Wrapper>
      <Menu />
    </>
  )
}
