export class ClaroDBException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaroDBException';
  }
}

export class DataProcessingError extends ClaroDBException {
  constructor(message: string) {
    super(message);
    this.name = 'DataProcessingError';
  }
}

export class QueryExecutionError extends ClaroDBException {
  constructor(message: string) {
    super(message);
    this.name = 'QueryExecutionError';
  }
}

export class LLMGenerationError extends ClaroDBException {
  constructor(message: string) {
    super(message);
    this.name = 'LLMGenerationError';
  }
}