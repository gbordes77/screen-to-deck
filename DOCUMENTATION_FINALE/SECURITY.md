# Security Policy

## Supported Versions

We provide security updates for the following versions of MTG Screen-to-Deck:

| Version | Supported          | End of Support |
| ------- | ------------------ | -------------- |
| 2.1.x   | ✅ Active Support  | Current        |
| 2.0.x   | ⚠️ Security Only   | 2025-12-31     |
| 1.x.x   | ❌ End of Life     | 2025-01-15     |
| < 1.0   | ❌ End of Life     | 2024-09-01     |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT Create a Public Issue

Security vulnerabilities should **never** be reported via public GitHub issues, Discord, or other public channels.

### 2. Report Via Email

Send security reports to: `security@[project-domain].com`

Include the following information:
- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** assessment
- **Suggested fix** (if you have one)
- Your **contact information** for follow-up

### 3. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Resolution Target**: Within 30 days for critical issues

## Security Measures

### Authentication & Authorization

#### API Keys
- **Storage**: API keys must be stored in environment variables, never in code
- **Rotation**: Rotate API keys every 90 days
- **Scope**: Use minimal required permissions for each service
- **Validation**: All API requests are validated server-side

#### Discord Bot Token
- **Protection**: Token stored in `.env` file, never committed to repository
- **Permissions**: Bot uses minimal Discord permissions required
- **Regeneration**: Token should be regenerated if compromised

### Data Protection

#### Image Handling
- **Upload Limits**: Maximum 25MB per image
- **Type Validation**: Only JPEG, PNG, WebP formats accepted
- **Sanitization**: All EXIF data stripped from uploaded images
- **Storage**: Temporary storage with automatic cleanup after 1 hour
- **No PII**: Images are processed for game content only

#### User Data
- **Minimal Collection**: We don't store personal information
- **Session Data**: Cleared after 24 hours of inactivity
- **No Tracking**: No analytics or user tracking implemented
- **GDPR Compliant**: Right to deletion available on request

### Infrastructure Security

#### Environment Variables
```bash
# Required secure configuration
OPENAI_API_KEY=sk-...        # Never expose, rotate regularly
DISCORD_TOKEN=...             # Keep private, regenerate if leaked
NODE_ENV=production          # Always set in production
SECURE_COOKIES=true          # Enable in production
RATE_LIMIT_ENABLED=true      # Prevent abuse
```

#### Rate Limiting
- **API Endpoints**: 100 requests per minute per IP
- **OCR Processing**: 10 images per minute per user
- **Discord Commands**: 5 commands per minute per user
- **Scryfall API**: Respects 10 requests/second limit

#### Input Validation
- **File Upload**: Strict MIME type checking
- **User Input**: All inputs sanitized against XSS
- **SQL Injection**: Parameterized queries only
- **Path Traversal**: Absolute paths validated
- **Command Injection**: No shell command execution

### Network Security

#### HTTPS/TLS
- **Production**: HTTPS required for all endpoints
- **Certificates**: Use Let's Encrypt or commercial CA
- **TLS Version**: Minimum TLS 1.2, prefer TLS 1.3
- **HSTS**: Enabled with 1-year max-age

#### CORS Policy
```javascript
// Production CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-domain.com'],
  credentials: true,
  optionsSuccessStatus: 200
}
```

#### Content Security Policy
```javascript
// Recommended CSP headers
{
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block"
}
```

## Known Security Considerations

### Third-Party Dependencies

1. **NPM Packages**: Run `npm audit` regularly
2. **Python Packages**: Use `pip-audit` for vulnerability scanning
3. **Docker Images**: Keep base images updated
4. **OpenAI API**: Follow OpenAI's security best practices

### Common Vulnerabilities Prevention

#### XSS (Cross-Site Scripting)
- React automatically escapes values
- Never use `dangerouslySetInnerHTML` with user input
- Sanitize markdown content if displayed

#### CSRF (Cross-Site Request Forgery)
- Use CSRF tokens for state-changing operations
- Validate `Origin` and `Referer` headers
- Implement SameSite cookies

#### DoS (Denial of Service)
- Rate limiting on all endpoints
- Request size limits (25MB max)
- Timeout long-running operations (30s max)
- Queue system prevents overload

## Security Checklist for Deployment

### Pre-Deployment
- [ ] All dependencies updated (`npm audit fix`)
- [ ] Environment variables secured
- [ ] API keys rotated if needed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] HTTPS certificates valid

### Post-Deployment
- [ ] Monitor error logs for suspicious activity
- [ ] Check for unusual API usage patterns
- [ ] Verify no sensitive data in logs
- [ ] Test rate limiting is working
- [ ] Confirm CORS policy is restrictive

### Regular Maintenance
- [ ] Weekly: Review access logs
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Rotate API keys
- [ ] Yearly: Security audit

## Incident Response Plan

### 1. Detection
- Monitor application logs
- Set up alerts for unusual patterns
- User reports via security email

### 2. Containment
- Isolate affected systems
- Disable compromised credentials
- Enable maintenance mode if needed

### 3. Investigation
- Analyze logs and access patterns
- Identify attack vector
- Assess data exposure

### 4. Remediation
- Patch vulnerability
- Update dependencies
- Rotate all credentials
- Deploy fixes

### 5. Communication
- Notify affected users within 72 hours
- Publish security advisory
- Update this document

## Security Tools

### Recommended Security Tools

```bash
# Node.js Security
npm audit                    # Check for vulnerabilities
npm audit fix               # Auto-fix vulnerabilities
npx snyk test              # Advanced vulnerability scanning

# Python Security
pip-audit                   # Python dependency scanner
bandit -r discord-bot/     # Security linter for Python
safety check               # Check dependencies

# Docker Security
docker scan <image>        # Scan Docker images
trivy image <image>       # Container vulnerability scanner

# General Security
git-secrets               # Prevent committing secrets
gitleaks                 # Detect secrets in git repos
```

## Contact

For security concerns, contact: `security@[project-domain].com`

For general issues, use GitHub Issues (non-security only).

---

*Last Updated: 2025-08-11*
*Next Review: 2025-09-11*