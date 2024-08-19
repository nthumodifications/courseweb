"use client";
import React, { PropsWithChildren, ReactElement } from "react";
import { Modal, ModalProps } from "@mui/joy";
import { Transition } from "react-transition-group";

const EMPTY_FUNC = () => {};

const ModalContext = React.createContext<ProviderContext>([
  EMPTY_FUNC,
  EMPTY_FUNC,
]);

export const useModal = () => React.useContext(ModalContext);

type ModalParams = {
  children: React.ReactNode;
  open: boolean;
  onClose?: Function;
  onExited?: Function;
};

type ModalOption = Omit<ModalParams, "open">;

type ProviderContext = readonly [(option: ModalOption) => void, () => void];

type ModalContainerProps = ModalParams & {
  onClose: () => void;
  onKill: () => void;
};

function ModalContainer(props: ModalContainerProps) {
  const { children, open, onClose, onKill, ...rest } = props;

  return (
    <Modal open={open} onClose={onClose} {...rest}>
      {children as ReactElement}
    </Modal>
    // <Transition in={open} timeout={100} onExited={onKill}>
    //     {(state: string) => (
    //         <Modal
    //             keepMounted
    //             open={!['exited', 'exiting'].includes(state)}
    //             onClose={onClose}
    //             slotProps={{
    //             backdrop: {
    //                 sx: {
    //                 opacity: 0,
    //                 backdropFilter: 'none',
    //                 transition: `opacity 100ms, backdrop-filter 100ms`,
    //                 ...{
    //                     entering: { opacity: 1, backdropFilter: 'blur(4px)' },
    //                     entered: { opacity: 1, backdropFilter: 'blur(4px)' },
    //                 }[state],
    //                 },
    //             },
    //             }}
    //             sx={{
    //                 visibility: state === 'exited' ? 'hidden' : 'visible',
    //             }}
    //             {...rest}
    //         >
    //             {children as ReactElement}
    //         </Modal>
    //     )}
    // </Transition>
  );
}

export default function ModalProvider({ children }: PropsWithChildren) {
  const [modals, setModals] = React.useState<ModalParams[]>([]);
  const createModal = (option: ModalOption) => {
    const modal = { ...option, open: true };
    setModals((modals) => [...modals, modal]);
  };
  const closeModal = () => {
    setModals((modals) => {
      const latestModal = modals.pop();
      if (!latestModal) return modals;
      if (latestModal.onClose) latestModal.onClose();
      return [...modals].concat({ ...latestModal, open: false });
    });
  };
  const contextValue = React.useRef([createModal, closeModal] as const);

  return (
    <ModalContext.Provider value={contextValue.current}>
      {children}
      {modals.map((modal, i) => {
        const { onClose, ...modalParams } = modal;
        const handleKill = () => {
          if (modal.onExited) modal.onExited();
          setModals((modals) => modals.slice(0, modals.length - 1));
        };

        return (
          <ModalContainer
            key={i}
            onClose={closeModal}
            onKill={handleKill}
            // TODO: onKill???
            {...modalParams}
          />
        );
      })}
    </ModalContext.Provider>
  );
}
