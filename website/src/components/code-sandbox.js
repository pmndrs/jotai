export const CodeSandbox = ({ id, tests }) => {
  return (
    <div className="mb-8 overflow-hidden shadow-lg rounded-md sm:rounded-lg border-b border-gray-200">
      <iframe
        title={id}
        className="w-full h-[400px]"
        src={`https://codesandbox.io/embed/${id}?codemirror=1&fontsize=14&hidenavigation=1&theme=light&hidedevtools=1${
          tests ? '&previewwindow=tests' : ''
        }`}
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        loading="lazy"
      />
    </div>
  )
}
