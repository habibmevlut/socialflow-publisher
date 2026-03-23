"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { ConfirmModal, type ConfirmOptions } from "@/components/ConfirmModal";

type Resolver = (value: boolean) => void;

type ContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmWithAction: (options: ConfirmOptions & { onConfirm: () => void | Promise<void> }) => void;
};

const ConfirmContext = createContext<ContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<Resolver | null>(null);
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void | Promise<void>) | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setOptions(null);
    setResolver(null);
    setOnConfirmAction(null);
    setLoading(false);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      setResolver((value: boolean) => resolve(value));
      setOnConfirmAction(null);
      setOpen(true);
    });
  }, []);

  const confirmWithAction = useCallback(
    (opts: ConfirmOptions & { onConfirm: () => void | Promise<void> }) => {
      const { onConfirm, ...rest } = opts;
      setOptions(rest);
      setResolver(null);
      setOnConfirmAction(() => onConfirm);
      setOpen(true);
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (onConfirmAction) {
      setLoading(true);
      try {
        await onConfirmAction();
        close();
      } catch (e) {
        setLoading(false);
        throw e;
      }
    } else if (resolver) {
      resolver(true);
      close();
    }
  }, [onConfirmAction, resolver, close]);

  const handleCancel = useCallback(() => {
    if (resolver) resolver(false);
    close();
  }, [resolver, close]);

  return (
    <ConfirmContext.Provider value={{ confirm, confirmWithAction }}>
      {children}
      {options && (
        <ConfirmModal
          open={open}
          {...options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={loading}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
