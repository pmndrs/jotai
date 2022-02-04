import algoliasearch from 'algoliasearch/lite'
import { Link } from 'gatsby'
import { useAtom } from 'jotai'
import { useUpdateAtom } from 'jotai/utils'
import {
  Hits,
  InstantSearch,
  connectSearchBox,
  connectStateResults,
} from 'react-instantsearch-dom'
import { searchAtom } from '../atoms'
import { Button, Icon, Modal } from '../components'

const searchClient = algoliasearch(
  process.env.GATSBY_ALGOLIA_APP_ID,
  process.env.GATSBY_ALGOLIA_SEARCH_KEY
)

export const SearchModal = () => {
  const [isSearchOpen, setIsSearchOpen] = useAtom(searchAtom)

  return (
    <Modal isOpen={isSearchOpen} onOpenChange={setIsSearchOpen}>
      <InstantSearch searchClient={searchClient} indexName="Docs">
        <div className="p-8 pb-2">
          <CustomSearchBox />
        </div>
        <Results>
          <Hits
            hitComponent={Hit}
            className="max-h-[400px] px-8 overflow-y-scroll"
          />
        </Results>
      </InstantSearch>
      <div className="flex justify-end p-8">
        <Button
          icon="close"
          onClick={() => setIsSearchOpen(false)}
          className="w-full lg:w-auto font-bold tracking-wider uppercase"
          dark>
          Close
        </Button>
      </div>
    </Modal>
  )
}

const SearchBox = ({ currentRefinement, refine }) => (
  <input
    type="search"
    placeholder="Search here..."
    value={currentRefinement}
    onChange={(event) => refine(event.currentTarget.value)}
    className="flex items-center w-full px-4 py-2 ring-0 border border-gray-300 rounded-lg bg-white text-lg"
  />
)

const CustomSearchBox = connectSearchBox(SearchBox)

const Results = connectStateResults(
  ({ searchState, searchResults, children }) => {
    if (searchState && !searchState.query) return null

    return searchResults && searchResults.nbHits !== 0 ? (
      children
    ) : (
      <div className="flex items-center space-x-3 p-8">
        <div>
          <Icon icon="warning" className="w-6 h-6 fill-current text-red-400" />
        </div>
        <div className="font-semibold text-lg">
          No results have been found for “{searchState.query}”. Please revise
          your query.
        </div>
      </div>
    )
  }
)

const Hit = ({ hit }) => {
  const { title, excerpt, slug } = hit

  const setIsSearchOpen = useUpdateAtom(searchAtom)

  return (
    <Link
      onClick={() => setIsSearchOpen(false)}
      to={`/docs/${slug}`}
      className="flex my-6 space-x-3 group">
      <div>
        <Icon icon="file" className="w-6 h-6 fill-current text-blue-400" />
      </div>
      <div>
        <div className="font-semibold text-xl">{title}</div>
        {excerpt && (
          <div className="mt-1 text-sm text-gray-500 leading-snug">
            {excerpt}
          </div>
        )}
        <div className="mt-1 font-medium text-xs text-gray-400 tracking-wider group-hover:underline">
          jotai.org/docs/{slug}
        </div>
      </div>
    </Link>
  )
}
