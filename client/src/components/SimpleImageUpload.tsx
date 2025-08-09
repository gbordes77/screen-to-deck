import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SimpleImageUploadProps {
  onFileSelect: (file: File) => void;
  maxSize?: number; // in MB
  disabled?: boolean;
  className?: string;
}

export const SimpleImageUpload: React.FC<SimpleImageUploadProps> = ({
  onFileSelect,
  maxSize = 10,
  disabled = false,
  className = '',
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`File is too large. Maximum size is ${maxSize}MB`);
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setFileName(file.name);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const clearPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.webp"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />
      
      <div
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
            />
            <button
              onClick={clearPreview}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="mt-4 text-sm text-gray-600">{fileName}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-brand-50 rounded-full">
                <Upload className="w-8 h-8 text-brand-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Click to upload your deck screenshot
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or drag and drop (coming soon)
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Supports: JPG, PNG, GIF, WebP (max {maxSize}MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};