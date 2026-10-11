import { useCallback, useState } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@courseweb/ui";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function useConfirm() {
  const dict = useDictionary();
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const settle = (value: boolean) => {
    setState((current) => {
      current?.resolve(value);
      return null;
    });
  };

  const ConfirmDialog = (
    <AlertDialog
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.options.title}</AlertDialogTitle>
          {state?.options.description && (
            <AlertDialogDescription>
              {state.options.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>
            {state?.options.cancelLabel ?? dict.planner.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settle(true)}
            className={
              state?.options.destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {state?.options.confirmLabel ?? dict.planner.common.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}
