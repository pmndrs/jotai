import { useAtom } from 'jotai';
import { helpAtom } from '../atoms';
import { Modal, Support } from '../components';

export const SupportModal = () => {
  const [showHelp, setShowHelp] = useAtom(helpAtom);

  return (
    <Modal isOpen={showHelp} onOpenChange={setShowHelp}>
      <div className="rounded-xl bg-gray-100 p-4 text-sm leading-snug text-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:text-base md:text-lg lg:gap-8 lg:p-8 lg:leading-normal">
        <Support />
      </div>
    </Modal>
  );
};
