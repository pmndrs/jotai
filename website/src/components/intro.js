import React from 'react';

import { Logo, Button } from '~components';

export const Intro = () => {
  return (
    <div>
      <h1 className="w-full max-w-xs mt-8 xl:mt-0 px-8 xl:px-0 text-gray-800">
        <Logo />
        <span className="sr-only">Jotai</span>
      </h1>
      <h2 className="flex items-center mt-8 space-x-8 text-xl text-gray-400">
        <span className="whitespace-nowrap">状態</span>
        <span>Primitive and flexible state management for React</span>
      </h2>
      <h3 className="mt-16 xl:mt-8 text-base xl:text-3xl text-gray-600 !leading-relaxed">
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
