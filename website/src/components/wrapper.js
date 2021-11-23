export const Wrapper = ({ children, ...rest }) => {
  return (
    <div
      className="relative flex flex-col lg:flex-row lg:justify-around lg:max-w-[1920px] lg:mx-auto"
      {...rest}>
      {children}
    </div>
  )
}
