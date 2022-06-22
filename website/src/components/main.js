export const Main = ({ children, ...rest }) => {
  return (
    <main
      className="p-6 sm:p-8 lg:mt-8 lg:w-full lg:max-w-prose lg:flex-shrink xl:max-w-4xl xl:p-16 2xl:max-w-5xl"
      {...rest}
    >
      {children}
    </main>
  );
};
