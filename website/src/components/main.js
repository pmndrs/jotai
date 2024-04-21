export const Main = ({ children, ...rest }) => {
  return (
    <main className="p-6 sm:p-8 lg:mt-8 lg:max-w-5xl lg:flex-shrink xl:p-16 grow" {...rest}>
      {children}
    </main>
  );
};
