import { useSetAtom } from 'jotai';
import { helpAtom } from '../atoms/index.js';
import { Button } from '../components/button.js';
import { Credits } from '../components/credits.js';
import { Docs } from '../components/docs.js';
import { Jotai } from '../components/jotai.js';
import { SearchButton } from '../components/search-button.js';

export const Sidebar = ({ showDocs = false }) => {
  const setShowHelp = useSetAtom(helpAtom);

  return (
    <aside className="scrollbar sticky top-0 hidden h-full max-h-screen min-h-full w-full flex-shrink-0 flex-col justify-between overflow-y-scroll overscroll-none p-8 lg:flex lg:max-w-[288px] xl:max-w-[384px] xl:p-16 2xl:max-w-[448px]">
      <div className="flex-grow">
        <Jotai isDocsPage={showDocs} />
        <div className="mt-8 flex flex-col space-y-4">
          {/* <SearchButton /> */}
          {showDocs ? (
            <Button to="/" icon="home">
              主页
            </Button>
          ) : (
            <Button to="/docs/introduction" icon="book">
              文档
            </Button>
          )}
          {showDocs && (
            <div className="px-3">
              <Docs />
            </div>
          )}
          <Button icon="chalkboard" to="https://tutorial.jotai.org" external>
            教程
          </Button>
          <Button icon="help" onClick={() => setShowHelp(true)}>
            支持
          </Button>
          <Button icon="github" to="https://github.com/pmndrs/jotai" external>
            仓库
          </Button>
          <Button icon="npm" to="https://www.npmjs.com/package/jotai" external>
            包
          </Button>
          <Button icon="discord" to="https://discord.gg/poimandres" external>
            社区
          </Button>
          <Button icon="twitter" to="https://twitter.com/jotaijs" external>
            更新
          </Button>
        </div>
      </div>
      <div className="mt-6 inline-flex flex-col space-y-1.5 text-center">
        <Credits />
      </div>
    </aside>
  );
};
