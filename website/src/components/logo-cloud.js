import cx from 'classnames';
import { ExternalLink } from '../components/external-link.js';

export const LogoCloud = () => {
  return (
    <div className="mx-auto grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6 2xl:-mx-6">
      <Logo to="https://about.meta.com/">
        <img
          src="https://cdn.candycode.com/jotai/logos/meta-current.svg"
          alt=""
          className="w-full opacity-50 transition duration-300 ease-in-out dark:invert"
        />
        <HoverLogo>
          <img
            src="https://cdn.candycode.com/jotai/logos/meta-color.svg"
            alt=""
            className="w-full"
            aria-hidden
          />
        </HoverLogo>
      </Logo>
      <Logo to="https://candycode.com/">
        <img
          src="https://cdn.candycode.com/jotai/logos/candycode-current.svg"
          alt="candycode alternative graphic design web development agency"
          className="aspect-[16/9] w-full opacity-50 transition duration-300 ease-in-out dark:invert"
        />
        <HoverLogo>
          <img
            src="https://cdn.candycode.com/jotai/logos/candycode-color.svg"
            alt=""
            className="aspect-[16/9] w-full"
            aria-hidden
          />
        </HoverLogo>
      </Logo>
      <Logo to="https://www.adobe.com/">
        <img
          src="https://cdn.candycode.com/jotai/logos/adobe-current.svg"
          alt="Adobe"
          className="w-full px-1 opacity-50 transition duration-300 ease-in-out dark:invert lg:px-2"
        />
        <HoverLogo>
          <img
            src="https://cdn.candycode.com/jotai/logos/adobe-color.svg"
            alt=""
            className="w-full px-1 lg:px-2"
            aria-hidden
          />
        </HoverLogo>
      </Logo>
      <Logo to="https://ping.gg">
        <img
          src="https://cdn.candycode.com/jotai/logos/ping-current.svg"
          alt="Ping Labs"
          className="aspect-[24/9] w-full opacity-50 transition duration-300 ease-in-out dark:invert"
        />
        <HoverLogo>
          <img
            src="https://cdn.candycode.com/jotai/logos/ping-color.svg"
            alt=""
            className="aspect-[24/9] w-full"
            aria-hidden
          />
        </HoverLogo>
      </Logo>
      <Logo to="https://www.tiktok.com/">
        <img
          src="https://cdn.candycode.com/jotai/logos/tiktok-current.svg"
          alt="TokTok"
          className="w-full px-1 opacity-50 transition duration-300 ease-in-out dark:invert lg:px-2"
        />
        <HoverLogo>
          <img
            src="https://cdn.candycode.com/jotai/logos/tiktok-color.svg"
            alt=""
            className="w-full px-1 lg:px-2"
            aria-hidden
          />
        </HoverLogo>
      </Logo>
      <Logo to="https://uniswap.org/">
        <img
          src="https://cdn.candycode.com/jotai/logos/uniswap-current.svg"
          alt="Uniswap"
          className="aspect-[16/9] w-full opacity-50 transition duration-300 ease-in-out dark:invert"
        />
        <HoverLogo>
          <img
            src="https://cdn.candycode.com/jotai/logos/uniswap-color.svg"
            alt=""
            className="aspect-[16/9] w-full"
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
    <div className="absolute inset-0 flex h-full w-full items-center justify-center px-6 opacity-0 transition duration-300 ease-in-out group-hover:opacity-100 text-white">
      {children}
    </div>
  );
};
