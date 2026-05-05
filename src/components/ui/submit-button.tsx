import React, { useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** The async action to execute on click */
  onClick: () => Promise<any> | any;
  /** Text to show while loading (optional) */
  loadingText?: string;
  /** Whether to show a spinner icon */
  showSpinner?: boolean;
}

/**
 * Button that automatically prevents double-submit.
 * Disables itself and shows a loading state while the async onClick runs.
 * 
 * Drop-in replacement for <Button onClick={handleSubmit}>
 * 
 * Usage:
 *   <SubmitButton onClick={handleSubmit} loadingText="Sauvegarde...">
 *     Sauvegarder
 *   </SubmitButton>
 */
export const SubmitButton = React.forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({ onClick, loadingText, showSpinner = true, disabled, children, ...props }, ref) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
      if (isLoading) return;
      setIsLoading(true);
      try {
        await onClick();
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && showSpinner && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {isLoading && loadingText ? loadingText : children}
      </Button>
    );
  }
);

SubmitButton.displayName = 'SubmitButton';
