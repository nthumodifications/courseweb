# NTHUMods Secure API

⚠️ **SECURITY NOTICE**: This API has undergone security review. See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for detailed findings and remediation requirements before production deployment.

## Overview

This repository contains the secure API for NTHUMods, providing secure endpoints for calendar sharing and user data access. The API is built on Bun and uses Hono.js for routing, Prisma for database access, and Firebase for storing calendar events.

## Security Status

🔴 **NOT PRODUCTION READY** - Critical security vulnerabilities identified  
📋 **Audit Complete** - See security audit report for details  
🛠️ **Remediation Required** - Address critical issues before deployment

## Features

- **Calendar API**: Endpoints for accessing and sharing calendar data in various formats
- **API Key Authentication**: Scope-based access control system with identified security issues
- **iCalendar Generator**: Utility for generating standards-compliant iCalendar files
- **OAuth Integration**: NTHU OAuth flow for user authentication

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (version 1.0.0 or higher)
- [PostgreSQL](https://www.postgresql.org/) (for development)
- [Firebase Project](https://firebase.google.com/) (for event storage)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-org/nthumods-secure-api.git
   cd nthumods-secure-api
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your configuration

4. Generate Prisma client:

   ```bash
   bunx prisma generate
   ```

5. Start the development server:
   ```bash
   bun dev
   ```

## API Documentation

⚠️ **Security Warning**: Current API implementation has security vulnerabilities. Use with caution in development only.

### Authentication

The API currently supports two authentication methods (⚠️ **This dual approach is a security vulnerability**):

1. **Header-based (Recommended)**: `Authorization: ApiKey {your-api-key}`
2. **Query parameter (Deprecated/Insecure)**: `?key={your-api-key}`

**Production Recommendation**: Only use header-based authentication and remove query parameter support.

### Calendar API

#### GET /calendar/ics/:userId

Gets a user's calendar in iCalendar format.

**Current Implementation (Insecure):**

```bash
curl "https://api.example.com/calendar/ics/user123?key=your-api-key&type=basic"
```

**Recommended Secure Implementation:**

```bash
curl -H "Authorization: ApiKey your-api-key" \
     "https://api.example.com/calendar/ics/user123?type=basic"
```

**Parameters:**

- `userId` (path): User identifier
- `type` (query): `basic` or `full` (default: `basic`)
- `key` (query, deprecated): API key ⚠️ **Security Risk**

**Required Headers:**

- `Authorization`: ApiKey {your-api-key} (recommended method)

**Security Considerations:**

- API keys in URLs are logged by web servers and proxies
- Use POST method for sensitive operations
- Implement rate limiting (currently missing)

#### GET /calendar

Gets a user's calendar events as JSON.

**Secure Usage:**

```bash
curl -H "Authorization: ApiKey your-api-key" \
     -H "Content-Type: application/json" \
     "https://api.example.com/calendar"
```

**Response Format:**

```json
{
  "events": [
    {
      "id": "event-id",
      "title": "Event Title",
      "start": "2024-01-01T10:00:00Z",
      "end": "2024-01-01T11:00:00Z"
    }
  ],
  "metadata": {
    "total": 1,
    "generated_at": "2024-01-01T09:00:00Z"
  }
}
```

## API Key Authentication

⚠️ **Current Security Issues**: The API key system has several critical vulnerabilities that must be addressed before production use.

### Scope-Based Access Control

API keys support the following scopes:

- `calendar`: Full calendar access (read/write)
- `calendar:read`: Read-only calendar access
- `profile`: Full profile access (read/write)
- `profile:read`: Read-only profile access

### Current Implementation Problems

🔴 **Critical Issues:**

1. **Plain Text Storage**: API keys stored unencrypted in database
2. **URL Exposure**: Keys passed in query parameters, logged everywhere
3. **No Rotation**: No mechanism for key rotation or expiration
4. **Weak Generation**: Predictable key generation algorithm

### Secure API Key Management (Recommended)

**Key Generation:**

```typescript
// Generate cryptographically secure API keys
const apiKey = crypto.randomBytes(32).toString("hex");
const hashedKey = await bcrypt.hash(apiKey, 12);
```

**Key Storage:**

```typescript
// Store only hashed keys in database
await prisma.apiKey.create({
  data: {
    keyHash: hashedKey, // Never store plain text
    scopes: ["calendar:read"],
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    lastUsed: null,
  },
});
```

**Key Validation:**

```typescript
// Validate against hashed keys
const isValid = await bcrypt.compare(providedKey, storedKeyHash);
```

### Usage Examples

**Secure Header-Based Authentication:**

```bash
# Recommended approach
curl -H "Authorization: ApiKey abc123..." \
     "https://api.example.com/calendar"
```

**Insecure Query Parameter (Current):**

```bash
# ⚠️ DO NOT USE - Security vulnerability
curl "https://api.example.com/calendar?key=abc123..."
```

### API Key Lifecycle

1. **Generation**: Cryptographically secure random generation
2. **Distribution**: Secure delivery to users (not via email/logs)
3. **Storage**: Hashed storage with salt
4. **Rotation**: Regular rotation (recommended: 90 days)
5. **Revocation**: Immediate invalidation when compromised
6. **Monitoring**: Track usage patterns and detect anomalies

## Testing

The project includes comprehensive tests that can be run without requiring a real database connection:

```bash
bun test
```

For more detailed testing instructions, see [TESTING.md](TESTING.md).

## Development

### Project Structure

- `src/api/`: API route handlers
- `src/middleware/`: Middleware for authentication and request processing
- `src/utils/`: Utility functions
- `src/config/`: Configuration files
- `prisma/`: Prisma schema and migrations
- `src/__mocks__/`: Mock implementations for testing

### Coding Standards

- TypeScript strict mode
- ESLint for code quality
- Prettier for code formatting

## Security Implementation Guidelines

### Current Security Issues (As of Latest Audit)

⚠️ **CRITICAL VULNERABILITIES IDENTIFIED** - The following security issues must be addressed before production deployment:

1. **API Key Exposure in URLs** - API keys are passed in query parameters, exposing them in server logs
2. **Plain Text API Key Storage** - Keys stored unencrypted in database
3. **Missing Rate Limiting** - No protection against abuse or brute force attacks
4. **Insufficient Security Logging** - Limited monitoring and alerting capabilities

For complete details, see [SECURITY_AUDIT.md](./SECURITY_AUDIT.md).

### Security Best Practices

#### API Key Management

🔐 **Recommended Implementation:**

```typescript
// Use Authorization header instead of query parameters
headers: {
  'Authorization': 'Bearer your-api-key-here'
}

// Hash API keys before database storage
const hashedKey = await bcrypt.hash(apiKey, 12);

// Implement key rotation
const keyRotationInterval = 90; // days
```

#### Rate Limiting

🚦 **Required Implementation:**

```typescript
// Example rate limiting configuration
const rateLimits = {
  "/calendar/ics": { requests: 100, window: "15m" },
  "/calendar": { requests: 200, window: "15m" },
  "/api/apikeys": { requests: 10, window: "1h" },
};
```

#### Security Headers

🛡️ **Required Headers:**

```typescript
app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  await next();
});
```

#### Input Validation & Sanitization

✅ **Required Validation:**

```typescript
// Validate API scopes
const validScopes = ["calendar:read", "calendar", "profile:read", "profile"];

// Sanitize user inputs
const sanitizedUserId = validator.escape(userId);

// Validate request parameters
const schema = z.object({
  type: z.enum(["basic", "full"]).default("basic"),
  userId: z.string().uuid(),
});
```

### Deployment Security Checklist

Before deploying to production, ensure the following security measures are implemented:

- [ ] **API Key Security**

  - [ ] Remove API keys from URL query parameters
  - [ ] Implement proper Authorization header authentication
  - [ ] Hash API keys before database storage
  - [ ] Implement API key rotation mechanism

- [ ] **Rate Limiting & DDoS Protection**

  - [ ] Implement rate limiting per endpoint
  - [ ] Add IP-based rate limiting
  - [ ] Configure request size limits
  - [ ] Set up monitoring for abnormal traffic patterns

- [ ] **Security Headers & CORS**

  - [ ] Configure security headers (CSP, HSTS, etc.)
  - [ ] Properly configure CORS policies
  - [ ] Remove debug headers in production

- [ ] **Monitoring & Logging**

  - [ ] Implement comprehensive security logging
  - [ ] Set up intrusion detection monitoring
  - [ ] Configure alerting for security events
  - [ ] Implement audit trails for sensitive operations

- [ ] **Authentication & Authorization**

  - [ ] Remove dual authentication paths
  - [ ] Implement proper session management
  - [ ] Add multi-factor authentication support
  - [ ] Regular security token rotation

- [ ] **Database Security**
  - [ ] Enable encryption at rest
  - [ ] Use parameterized queries (already implemented)
  - [ ] Implement database connection encryption
  - [ ] Regular backup encryption verification

### Security Testing

Before deployment, run comprehensive security tests:

```bash
# Run security-focused tests
bun test:security

# Static security analysis
npm audit
bun audit

# Check for known vulnerabilities
npx retire

# Test API endpoints for security issues
npm run test:integration:security
```

### Incident Response

In case of security incidents:

1. **Immediate Response**: Disable affected API endpoints
2. **Assessment**: Review logs and determine scope of breach
3. **Containment**: Rotate all API keys and invalidate active sessions
4. **Recovery**: Apply security patches and restore services
5. **Lessons Learned**: Update security measures and documentation

### Security Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Prisma Security Guidelines](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)

## License

MIT
