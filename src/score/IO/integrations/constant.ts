export const TASK_NAME = {
  AZURE_OPENAI_REVIEW: 'azure-openai-review',
  AZURE_BLOB_STORAGE_UPLOAD: 'azure-blob-storage-upload',
};

export const CONTEXT = {
  AZURE_OPENAI: 'azure-openai',
  AZURE_BLOB_STORAGE: 'azure-blob-storage',
};

export const ERROR_MESSAGE = {
  AZURE_OPENAI: {
    NO_RESPONSE: 'No response from Azure OpenAI',
    EMPTY_RESPONSE: 'Empty response content from Azure OpenAI',
  },
  AZURE_BLOB_STORAGE: {
    ERROR_CODE_RECEIVED: 'File upload failed - error code received: $1',
  },
};
