import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function ConsoleHeaderSlot({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById('console-header-actions'));
    return () => setTarget(null);
  }, []);

  return target
    ? createPortal(
        <div className="flex flex-wrap items-center justify-end gap-2">
          {children}
        </div>,
        target,
      )
    : null;
}
