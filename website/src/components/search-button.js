import { useUpdateAtom } from 'jotai/utils'
import { searchAtom } from '../atoms'
import { Button } from '../components'

export const SearchButton = (props) => {
  const setIsSearchOpen = useUpdateAtom(searchAtom)

  return (
    <Button onClick={() => setIsSearchOpen(true)} icon="search" dark {...props}>
      Search...
    </Button>
  )
}
