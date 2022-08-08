import { useSetAtom } from 'jotai';
import { searchAtom } from '../atoms';
import { Button } from '../components';

export const SearchButton = (props) => {
  const setIsSearchOpen = useSetAtom(searchAtom);

  return (
    <Button onClick={() => setIsSearchOpen(true)} icon="search" dark {...props}>
      Search...
    </Button>
  );
};
