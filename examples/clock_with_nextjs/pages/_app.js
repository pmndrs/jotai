import { useLayoutEffect } from "react";
import { Provider, useAtom } from "jotai";
import { hydrateAtom } from "../store";

const isSSR = typeof window === "undefined";

export const useSsrLayoutEffect = isSSR ? (cb) => cb() : useLayoutEffect;

const Hydrate = ({ children, initialState }) => {
  const [, hydrate] = useAtom(hydrateAtom);
  useSsrLayoutEffect(() => {
    hydrate(initialState);
  }, [hydrate, initialState]);
  return children;
};

export default function App({ Component, pageProps }) {
  const { initialState } = pageProps;

  return (
    <Provider>
      <Hydrate initialState={initialState}>
        <Component {...pageProps} />
      </Hydrate>
    </Provider>
  );
}
