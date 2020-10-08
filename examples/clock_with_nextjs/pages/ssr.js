import Index from "./index";

export default function SSR() {
  return <Index />;
}

export function getServerSideProps() {
  return { props: { initialState: { light: false, lastUpdate: Date.now() } } };
}
