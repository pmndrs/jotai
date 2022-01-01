import { Footer, Main, Menu, Sidebar, Wrapper } from '../components'

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
