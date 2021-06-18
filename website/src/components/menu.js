import React from 'react';
import cx from 'classnames';
import { useAtom } from 'jotai';

import { menuAtom } from '~atoms';
import { Logo, Panel, Button } from '~components';

export const Menu = () => {
  return (
    <aside className="lg:sticky lg:top-0 flex flex-col justify-between order-last lg:order-first w-full max-w-4xl mx-auto lg:max-w-lg lg:h-screen p-8 lg:p-16">
      <span className="lg:hidden mb-6">
        <Panel headline="More Resources" />
      </span>
      <div className="pt-10 order-last lg:order-first">
        <img
          src="/ghost_DRAFT.png"
          alt="Jotai mascot"
          className="w-full max-w-sm lg:max-w-full h-auto mx-auto object-contain"
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
