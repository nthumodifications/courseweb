# NTHUMods Calendar API Testing

## Overview

This document describes the testing approach for the NTHUMods Calendar API. We use Bun's built-in test runner for unit and integration testing without requiring an actual database connection.

## Testing Philosophy

We follow these principles in our tests:

1. **Isolation**: Tests should not depend on external services like databases or Firebase
2. **Speed**: Tests should run quickly to ensure rapid feedback during development
3. **Coverage**: Tests should cover core functionality and edge cases
4. **Readability**: Tests should be clear and easy to understand

## Running Tests

To run all tests:

```bash
bun test
```

To run specific test files:

```bash
bun test src/utils/apiKeyValidation.test.ts
bun test src/api/calendar.test.ts
```

## Test Structure

### Mock Architecture

We use a consistent mocking approach:

- `src/__mocks__/prisma.ts`: Contains mocks for Prisma client operations
- `src/__mocks__/firebase.ts`: Contains mocks for Firebase operations

### Dependency Injection

Our code is designed with testability in mind:

- Utility functions accept optional client parameters for testing
- We use the `setPrismaClient()` function to override the default client

### Test Files

Key test files:

1. `src/utils/apiKeyValidation.test.ts`: Tests the API key validation utility
2. `src/api/calendar.test.ts`: Tests the calendar API endpoints
3. `src/utils/icalendar.test.ts`: Tests the iCalendar generation utility

## Best Practices for Writing Tests

1. Always reset mock implementations between tests using `beforeEach` hooks
2. Use descriptive test names that explain what's being tested
3. Isolate test dependencies using proper mocking
4. Test both success and error cases
5. Ensure tests don't access real databases or external services

## Running Tests in CI

The tests are designed to run in CI environments without requiring a database. We use environment variables to control the test mode:

```
NODE_ENV=test
TEST_MODE=true
```

This ensures tests use mocked dependencies instead of real connections.

## Security Testing

⚠️ **Security Testing Requirements**: Given the identified security vulnerabilities, comprehensive security testing is critical before production deployment.

### Security Test Categories

#### 1. Authentication & Authorization Tests

```bash
# Test API key validation
bun test src/utils/apiKeyValidation.test.ts

# Test scope-based access control
bun test src/middleware/apikey.test.ts
```

**Required Security Tests:**

- [ ] API key validation with malformed keys
- [ ] Scope validation and enforcement
- [ ] Authentication bypass attempts
- [ ] Header vs query parameter authentication paths
- [ ] API key exposure in logs/responses

#### 2. Input Validation & Injection Tests

```bash
# Test input sanitization
bun test src/api/calendar.test.ts --grep "validation"
```

**Test Cases:**

- [ ] SQL injection attempts (though Prisma provides protection)
- [ ] XSS payload injection in calendar data
- [ ] Path traversal in userId parameters
- [ ] Header injection attacks
- [ ] Malformed JSON payloads

#### 3. Rate Limiting Tests

⚠️ **Currently Missing**: Rate limiting is not implemented but should be tested:

```bash
# Future implementation
bun test src/middleware/rateLimit.test.ts
```

**Required Tests:**

- [ ] Request rate enforcement per endpoint
- [ ] IP-based rate limiting
- [ ] API key-based rate limiting
- [ ] Rate limit bypass attempts

#### 4. Security Headers Tests

```bash
# Test security header implementation
bun test src/middleware/security.test.ts
```

**Required Headers Testing:**

- [ ] Content Security Policy (CSP)
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] Strict-Transport-Security
- [ ] X-XSS-Protection

### Security Test Implementation Examples

#### API Key Security Tests

```typescript
describe("API Key Security", () => {
  test("should not expose API keys in response headers", async () => {
    const response = await app.request("/calendar/ics/user123", {
      headers: { Authorization: "ApiKey test-key" },
    });

    // Ensure API key is not leaked in response
    expect(response.headers.get("Authorization")).toBeNull();
    expect(JSON.stringify(response.headers)).not.toContain("test-key");
  });

  test("should reject API keys in query parameters", async () => {
    // This test should PASS once security vulnerability is fixed
    const response = await app.request("/calendar/ics/user123?key=test-key");
    expect(response.status).toBe(401); // Should be rejected
  });
});
```

#### Input Validation Tests

```typescript
describe("Input Validation Security", () => {
  test("should sanitize userId parameters", async () => {
    const maliciousUserId = "../../../etc/passwd";
    const response = await app.request(`/calendar/ics/${maliciousUserId}`, {
      headers: { Authorization: "ApiKey valid-key" },
    });

    expect(response.status).toBe(400); // Should reject malicious input
  });

  test("should handle XSS attempts in calendar data", async () => {
    const xssPayload = '<script>alert("xss")</script>';
    // Test with XSS payload in calendar event data
    // Ensure proper escaping/sanitization
  });
});
```

### Security Testing Tools Integration

#### Static Analysis

```bash
# Security vulnerability scanning
npm audit
bun audit

# Static code analysis for security issues
npx eslint-config-security
```

#### Runtime Security Testing

```bash
# API security testing (future implementation)
npm run test:security:api

# Load testing for DoS resistance
npm run test:load

# Penetration testing simulation
npm run test:pentest
```

### Security Test Coverage Requirements

Before production deployment, ensure these security test categories achieve minimum coverage:

- [ ] **Authentication**: 100% of auth flows tested
- [ ] **Authorization**: All scope combinations tested
- [ ] **Input Validation**: All endpoints tested with malicious input
- [ ] **Rate Limiting**: All endpoints tested for abuse resistance
- [ ] **Security Headers**: All required headers validated
- [ ] **Error Handling**: No sensitive data leaked in errors
- [ ] **Logging**: No sensitive data logged

### Continuous Security Testing

Integrate security tests into CI/CD pipeline:

```yaml
# .github/workflows/security.yml (example)
- name: Run Security Tests
  run: |
    bun test --grep "security"
    npm audit --audit-level moderate
    npx retire --severity medium
```

### Security Testing Checklist

Before each release:

- [ ] All security tests passing
- [ ] No new security vulnerabilities introduced
- [ ] Static analysis clean
- [ ] Dependency vulnerability scan clean
- [ ] Manual security review completed
- [ ] Security test coverage meets minimum thresholds
