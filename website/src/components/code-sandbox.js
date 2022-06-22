export const CodeSandbox = ({ id, tests }) => {
  return (
    <div className="mb-8 overflow-hidden rounded-md border-b border-gray-200 shadow-lg dark:border-gray-800 dark:!shadow-none sm:rounded-lg">
      <iframe
        title={id}
        className="h-[400px] w-full"
        src={`https://codesandbox.io/embed/${id}?codemirror=1&fontsize=14&hidenavigation=1&theme=light&hidedevtools=1${
          tests ? '&previewwindow=tests' : ''
        }`}
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        loading="lazy"
      />
    </div>
  );
};
