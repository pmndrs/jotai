import { Jotai } from '../components'

export const Intro = () => {
  return (
    <header>
      <Jotai className="lg:hidden max-w-xs" />
      <div className="flex items-center mt-8 lg:mt-0 sm:px-16 lg:px-0 space-x-4 sm:space-x-8">
        <img
          src="https://storage.googleapis.com/candycode/jotai/jotai-mascot.png"
          className="w-1/3 lg:w-1/4 max-w-[215px]"
          title="Jotai mascot"
          alt="Jotai mascot"
        />
        <div className="relative w-2/3 lg:w-3/4 p-4 lg:p-8 space-y-4 bg-gray-100 dark:bg-gray-900 rounded-xl text-sm sm:text-base md:text-lg text-gray-700 dark:text-gray-300 leading-snug lg:leading-normal speech-bubble">
          <div>
            No extra re-renders, state resides within React, and you get the
            full benefits from suspense and concurrent features.
          </div>
          <div>
            It’s scalable from a simple React.useState replacement to a
            large-scale application with complex requirements.
          </div>
        </div>
      </div>
    </header>
  )
}
