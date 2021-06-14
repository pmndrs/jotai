import React from 'react';

export const Main = ({ children }) => {
  return (
    <main className="w-full max-w-4xl mx-auto p-8 xl:p-16 pt-26 xl:pt-32 space-y-24 xl:space-y-32">
      {children}
    </main>
  );
};
