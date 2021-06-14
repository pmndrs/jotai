import React from 'react';

export const Panel = ({ headline = null, body = null, demo = null }) => {
  return (
    <section className="space-y-2">
      {headline && <h2 className="font-bold text-3xl text-gray-300">{headline}</h2>}
      {body && (
        <div className="font-normal text-base xl:text-lg leading-normal text-gray-600">{body}</div>
      )}
      {demo}
    </section>
  );
};
