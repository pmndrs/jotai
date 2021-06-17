import React from 'react';
import cx from 'classnames';
import { useAtom } from 'jotai';

import { menuAtom } from '~atoms';
import { Logo, Panel, Button } from '~components';

export const Menu = () => {
  return (
    <aside className="xl:sticky xl:top-0 flex flex-col justify-between order-last xl:order-first w-full max-w-4xl mx-auto xl:max-w-lg xl:h-screen p-8 xl:p-16">
      <span className="xl:hidden mb-6">
        <Panel headline="More Resources" />
      </span>
      <div className="pt-10 order-last xl:order-first">
        <img
          src="/ghost_DRAFT.png"
          alt="Jotai mascot"
          className="w-full max-w-sm xl:max-w-full h-auto mx-auto object-contain"
        />
        <a
          href="https://jessiewaters.com"
          target="_blank"
          title="Jessie Waters"
          className="block mt-6 text-xs text-gray-400 text-center tracking-widest uppercase"
        >
          Artwork by Jessie Waters
        </a>
      </div>
      <nav className="flex flex-col mt-6 space-y-6">
        <Button to="https://docs.pmnd.rs/jotai" icon="book" external>
          Documentation
        </Button>
        <Button to="https://github.com/pmndrs/jotai" icon="github" external>
          Repository
        </Button>
        <Button to="https://www.npmjs.com/package/jotai" icon="npm" external>
          Package
        </Button>
        <Button to="https://twitter.com/dai_shi" icon="twitter" external>
          Updates
        </Button>
      </nav>
    </aside>
  );
};
