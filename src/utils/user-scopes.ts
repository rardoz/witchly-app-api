/**
 * User Scope Management
 *
 * Defines user scopes and provides utilities for scope-based access control
 */

// Valid user scopes in the system
export const VALID_USER_SCOPES = ['read', 'write', 'basic', 'admin'] as const;

// Type for valid user scopes
export type ValidUserScope = (typeof VALID_USER_SCOPES)[number];

// Predefined user scope combinations for different user levels
export const USER_SCOPE_LEVELS = {
  basic: ['read', 'write', 'basic'],
  admin: ['read', 'write', 'admin'],
} as const;

// Type for user scope levels
export type UserScopeLevel = keyof typeof USER_SCOPE_LEVELS;

/**
 * Validates if a single user scope is valid
 */
export function isValidUserScope(scope: string): scope is ValidUserScope {
  return VALID_USER_SCOPES.includes(scope as ValidUserScope);
}

/**
 * Parses and validates a user scope string (space-separated)
 * @param scopeString - Space-separated scope string (e.g., "read write basic")
 * @returns Array of valid user scopes
 * @throws Error if any scope is invalid
 */
export function parseAndValidateUserScopes(
  scopeString: string
): ValidUserScope[] {
  if (!scopeString || typeof scopeString !== 'string') {
    throw new Error('User scope must be a non-empty string');
  }

  const trimmedScope = scopeString.trim();
  if (!trimmedScope) {
    throw new Error('User scope must be a non-empty string');
  }

  const scopes = trimmedScope.split(/\s+/);

  for (const scope of scopes) {
    if (!isValidUserScope(scope)) {
      throw new Error(
        `Invalid user scope: "${scope}". Valid user scopes are: ${VALID_USER_SCOPES.join(', ')}`
      );
    }
  }

  // Remove duplicates and return
  return [...new Set(scopes)] as ValidUserScope[];
}

/**
 * Gets scopes for a user level
 * @param level - User level (basic, admin)
 * @returns Array of scopes for that level
 */
export function getScopesForLevel(level: UserScopeLevel): ValidUserScope[] {
  return [...USER_SCOPE_LEVELS[level]] as ValidUserScope[];
}

/**
 * Gets scopes string for a user level
 * @param level - User level (basic, admin)
 * @returns Space-separated scope string
 */
export function getScopeStringForLevel(level: UserScopeLevel): string {
  return getScopesForLevel(level).join(' ');
}

/**
 * Checks if user has a specific scope
 * @param userScopes - User's current scopes
 * @param requiredScope - Scope to check for
 * @returns true if user has the scope
 */
export function userHasScope(
  userScopes: string[],
  requiredScope: string
): boolean {
  return userScopes.includes(requiredScope);
}

/**
 * Checks if user has any of the required scopes
 * @param userScopes - User's current scopes
 * @param requiredScopes - Array of scopes to check for (user needs at least one)
 * @returns true if user has at least one of the required scopes
 */
export function userHasAnyScope(
  userScopes: string[],
  requiredScopes: string[]
): boolean {
  return requiredScopes.some((scope) => userScopes.includes(scope));
}

/**
 * Checks if user has all of the required scopes
 * @param userScopes - User's current scopes
 * @param requiredScopes - Array of scopes to check for (user needs all)
 * @returns true if user has all of the required scopes
 */
export function userHasAllScopes(
  userScopes: string[],
  requiredScopes: string[]
): boolean {
  return requiredScopes.every((scope) => userScopes.includes(scope));
}

/**
 * Determines user level from scopes
 * @param userScopes - User's current scopes
 * @returns User level or null if scopes don't match a known level
 */
export function getUserLevelFromScopes(
  userScopes: string[]
): UserScopeLevel | null {
  const scopeSet = new Set(userScopes);

  // Check if user has admin scopes
  if (USER_SCOPE_LEVELS.admin.every((scope) => scopeSet.has(scope))) {
    return 'admin';
  }

  // Check if user has basic scopes
  if (USER_SCOPE_LEVELS.basic.every((scope) => scopeSet.has(scope))) {
    return 'basic';
  }

  return null;
}

/**
 * Validates user scopes array
 * @param scopes - Array of scope strings
 * @returns Array of valid user scopes
 * @throws Error if any scope is invalid
 */
export function validateUserScopes(scopes: string[]): ValidUserScope[] {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw new Error('User must have at least one scope');
  }

  const validatedScopes: ValidUserScope[] = [];

  for (const scope of scopes) {
    if (!isValidUserScope(scope)) {
      throw new Error(
        `Invalid user scope: "${scope}". Valid user scopes are: ${VALID_USER_SCOPES.join(', ')}`
      );
    }

    validatedScopes.push(scope);
  }

  // Remove duplicates
  return [...new Set(validatedScopes)];
}
