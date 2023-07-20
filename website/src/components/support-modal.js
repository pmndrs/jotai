import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { helpAtom } from '../atoms/index.js';
import { Modal } from '../components/modal.js';
import { Support } from '../components/support.js';

export const SupportModal = () => {
  const [showHelp, setShowHelp] = useAtom(helpAtom);

  const onClose = useCallback(() => {
    setShowHelp(false);
  }, [setShowHelp]);

  return (
    <Modal isOpen={showHelp} onClose={onClose}>
      <div className="rounded-xl bg-gray-100 p-4 text-sm leading-snug text-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:text-base md:text-lg lg:gap-8 lg:p-8 lg:leading-normal">
        <Support />
      </div>
    </Modal>
  );
};
