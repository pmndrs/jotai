import {
  Footer,
  Main,
  Menu,
  SearchModal,
  Sidebar,
  Wrapper,
} from '../components'

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
      <SearchModal />
    </>
  )
}
