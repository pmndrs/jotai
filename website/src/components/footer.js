import { Credits } from '../components';

export const Footer = () => {
  return (
    <footer className="mt-8 inline-flex flex-col space-y-2 lg:hidden" style={{ marginBottom: 79 }}>
      <Credits />
    </footer>
  );
};
