import type { ValidationIssue } from '../domain/errors.js';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: readonly ValidationIssue[];
}

export function problemDetails(input: Omit<ProblemDetails, 'errors'>): ProblemDetails {
  return {
    type: input.type,
    title: input.title,
    status: input.status,
    detail: input.detail,
  };
}