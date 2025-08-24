
import React, { useState, useCallback } from 'react';
import { FileUp, X, File as FileIcon } from 'lucide-react';

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  title?: string;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ file, onFileChange, title = "Upload File", disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    if (disabled) return;
    e.preventDefault(); // This is necessary to allow dropping
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileChange(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileClear = () => {
    if (disabled) return;
    onFileChange(null);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onFileChange(e.target.files?.[0] || null);
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  }

  if (file) {
    const fileSize = (file.size / 1024).toFixed(2); // in KB
    return (
      <div className="flex items-center justify-between p-3 bg-card/60 backdrop-blur-sm rounded-xl border border-border">
        <div className="flex items-center overflow-hidden">
          <FileIcon className="text-primary mr-3 flex-shrink-0" />
          <div className="flex flex-col overflow-hidden">
            <span className="font-medium text-text truncate">{file.name}</span>
            <span className="text-xs text-text-secondary">{fileSize} KB</span>
          </div>
        </div>
        <button onClick={handleFileClear} disabled={disabled} className="p-1 text-text-secondary hover:text-danger rounded-full flex-shrink-0 ml-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center w-full h-32 px-4 transition-colors duration-300 bg-card/50 border-2 border-border border-dashed rounded-xl appearance-none overflow-hidden ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary'} ${isDragging ? 'border-primary' : ''}`}
    >
      {isDragging && <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-0"></div>}
      <div className="relative z-10 flex items-center space-x-2">
        <FileUp className="text-text-secondary" />
        <span className="font-medium text-text-secondary">
          {title}: Drop file here, or<span className="text-primary font-semibold">&nbsp;browse</span>
        </span>
      </div>
      <p className="relative z-10 text-xs text-text-secondary mt-1">Supports CSV, JSON, and TXT</p>
      <input
        type="file"
        accept=".csv,.json,.txt"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </label>
  );
};

export default FileUpload;