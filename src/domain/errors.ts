export type DomainErrorCode = 'NOT_FOUND' | 'VALIDATION';

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND' as const;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION' as const;
  readonly issues: readonly ValidationIssue[];

  constructor(message: string, issues: readonly ValidationIssue[] = []) {
    super(message);
    this.issues = issues;
  }
}