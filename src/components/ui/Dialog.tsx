import { createContext, useContext, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DialogContextValue {
  open: boolean;
  onClose: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: string;
  /** Кнопки/действия внизу — не скроллятся, всегда видны на мобильных */
  footer?: ReactNode;
}

export function Dialog({ open, onOpenChange, children, title, footer }: DialogProps) {
  if (!open) return null;

  const safeInset = {
    top: 'env(safe-area-inset-top, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)',
  };

  return (
    <DialogContext.Provider value={{ open, onClose: () => onOpenChange(false) }}>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
        {/* Жёсткая «безопасная» зона */}
        <div
          className="fixed flex items-center justify-center overflow-hidden pointer-events-none"
          style={{
            top: safeInset.top,
            right: safeInset.right,
            bottom: safeInset.bottom,
            left: safeInset.left,
            padding: '1rem',
          }}
        >
          {/* Панель: flex-колонка, высота 100% контейнера; кнопки внизу всегда видны */}
          <div
            className="relative z-50 w-full max-w-lg flex flex-col rounded-2xl bg-background shadow-xl animate-in fade-in-0 zoom-in-95 pointer-events-auto overflow-hidden"
            style={{ height: '100%', maxHeight: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex items-start justify-between gap-2 p-6 pb-2">
              {title && (
                <h2 className="text-lg font-semibold leading-none tracking-tight pr-8">{title}</h2>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 -m-2 p-2 shrink-0"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6">
              {children}
            </div>
            {footer != null && (
              <div className="flex-shrink-0 border-t border-border px-6 py-4 bg-background">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </DialogContext.Provider>
  );
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

export function DialogContent({ children, className }: DialogContentProps) {
  const context = useContext(DialogContext);
  if (!context) return null;

  return (
    <div
      className={cn(
        'relative z-50 w-full max-w-lg max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl bg-background p-6 shadow-xl animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={context.onClose}
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <X className="h-5 w-5" />
        <span className="sr-only">Close</span>
      </button>
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left mb-4', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 mt-4', className)} {...props} />;
}
