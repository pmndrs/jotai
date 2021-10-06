import React from 'react'

import { Wrapper, Sidebar, Main, Footer, Menu } from '../components'

export const Layout = ({ showDocs = false, children }) => {
  return (
    <>
      <Wrapper>
        <Sidebar showDocs={showDocs} />
        <Main>
          <div className="prose">{children}</div>
          <Footer />
        </Main>
      </Wrapper>
      <Menu />
    </>
  )
}
