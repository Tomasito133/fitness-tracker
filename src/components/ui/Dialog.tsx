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
}

export function Dialog({ open, onOpenChange, children, title }: DialogProps) {
  if (!open) return null;

  return (
    <DialogContext.Provider value={{ open, onClose: () => onOpenChange(false) }}>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
        <div
          className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl bg-background p-6 shadow-xl animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
          {title && (
            <h2 className="text-lg font-semibold leading-none tracking-tight mb-4">{title}</h2>
          )}
          {children}
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
