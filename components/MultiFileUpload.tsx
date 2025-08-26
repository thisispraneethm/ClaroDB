import React from 'react';
import { X, File as FileIcon } from 'lucide-react';
import FileUpload from './FileUpload';

interface MultiFileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

const FileListItem: React.FC<{ file: File; onRemove: () => void, disabled?: boolean }> = ({ file, onRemove, disabled }) => {
  const fileSize = (file.size / 1024).toFixed(2); // in KB
  return (
    <div className="flex items-center justify-between p-3 bg-secondary-background rounded-lg border border-border">
      <div className="flex items-center overflow-hidden">
        <FileIcon className="text-primary mr-3 flex-shrink-0" />
        <div className="flex flex-col overflow-hidden">
          <span className="font-medium text-text truncate" title={file.name}>{file.name}</span>
          <span className="text-xs text-text-secondary">{fileSize} KB</span>
        </div>
      </div>
      <button onClick={onRemove} disabled={disabled} className="p-1 text-text-secondary hover:text-danger rounded-full flex-shrink-0 ml-2 disabled:opacity-50">
        <X size={18} />
      </button>
    </div>
  );
};

const MultiFileUpload: React.FC<MultiFileUploadProps> = ({ files, onFilesChange, disabled = false }) => {
  
  const handleFilesAdd = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      // Prevent adding the same file multiple times
      const filesToAdd = newFiles.filter(newFile => 
        !files.some(f => f.name === newFile.name && f.size === newFile.size && f.lastModified === newFile.lastModified)
      );
      if (filesToAdd.length > 0) {
        onFilesChange([...files, ...filesToAdd]);
      }
    }
  };

  const handleFileRemove = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {files.map((file, index) => (
            <FileListItem key={`${file.name}-${file.size}-${file.lastModified}`} file={file} onRemove={() => handleFileRemove(index)} disabled={disabled}/>
          ))}
        </div>
      )}
      <FileUpload 
        file={null} // Always in "add" mode
        onFilesChange={handleFilesAdd}
        title="Add file(s)"
        disabled={disabled}
        multiple={true}
      />
    </div>
  );
};

export default MultiFileUpload;
