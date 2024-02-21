import { useMemo } from 'react';

export const Tabs = ({ tabs = {} }) => {
  const tabContents = useMemo(() => Object.values(tabs), [tabs]);

  return (
    <>
      <div className="space-y-12">
        {tabContents.map((content) => (
          <div>{content}</div>
        ))}
      </div>
    </>
  );
};
