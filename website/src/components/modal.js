import * as Dialog from '@radix-ui/react-dialog';

export const Modal = ({ isOpen, onOpenChange, children, ...rest }) => (
  <Dialog.Root open={isOpen} onOpenChange={onOpenChange} {...rest}>
    <Dialog.Portal>
      <div className="z-100 fixed top-0 right-0 bottom-0 h-full w-8 bg-white dark:bg-gray-950" />
      <Dialog.Overlay className="fixed inset-0 z-[1000] flex justify-center bg-black/50 p-8 backdrop-blur sm:p-12 lg:p-32">
        <div className="w-full max-w-3xl">
          <Dialog.Content className="z-[1001] min-w-full">{children}</Dialog.Content>
        </div>
      </Dialog.Overlay>
    </Dialog.Portal>
  </Dialog.Root>
);
