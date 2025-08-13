import React, { useState, useCallback } from 'react';
import { Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CopyButtonProps {
  text: string;
  label?: string;
  successMessage?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  autoCopy?: boolean;
  onCopy?: () => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = 'Copy',
  successMessage = 'Copied to clipboard!',
  className = '',
  variant = 'secondary',
  size = 'md',
  showIcon = true,
  autoCopy = false,
  onCopy,
}) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text) {
      toast.error('Nothing to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(false);
      
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      );
      
      onCopy?.();
      
      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError(true);
      toast.error('Failed to copy to clipboard');
      
      setTimeout(() => {
        setError(false);
      }, 2500);
    }
  }, [text, successMessage, onCopy]);

  // Auto-copy on mount if requested
  React.useEffect(() => {
    if (autoCopy && text) {
      handleCopy();
    }
  }, [autoCopy, text]); // eslint-disable-line react-hooks/exhaustive-deps

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
  };

  const buttonClass = `
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
    flex items-center justify-center gap-2
    transition-all duration-200
    ${copied ? 'bg-green-50 border-green-500 text-green-700' : ''}
    ${error ? 'bg-red-50 border-red-500 text-red-700' : ''}
  `.trim();

  return (
    <button
      onClick={handleCopy}
      className={buttonClass}
      disabled={!text}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {showIcon && (
        <>
          {copied ? (
            <CheckCircle className="w-4 h-4 text-green-600 animate-scale-in" />
          ) : error ? (
            <AlertCircle className="w-4 h-4 text-red-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </>
      )}
      <span>
        {copied ? 'Copied!' : error ? 'Failed' : label}
      </span>
    </button>
  );
};

// Floating copy button for quick access
interface FloatingCopyButtonProps {
  text: string;
  show: boolean;
}

export const FloatingCopyButton: React.FC<FloatingCopyButtonProps> = ({ text, show }) => {
  if (!show || !text) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <CopyButton
        text={text}
        label="Copy Deck"
        successMessage="✅ Deck copied! Ready to paste in MTGA"
        variant="primary"
        size="lg"
        className="shadow-lg hover:shadow-xl"
      />
    </div>
  );
};