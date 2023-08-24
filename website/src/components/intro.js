import { InlineCode } from '../components/inline-code.js';
import { Jotai } from '../components/jotai.js';

export const Intro = () => {
  return (
    <header>
      <Jotai className="max-w-xs lg:hidden" />
      <div className="mt-8 flex items-center space-x-4 sm:space-x-8 sm:px-16 lg:mt-0 lg:px-0">
        <div className="relative w-1/3 max-w-[215px] lg:w-1/4">
          <img
            src="https://storage.googleapis.com/candycode/jotai/jotai-mascot.png"
            title="Atomikku, the Jotai mascot"
            alt="Atomikku, the Jotai mascot"
          />
          <div className="absolute -right-2 -bottom-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-lg font-black text-white shadow-md dark:bg-white dark:text-black dark:!shadow-none lg:-right-4 lg:-bottom-6 lg:h-[4.5rem] lg:w-[4.5rem] lg:text-[2rem]">
            v2
          </div>
        </div>
        <div className="relative w-2/3 space-y-4 rounded-xl bg-gray-100 p-4 text-sm leading-snug text-gray-800 dark:bg-gray-900 dark:text-gray-300 sm:text-base md:text-lg lg:w-3/4 lg:p-8 lg:leading-normal after:absolute after:left-0 after:top-1/2 after:w-0 after:h-0 after:-ml-6 after:-mt-4 after:border-solid after:border-transparent after:border-t-[16px] after:border-r-[24px] after:border-b-[16px] after:border-l-0 after:border-r-[#f5f5f5] after:dark:!border-r-[#171717]">
          <div>Welcome to Jotai v2!</div>
          <div>
            Fully compatible with React 18 and the upcoming <InlineCode dark>use</InlineCode> hook.
            Now with a store interface that can be used outside of React.
          </div>
          <div>Enjoy the new “Getting started” experience below!</div>
        </div>
      </div>
    </header>
  );
};
