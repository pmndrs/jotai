import { ClientOnly } from '../components/client-only.js';
import { Footer } from '../components/footer.js';
import { Main } from '../components/main.js';
import { Menu } from '../components/menu.js';
import { SearchModal } from '../components/search-modal.js';
import { Sidebar } from '../components/sidebar.js';
import { SupportModal } from '../components/support-modal.js';
import { Toggle } from '../components/toggle.js';
import { Wrapper } from '../components/wrapper.js';

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
      <ClientOnly>
        <Toggle />
      </ClientOnly>
      <SearchModal />
      <SupportModal />
    </>
  );
};
