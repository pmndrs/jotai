import * as Dialog from '@radix-ui/react-dialog'

export const Modal = ({ isOpen, onOpenChange, children, ...rest }) => (
  <Dialog.Root open={isOpen} onOpenChange={onOpenChange} {...rest}>
    <Dialog.Portal>
      <div className="fixed top-0 right-0 bottom-0 w-8 h-full bg-white z-100" />
      <Dialog.Overlay className="fixed inset-0 z-[1000] flex justify-center bg-black/50 backdrop-blur p-8 sm:p-12 lg:p-32">
        <div className="w-full max-w-3xl">
          <Dialog.Content className="min-w-full z-[1001]">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              {children}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Overlay>
    </Dialog.Portal>
  </Dialog.Root>
)
