/**
 * OAuth2 Scope Management and Validation
 *
 * Defines valid scopes for the API and provides validation utilities
 * following OAuth2 best practices.
 */

// Valid scopes in the system
export const VALID_SCOPES = ['read', 'write', 'admin', 'basic'] as const;

// Type for valid scopes
export type ValidScope = (typeof VALID_SCOPES)[number];

// Scope validation regex (alphanumeric + underscore, no spaces within individual scopes)
const SCOPE_FORMAT_REGEX = /^[a-zA-Z0-9_]+$/;

/**
 * Validates if a single scope is valid
 */
export function isValidScope(scope: string): scope is ValidScope {
  return VALID_SCOPES.includes(scope as ValidScope);
}

/**
 * Validates scope format (alphanumeric + underscore only)
 */
export function isValidScopeFormat(scope: string): boolean {
  return SCOPE_FORMAT_REGEX.test(scope.trim());
}

/**
 * Parses and validates a scope string (space-separated)
 * @param scopeString - Space-separated scope string (e.g., "read write")
 * @returns Array of valid scopes
 * @throws Error if any scope is invalid
 */
export function parseAndValidateScopes(scopeString: string): ValidScope[] {
  if (!scopeString || typeof scopeString !== 'string') {
    throw new Error('Scope must be a non-empty string');
  }

  const trimmedScope = scopeString.trim();
  if (!trimmedScope) {
    throw new Error('Scope must be a non-empty string');
  }

  const scopes = trimmedScope.split(/\s+/);

  for (const scope of scopes) {
    // Check format first
    if (!isValidScopeFormat(scope)) {
      throw new Error(
        `Invalid scope format: "${scope}". Scopes must contain only letters, numbers, and underscores.`
      );
    }

    // Check if scope is recognized
    if (!isValidScope(scope)) {
      throw new Error(
        `Invalid scope: "${scope}". Valid scopes are: ${VALID_SCOPES.join(', ')}`
      );
    }
  }

  // Remove duplicates and return
  return [...new Set(scopes)] as ValidScope[];
}

/**
 * Validates that requested scopes are a subset of allowed scopes
 * @param requestedScopes - Scopes being requested
 * @param allowedScopes - Scopes the client is allowed to have
 * @returns Array of invalid scopes (empty if all valid)
 */
export function validateScopeSubset(
  requestedScopes: string[],
  allowedScopes: string[]
): string[] {
  return requestedScopes.filter((scope) => !allowedScopes.includes(scope));
}

/**
 * Validates an array of scopes for client creation/update
 * @param scopes - Array of scope strings
 * @returns Array of valid scopes
 * @throws Error if any scope is invalid
 */
export function validateClientScopes(scopes: string[]): ValidScope[] {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw new Error('Client must have at least one scope');
  }

  const validatedScopes: ValidScope[] = [];

  for (const scope of scopes) {
    if (!isValidScopeFormat(scope)) {
      throw new Error(
        `Invalid scope format: "${scope}". Scopes must contain only letters, numbers, and underscores.`
      );
    }

    if (!isValidScope(scope)) {
      throw new Error(
        `Invalid scope: "${scope}". Valid scopes are: ${VALID_SCOPES.join(', ')}`
      );
    }

    validatedScopes.push(scope);
  }

  // Remove duplicates
  return [...new Set(validatedScopes)];
}
