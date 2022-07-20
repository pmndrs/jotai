import algoliasearch from 'algoliasearch/lite';
import { Link } from 'gatsby';
import { useAtom } from 'jotai';
import { useUpdateAtom } from 'jotai/utils';
import {
  Hits,
  InstantSearch,
  connectSearchBox,
  connectStateResults,
} from 'react-instantsearch-dom';
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
        <div className="p-8 pb-2">
          <CustomSearchBox />
        </div>
        <Results>
          <Hits hitComponent={Hit} className="max-h-[400px] overflow-y-scroll px-8" />
        </Results>
      </InstantSearch>
      <div className="flex justify-end p-8">
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

const SearchBox = ({ currentRefinement, refine }) => (
  <input
    type="search"
    placeholder="Search here..."
    value={currentRefinement}
    onChange={(event) => refine(event.currentTarget.value)}
    className="flex w-full items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-lg text-black ring-0 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
  />
);

const CustomSearchBox = connectSearchBox(SearchBox);

const Results = connectStateResults(({ searchState, searchResults, children }) => {
  if (searchState && !searchState.query) return null;

  return searchResults && searchResults.nbHits !== 0 ? (
    children
  ) : (
    <div className="flex items-center space-x-3 p-8">
      <div>
        <Icon icon="warning" className="h-6 w-6 fill-current text-red-400" />
      </div>
      <div className="text-lg font-semibold">
        No results have been found for “{searchState.query}”. Please revise your query.
      </div>
    </div>
  );
});

const Hit = ({ hit }) => {
  const { title, excerpt, slug } = hit;

  const setIsSearchOpen = useUpdateAtom(searchAtom);

  return (
    <Link
      onClick={() => setIsSearchOpen(false)}
      to={`/docs/${slug}`}
      className="group my-6 flex space-x-3"
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
