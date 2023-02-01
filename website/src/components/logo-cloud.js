import cx from 'classnames';
import { ExternalLink } from '../components/external-link';

export const LogoCloud = () => {
  return (
    <div className="mx-auto grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <Logo to="https://ping.gg">
        <img
          src="https://storage.googleapis.com/candycode/jotai/logos/ping-current.svg"
          alt="Ping Labs"
          className="aspect-[4/1.5] w-full opacity-50 transition duration-300 ease-in-out dark:invert"
        />
        <HoverLogo>
          <img
            src="https://storage.googleapis.com/candycode/jotai/logos/ping-color.svg"
            alt=""
            className="aspect-[4/1.5] w-full"
            aria-hidden
          />
        </HoverLogo>
      </Logo>
      <Logo to="https://candycode.com/">
        <img
          src="https://storage.googleapis.com/candycode/jotai/logos/candycode-current.svg"
          alt="candycode alternative graphic design web development agency"
          className="aspect-video w-full opacity-50 transition duration-300 ease-in-out dark:invert"
        />
        <HoverLogo>
          <img
            src="https://storage.googleapis.com/candycode/jotai/logos/candycode-color.svg"
            alt=""
            className="aspect-video w-full"
            aria-hidden
          />
        </HoverLogo>
      </Logo>
      <Logo to="https://www.adobe.com/">
        <img
          src="https://storage.googleapis.com/candycode/jotai/logos/adobe-current.svg"
          alt="Adobe"
          className="aspect-video w-full opacity-50 transition duration-300 ease-in-out dark:invert"
        />
        <HoverLogo>
          <img
            src="https://storage.googleapis.com/candycode/jotai/logos/adobe-color.svg"
            alt=""
            className="aspect-video w-full"
            aria-hidden
          />
        </HoverLogo>
      </Logo>
      <Logo to="https://uniswap.org/">
        <img
          src="https://storage.googleapis.com/candycode/jotai/logos/uniswap-current.svg"
          alt="Uniswap"
          className="aspect-video w-full opacity-50 transition duration-300 ease-in-out dark:invert"
        />
        <HoverLogo>
          <img
            src="https://storage.googleapis.com/candycode/jotai/logos/uniswap-color.svg"
            alt=""
            className="aspect-video w-full"
            aria-hidden
          />
        </HoverLogo>
      </Logo>
    </div>
  );
};

const Logo = ({ to, className = '', children }) => {
  return (
    <ExternalLink
      to={to}
      className={cx(
        'group relative flex aspect-video items-center justify-center rounded-lg bg-gray-100 px-6 transition duration-300 ease-in-out hover:!bg-black dark:bg-gray-900',
        className,
      )}
    >
      {children}
    </ExternalLink>
  );
};

const HoverLogo = ({ children }) => {
  return (
    <div className="absolute inset-0 flex h-full w-full items-center justify-center px-6 opacity-0 transition duration-300 ease-in-out group-hover:opacity-100">
      {children}
    </div>
  );
};
