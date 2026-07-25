// This file intentionally has a lint error to test CI pipeline
// eslint should catch the unused variable (error-level in strict mode)

export function testCIValidation() {
  const result = 'CI pipeline is working';
  return result;
}
