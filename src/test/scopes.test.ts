import {
  isValidScope,
  parseAndValidateScopes,
  VALID_SCOPES,
  validateClientScopes,
} from '../utils/scopes';

describe('Scope Validation', () => {
  describe('Basic scope validation', () => {
    test('should validate individual valid scopes', () => {
      expect(isValidScope('read')).toBe(true);
      expect(isValidScope('write')).toBe(true);
      expect(isValidScope('admin')).toBe(true);
      expect(isValidScope('invalid')).toBe(false);
    });

    test('should have correct valid scopes constant', () => {
      expect(VALID_SCOPES).toEqual(['read', 'write', 'admin', 'basic']);
    });
  });

  describe('parseAndValidateScopes', () => {
    test('should parse valid scope strings', () => {
      expect(parseAndValidateScopes('read')).toEqual(['read']);
      expect(parseAndValidateScopes('read write')).toEqual(['read', 'write']);
      expect(parseAndValidateScopes('read write admin')).toEqual([
        'read',
        'write',
        'admin',
      ]);
    });

    test('should handle extra whitespace', () => {
      expect(parseAndValidateScopes('  read   write  ')).toEqual([
        'read',
        'write',
      ]);
      expect(parseAndValidateScopes('read    write    admin')).toEqual([
        'read',
        'write',
        'admin',
      ]);
    });

    test('should remove duplicates', () => {
      expect(parseAndValidateScopes('read write read')).toEqual([
        'read',
        'write',
      ]);
    });

    test('should throw error for invalid scopes', () => {
      expect(() => parseAndValidateScopes('invalid')).toThrow(
        'Invalid scope: "invalid"'
      );
      expect(() => parseAndValidateScopes('read invalid write')).toThrow(
        'Invalid scope: "invalid"'
      );
    });

    test('should throw error for invalid scope format', () => {
      expect(() => parseAndValidateScopes('read-only')).toThrow(
        'Invalid scope format: "read-only"'
      );
      expect(() => parseAndValidateScopes('read write!')).toThrow(
        'Invalid scope format: "write!"'
      );
    });

    test('should throw error for empty string', () => {
      expect(() => parseAndValidateScopes('')).toThrow(
        'Scope must be a non-empty string'
      );
      expect(() => parseAndValidateScopes('   ')).toThrow(
        'Scope must be a non-empty string'
      );
    });
  });

  describe('validateClientScopes', () => {
    test('should validate client scope arrays', () => {
      expect(validateClientScopes(['read'])).toEqual(['read']);
      expect(validateClientScopes(['read', 'write'])).toEqual([
        'read',
        'write',
      ]);
      expect(validateClientScopes(['read', 'write', 'admin'])).toEqual([
        'read',
        'write',
        'admin',
      ]);
    });

    test('should remove duplicates', () => {
      expect(validateClientScopes(['read', 'write', 'read'])).toEqual([
        'read',
        'write',
      ]);
    });

    test('should throw error for empty array', () => {
      expect(() => validateClientScopes([])).toThrow(
        'Client must have at least one scope'
      );
    });

    test('should throw error for invalid scopes', () => {
      expect(() => validateClientScopes(['invalid'])).toThrow(
        'Invalid scope: "invalid"'
      );
      expect(() => validateClientScopes(['read', 'invalid'])).toThrow(
        'Invalid scope: "invalid"'
      );
    });

    test('should throw error for invalid scope format', () => {
      expect(() => validateClientScopes(['read-only'])).toThrow(
        'Invalid scope format: "read-only"'
      );
    });
  });
});
