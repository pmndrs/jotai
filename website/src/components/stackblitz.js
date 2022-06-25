export const Stackblitz = ({ id, file }) => {
  return (
    <div className="mb-8 overflow-hidden rounded-md border-b border-gray-200 shadow-lg dark:!shadow-none sm:rounded-lg">
      <iframe
        title={id}
        className="h-[400px] w-full"
        src={`https://stackblitz.com/edit/${id}?embed=1${file ? `&file=${file}` : ''}&terminal=dev`}
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        loading="lazy"
      />
    </div>
  );
};
