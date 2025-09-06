# NTHUMods Secure API - Security Audit Report

**Audit Date:** May 26, 2025  
**Auditor:** AI Security Analysis  
**Framework:** OWASP Top 10 2021  
**Threat Model:** Assuming worst-case scenario, excluding infrastructure infiltration

## Executive Summary

The NTHUMods Secure API implementation has several **CRITICAL** and **HIGH** severity vulnerabilities that require immediate attention. While the codebase demonstrates good practices in some areas (use of Prisma ORM, input validation), critical security flaws exist in authentication design, cryptographic implementation, and access control.

### Risk Level: **HIGH** 🔴

**Critical Issues Found:** 3  
**High Severity Issues:** 4  
**Medium Severity Issues:** 6  
**Low Severity Issues:** 2

---

## OWASP Top 10 2021 Analysis

### A01:2021 – Broken Access Control 🔴 **CRITICAL**

#### Issues Identified:

1. **API Key in URL Parameters** - CRITICAL

   - **Location:** `middleware/apikey.ts` lines 11-15
   - **Issue:** API keys can be passed as query parameters, exposing them in:
     - Server logs
     - Browser history
     - Referrer headers
     - Web server access logs

   ```typescript
   // VULNERABLE CODE
   if (authHeader && authHeader.startsWith("ApiKey ")) {
     apiKeyString = authHeader.slice(7);
   } else {
     apiKeyString = c.req.query("key"); // CRITICAL: API key in URL
   }
   ```

2. **Missing Rate Limiting** - HIGH

   - No rate limiting implementation found
   - API keys vulnerable to brute force attacks
   - No protection against API abuse

3. **Insufficient Authorization Validation** - MEDIUM
   - User ID validation depends on URL parameter matching
   - Potential for authorization bypass through parameter manipulation

#### Recommendations:

- **IMMEDIATE:** Remove API key support from query parameters
- Implement rate limiting (recommend: 100 requests/hour per API key)
- Add request throttling middleware
- Implement proper RBAC (Role-Based Access Control)

---

### A02:2021 – Cryptographic Failures 🔴 **CRITICAL**

#### Issues Identified:

1. **API Keys Stored in Plain Text** - CRITICAL

   - **Location:** Prisma schema, `validateApiKey` function
   - **Issue:** API keys stored without hashing
   - **Impact:** Database compromise = immediate API key exposure

   ```sql
   -- VULNERABLE SCHEMA
   model ApiKey {
     key String @unique  -- Plain text storage!
   }
   ```

2. **Weak API Key Generation** - HIGH

   - **Location:** `apikeys.ts` line 54
   - **Issue:** Predictable pattern with base64url encoding of UUID

   ```typescript
   // VULNERABLE CODE
   const apiKeyString =
     "api_" + Buffer.from(randomUUID().replace(/-/g, "")).toString("base64url");
   ```

3. **Session Security Issues** - MEDIUM
   - Cookies lack `Secure` and `SameSite=Strict` attributes in some configurations
   - Session fixation potential

#### Recommendations:

- **IMMEDIATE:** Hash API keys using bcrypt or Argon2 before storage
- Generate cryptographically secure random API keys (32+ bytes)
- Implement proper session security with secure cookie attributes
- Add API key rotation mechanism

---

### A03:2021 – Injection ✅ **LOW RISK**

#### Assessment:

- **SQL Injection:** Protected by Prisma ORM ✅
- **NoSQL Injection:** Firebase queries use safe methods ✅
- **Input Validation:** Zod schemas provide good validation ✅

#### Minor Issues:

- Some URL parameters lack length/format validation
- Consider adding more strict input sanitization

---

### A04:2021 – Insecure Design 🟡 **HIGH**

#### Issues Identified:

1. **Dual Authentication Paths** - HIGH

   - API keys accepted via both headers AND query parameters
   - Increases attack surface and complexity
   - Creates potential for credential leakage

2. **Information Disclosure in Error Messages** - MEDIUM

   ```typescript
   // INFORMATION LEAKAGE
   if (!apiKeyRecord) {
     throw new HTTPException(401, { message: "Invalid API key" });
   }
   if (apiKeyRecord.isRevoked) {
     throw new HTTPException(401, { message: "API key has been revoked" });
   }
   ```

3. **No API Key Lifecycle Management** - MEDIUM
   - No automatic expiration enforcement
   - No key rotation mechanism
   - Revoked keys remain in database

#### Recommendations:

- Remove query parameter authentication method
- Standardize error messages to prevent enumeration
- Implement proper API key lifecycle management
- Add audit logging for security events

---

### A05:2021 – Security Misconfiguration 🟡 **MEDIUM**

#### Issues Identified:

1. **Inconsistent CORS Policies** - MEDIUM

   - Production: Single origin (good)
   - Development: Multiple origins including localhost
   - **Location:** `src/api/index.ts` vs `oidc.tsx`

2. **Missing Security Headers** - MEDIUM

   - No HSTS, CSP, X-Frame-Options
   - Missing security header middleware

3. **Environment Variable Validation** - LOW
   - No startup validation for required environment variables

#### Recommendations:

- Implement consistent CORS policy across all endpoints
- Add security headers middleware
- Add environment variable validation at startup

---

### A06:2021 – Vulnerable and Outdated Components ✅ **LOW RISK**

#### Assessment:

- Dependencies appear up-to-date
- Using established libraries (Hono, Prisma, Firebase)
- No known vulnerable dependencies detected

#### Recommendations:

- Implement automated dependency scanning
- Regular security updates schedule

---

### A07:2021 – Identification and Authentication Failures 🟡 **MEDIUM**

#### Issues Identified:

1. **No Multi-Factor Authentication** - MEDIUM

   - Single factor authentication only
   - No additional security layers for sensitive operations

2. **Weak Session Management** - LOW
   - Sessions have reasonable timeouts
   - Could benefit from additional security measures

#### Recommendations:

- Consider implementing MFA for API key creation
- Add IP-based restrictions for API keys
- Implement session timeout warnings

---

### A08:2021 – Software and Data Integrity Failures ✅ **LOW RISK**

#### Assessment:

- Input validation through Zod schemas ✅
- Type safety through TypeScript ✅
- No unsafe deserialization detected ✅

---

### A09:2021 – Security Logging and Monitoring Failures 🟡 **HIGH**

#### Issues Identified:

1. **Insufficient Security Logging** - HIGH

   - No logging of authentication failures
   - No audit trail for API key usage
   - Missing security event monitoring

2. **Error Logging May Expose Sensitive Data** - MEDIUM
   - Console.error() statements could log sensitive information
   - No log sanitization

#### Recommendations:

- Implement comprehensive security logging
- Add monitoring for suspicious activity
- Sanitize logs to prevent data leakage
- Set up alerting for security events

---

### A10:2021 – Server-Side Request Forgery (SSRF) ✅ **LOW RISK**

#### Assessment:

- Limited external API calls
- Firebase admin SDK usage appears safe
- No user-controlled URL parameters for external requests

---

## Critical Action Items

### 🔴 IMMEDIATE (Fix within 24 hours)

1. **Remove API key support from query parameters**
2. **Hash API keys before database storage**
3. **Implement rate limiting**

### 🟡 HIGH PRIORITY (Fix within 1 week)

1. Add comprehensive security logging
2. Implement proper API key lifecycle management
3. Standardize error messages
4. Add security headers middleware

### 🟢 MEDIUM PRIORITY (Fix within 1 month)

1. Consistent CORS policies
2. Enhanced input validation
3. Session security improvements
4. Security monitoring setup

---

## Security Best Practices Compliance

| Category         | Status     | Notes                                              |
| ---------------- | ---------- | -------------------------------------------------- |
| Authentication   | ❌ FAIL    | API keys in URLs, plain text storage               |
| Authorization    | ⚠️ PARTIAL | Basic scope checking, missing fine-grained control |
| Input Validation | ✅ GOOD    | Zod schemas, type safety                           |
| Output Encoding  | ✅ GOOD    | No XSS vectors found                               |
| Error Handling   | ❌ FAIL    | Information disclosure                             |
| Logging          | ❌ FAIL    | Insufficient security logging                      |
| Cryptography     | ❌ FAIL    | Weak key generation, plain text storage            |

---

## Compliance and Regulatory Considerations

- **GDPR:** API logging may capture personal data - ensure compliance
- **SOC 2:** Missing audit controls and monitoring
- **ISO 27001:** Insufficient access controls and key management

---

## Testing Recommendations

1. **Penetration Testing:** Focus on authentication bypass and injection
2. **Code Review:** Static analysis for security patterns
3. **Dependency Scanning:** Automated vulnerability scanning
4. **Configuration Review:** Security settings validation

---

## Conclusion

While the codebase shows good architectural decisions in some areas, the **CRITICAL** vulnerabilities in API key handling and storage pose immediate security risks. The implementation should not be deployed to production without addressing the critical issues identified above.

**Overall Security Rating: D+ (Poor)**

Immediate remediation of critical issues is required before production deployment.
