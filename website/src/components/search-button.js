import { useSetAtom } from 'jotai';
import { searchAtom } from '../atoms/index.js';
import { Button } from '../components/button.js';

export const SearchButton = (props) => {
  const setIsSearchOpen = useSetAtom(searchAtom);

  return (
    <Button onClick={() => setIsSearchOpen(true)} icon="search" dark {...props}>
      Search...
    </Button>
  );
};
