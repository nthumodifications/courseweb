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

export interface ConfirmChoiceOptions {
  title: string;
  description?: string;
  cancelLabel?: string;
  choices: { value: string; label: string; destructive?: boolean }[];
}

interface ConfirmState {
  options: ConfirmOptions;
  choices?: ConfirmChoiceOptions["choices"];
  resolve: (value: boolean | string | null) => void;
}

export function useConfirm() {
  const dict = useDictionary();
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve: (value) => resolve(value === true) });
    });
  }, []);

  const choose = useCallback((options: ConfirmChoiceOptions) => {
    return new Promise<string | null>((resolve) => {
      setState({
        options,
        choices: options.choices,
        resolve: (value) => resolve(typeof value === "string" ? value : null),
      });
    });
  }, []);

  const settle = (value: boolean | string | null) => {
    setState((current) => {
      current?.resolve(value);
      return null;
    });
  };

  const ConfirmDialog = (
    <AlertDialog
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) settle(null);
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
          {state?.choices ? (
            <>
              <AlertDialogCancel onClick={() => settle(null)}>
                {state.options.cancelLabel ?? dict.planner.common.cancel}
              </AlertDialogCancel>
              {state.choices.map((choice) => (
                <AlertDialogAction
                  key={choice.value}
                  onClick={() => settle(choice.value)}
                  className={
                    choice.destructive
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : undefined
                  }
                >
                  {choice.label}
                </AlertDialogAction>
              ))}
            </>
          ) : (
            <>
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
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, choose, ConfirmDialog };
}
