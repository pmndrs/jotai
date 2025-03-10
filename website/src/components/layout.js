import { ClientOnly } from '../components/client-only.js'
import { Footer } from '../components/footer.js'
import { Main } from '../components/main.js'
import { Menu } from '../components/menu.js'
import { SearchModal } from '../components/search-modal.js'
import { Shelf } from '../components/shelf.js'
import { Sidebar } from '../components/sidebar.js'
import { SupportModal } from '../components/support-modal.js'
import { Toggle } from '../components/toggle.js'
import { Wrapper } from '../components/wrapper.js'

export const Layout = ({ isDocs = false, children }) => {
  return (
    <>
      <Wrapper>
        <Sidebar isDocs={isDocs} />
        <Main>
          <div className="prose">{children}</div>
          <Footer />
        </Main>
        <Shelf />
      </Wrapper>
      <ClientOnly>
        <Toggle />
      </ClientOnly>
      <SearchModal />
      <SupportModal />
      <Menu />
    </>
  )
}
