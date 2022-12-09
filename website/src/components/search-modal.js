import { useCallback, useMemo, useState } from 'react';
import algoliasearch from 'algoliasearch/lite';
import cx from 'classnames';
import { Link } from 'gatsby';
import { useAtom, useSetAtom } from 'jotai';
import throttle from 'just-throttle';
import { Hits, InstantSearch, useInstantSearch, useSearchBox } from 'react-instantsearch-hooks-web';
import { searchAtom } from '../atoms';
import { Button, Icon, Modal } from '../components';

const searchClient = algoliasearch(
  process.env.GATSBY_ALGOLIA_APP_ID,
  process.env.GATSBY_ALGOLIA_SEARCH_KEY,
);

export const SearchModal = () => {
  const [isSearchOpen, setIsSearchOpen] = useAtom(searchAtom);

  return (
    <Modal isOpen={isSearchOpen} onOpenChange={setIsSearchOpen}>
      <InstantSearch searchClient={searchClient} indexName="Docs">
        <CustomSearchBox />
        <Boundary fallback={null}>
          <div className="overflow-hidden rounded-b-lg">
            <Hits
              hitComponent={Hit}
              className="max-h-[400px] overflow-y-scroll border-l border-r border-b border-gray-300 bg-white p-8 pb-0 dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
        </Boundary>
      </InstantSearch>
      <div className="flex justify-end p-8 lg:hidden">
        <Button
          icon="close"
          onClick={() => setIsSearchOpen(false)}
          className="w-full font-bold uppercase tracking-wider lg:w-auto"
          dark
        >
          Close
        </Button>
      </div>
    </Modal>
  );
};

const Boundary = ({ children, fallback }) => {
  const { indexUiState, results } = useInstantSearch();

  if (!indexUiState.query) {
    return fallback;
  }

  if (results.nbHits === 0) {
    return (
      <div className="flex items-center space-x-3 rounded-b-lg border-l border-r border-b border-gray-300 bg-white p-8 dark:border-gray-800 dark:bg-gray-950">
        <div>
          <Icon icon="warning" className="h-6 w-6 fill-current text-red-400" />
        </div>
        <div className="text-lg font-semibold text-black dark:text-white">
          No results have been found for “{indexUiState.query}”. Please revise your query.
        </div>
      </div>
    );
  }

  return children;
};

const CustomSearchBox = (props) => {
  const [query, setQuery] = useState('');

  const { refine } = useSearchBox(props);

  const throttledRefine = useMemo(
    () => throttle((value) => refine(value), 200, { leading: true, trailing: true }),
    [refine],
  );

  const onChange = useCallback(
    (event) => {
      const newQuery = event.currentTarget.value;
      setQuery(newQuery);
      throttledRefine(newQuery);
    },
    [throttledRefine],
  );

  return (
    <div className="relative flex items-center">
      <input
        type="search"
        placeholder="Search here..."
        value={query}
        onChange={onChange}
        autoFocus
        className={cx(
          query.length === 0 ? 'rounded-lg' : 'rounded-t-lg',
          'dark:focus-border-gray-800 flex w-full items-center border border-gray-300 bg-white px-6 py-3 text-lg text-black ring-0 focus:border-gray-300 focus:ring-0 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200',
        )}
      />
      <a
        href="https://algolia.com"
        target="_blank"
        rel="noreferrer"
        className="absolute right-4 z-10 block"
      >
        <img src="/search-by-algolia.svg" alt="Search by Algolia" aria-hidden />
      </a>
    </div>
  );
};

const Hit = ({ hit }) => {
  const { title, excerpt, slug } = hit;
  const setIsSearchOpen = useSetAtom(searchAtom);

  return (
    <Link
      to={`/docs/${slug}`}
      onClick={() => setIsSearchOpen(false)}
      className="group mb-8 flex space-x-3"
    >
      <div>
        <Icon icon="file" className="h-6 w-6 fill-current text-blue-400 dark:text-teal-600" />
      </div>
      <div>
        <div className="text-xl font-semibold dark:text-gray-200">{title}</div>
        {excerpt && <div className="mt-1 text-sm leading-snug text-gray-500">{excerpt}</div>}
        <div className="mt-1 text-xs font-medium tracking-wider text-gray-400 group-hover:underline">
          jotai.org/docs/{slug}
        </div>
      </div>
    </Link>
  );
};
