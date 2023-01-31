import { Footer } from '../components/footer';
import { Main } from '../components/main';
import { Menu } from '../components/menu';
import { SearchModal } from '../components/search-modal';
import { Sidebar } from '../components/sidebar';
import { SupportModal } from '../components/support-modal';
import { Toggle } from '../components/toggle';
import { Wrapper } from '../components/wrapper';

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
      <Toggle />
      <SearchModal />
      <SupportModal />
    </>
  );
};
