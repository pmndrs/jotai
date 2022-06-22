import { Jotai } from '../components';

export const Intro = () => {
  return (
    <header>
      <Jotai className="max-w-xs lg:hidden" />
      <div className="mt-8 flex items-center space-x-4 sm:space-x-8 sm:px-16 lg:mt-0 lg:px-0">
        <img
          src="https://storage.googleapis.com/candycode/jotai/jotai-mascot.png"
          className="w-1/3 max-w-[215px] lg:w-1/4"
          title="Jotai mascot"
          alt="Jotai mascot"
        />
        <div className="speech-bubble relative w-2/3 space-y-4 rounded-xl bg-gray-100 p-4 text-sm leading-snug text-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:text-base md:text-lg lg:w-3/4 lg:p-8 lg:leading-normal">
          <div>
            No extra re-renders, state resides within React, and you get the full benefits from
            suspense and concurrent features.
          </div>
          <div>
            It’s scalable from a simple React.useState replacement to a large-scale application with
            complex requirements.
          </div>
        </div>
      </div>
    </header>
  );
};
