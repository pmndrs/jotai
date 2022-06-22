export const Wrapper = ({ children, ...rest }) => {
  return (
    <div
      className="relative flex flex-col lg:mx-auto lg:max-w-[1920px] lg:flex-row lg:justify-around"
      {...rest}
    >
      {children}
    </div>
  );
};
