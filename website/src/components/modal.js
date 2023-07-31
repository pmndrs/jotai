import { Dialog } from '@headlessui/react';
import { RemoveScroll } from 'react-remove-scroll';

export const Modal = ({ isOpen, onClose, children, ...rest }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} {...rest}>
      <div
        className="z-100 fixed top-0 right-0 bottom-0 h-full w-8 bg-white dark:bg-gray-950"
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[1000] flex justify-center bg-black/50 p-8 backdrop-blur sm:p-12 2xl:p-32">
        <RemoveScroll className="w-full max-w-3xl">
          <Dialog.Panel className="z-[1001] min-w-full">{children}</Dialog.Panel>
        </RemoveScroll>
      </div>
    </Dialog>
  );
};
