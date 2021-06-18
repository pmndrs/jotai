import React from 'react';

import { Logo, Button } from '~components';

export const Intro = () => {
  return (
    <div>
      <h1 className="flex items-center w-full max-w-xs mt-8 lg:mt-0 px-4 lg:px-0 text-gray-800">
        <img src="/ghost_DRAFT.png" alt="Jotai mascot" className="lg:hidden w-1/3 pr-2" />
        <Logo className="w-2/3 lg:w-full pl-2 lg:pl-0" />
        <span className="sr-only">Jotai</span>
      </h1>
      <h2 className="flex items-center mt-8 lg:space-x-8 text-2xl lg:text-xl text-gray-400">
        <span className="hidden lg:inline whitespace-nowrap">状態</span>
        <span>Primitive and flexible state management for React</span>
      </h2>
      <h3 className="mt-8 text-lg lg:text-3xl text-gray-600 !leading-relaxed">
        No extra re-renders, state resides within React, you get the full benefits from suspense and
        concurrent features.
        <br />
        <br />
        It’s scalable from a simple React.useState replacement to a large scale application with
        complex requirements.
      </h3>
    </div>
  );
};
