import { useCallback, useEffect } from 'react';

export const useOnEscape = (handler) => {
  const handleEscape = useCallback(
    ({ code }) => {
      if (code === 'Escape') {
        handler();
      }
    },
    [handler],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape, false);

    return () => {
      document.removeEventListener('keydown', handleEscape, false);
    };
  }, [handleEscape]);
};
