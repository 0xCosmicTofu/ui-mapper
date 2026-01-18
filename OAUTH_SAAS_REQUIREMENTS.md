# OAuth-SaaS Branch Requirements

This document outlines the security requirements that need to be implemented in the `/oauth-saas` branch when adding authentication workflow.

## Overview

The main branch now has all security improvements in place (SSRF protection, password validation, security headers, etc.) but authentication is **disabled** to allow public access. The `/oauth-saas` branch should implement the authentication workflow that integrates with these security features.

---

## Required Authentication Implementation

### 1. Middleware Authentication (`middleware.ts`)

**Current State:** Public access enabled  
**Required:** Add authentication checks

```typescript
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { auth } from "./auth";

export default async function middleware(req: NextRequest) {
  const session = await auth();
  const { pathname } = req.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/error'];
  const isAuthPage = pathname.startsWith('/auth');
  const isPublicRoute = publicRoutes.includes(pathname);
  const isApiRoute = pathname.startsWith('/api');
  
  // Allow public routes and API routes (API routes handle their own auth)
  if (isPublicRoute || isApiRoute) {
    // If authenticated user tries to access auth pages, redirect to home
    if (session && isAuthPage && pathname !== '/auth/error') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }
  
  // Protect all other routes - require authentication
  if (!session) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  return NextResponse.next();
}
```

**Key Points:**
- Redirect unauthenticated users to `/auth/signin` with `callbackUrl`
- Allow public access to auth pages
- Redirect authenticated users away from auth pages

---

### 2. API Route Authentication

#### `/api/analyze/route.ts`

**Required:** Add authentication check at the start of `POST` handler

```typescript
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // ... rest of the handler
}
```

#### `/api/export/route.ts`

**Required:** Add authentication check at the start of `POST` handler

```typescript
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // ... rest of the handler
}
```

**Key Points:**
- Return `401 Unauthorized` for unauthenticated requests
- Use consistent error format: `{ success: false, error: "Unauthorized" }`

---

## Security Features Already in Place

The following security features are already implemented and should **NOT** be changed:

### ✅ SSRF Protection
- **Location:** `lib/utils/url-validation.ts`
- **Status:** Active and working
- **Action:** Keep as-is, already integrated into analyze route

### ✅ Password Validation
- **Location:** `lib/utils/password-validation.ts`
- **Status:** Active for signup
- **Requirements:**
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Action:** Keep as-is, already integrated

### ✅ Security Headers
- **Location:** `next.config.ts`
- **Status:** Active
- **Headers Included:**
  - HSTS (Strict-Transport-Security)
  - X-Frame-Options
  - X-Content-Type-Options
  - X-XSS-Protection
  - Content-Security-Policy
  - Referrer-Policy
  - Permissions-Policy
- **Action:** Keep as-is

### ✅ Environment Variable Validation
- **Location:** `lib/utils/env.ts` and `lib/utils/startup-validation.ts`
- **Status:** Available (not enforced on startup)
- **Action:** Consider calling `validateStartup()` in your branch if needed

### ✅ Debug Logging Gating
- **Status:** All debug logs gated behind `DEBUG_LOGGING` env var
- **Action:** Keep as-is

### ✅ Error Message Sanitization
- **Status:** Production errors are generic, dev errors are detailed
- **Action:** Keep as-is

---

## Integration Checklist

When implementing authentication in the `/oauth-saas` branch:

- [ ] Update `middleware.ts` to check for authentication
- [ ] Add authentication check to `/api/analyze/route.ts`
- [ ] Add authentication check to `/api/export/route.ts`
- [ ] Test that unauthenticated users are redirected to sign-in
- [ ] Test that authenticated users can access all routes
- [ ] Test that Google OAuth flow works with authentication
- [ ] Test that manual sign-in/sign-up works with authentication
- [ ] Verify SSRF protection still works after auth changes
- [ ] Verify password validation still works for new signups
- [ ] Test that security headers are still applied
- [ ] Verify error messages are still sanitized in production

---

## Testing Requirements

### Authentication Flow Tests

1. **Unauthenticated Access:**
   - Visit `/` → Should redirect to `/auth/signin?callbackUrl=/`
   - Visit `/api/analyze` → Should return `401 Unauthorized`
   - Visit `/api/export` → Should return `401 Unauthorized`

2. **Authenticated Access:**
   - Sign in → Should redirect to `/` (or callbackUrl)
   - Visit `/` → Should show main app
   - Use analyze feature → Should work
   - Use export feature → Should work

3. **OAuth Flow:**
   - Click "Sign in with Google" → Should redirect to Google
   - Complete Google auth → Should redirect back to app
   - Should be authenticated and able to use features

4. **Manual Sign-up:**
   - Create account with weak password → Should show validation error
   - Create account with strong password → Should succeed
   - Sign in with new account → Should work

---

## Notes

- All security improvements (SSRF, password validation, headers) are already in place
- Only authentication checks need to be added
- The authentication infrastructure (NextAuth, auth.ts, auth.config.ts) is already set up
- Password complexity requirements are enforced for new signups
- Existing users are not affected by password requirements until they change passwords

---

## Files to Modify in `/oauth-saas` Branch

1. `middleware.ts` - Add authentication checks
2. `app/api/analyze/route.ts` - Add authentication check (remove the NOTE comment)
3. `app/api/export/route.ts` - Add authentication check (remove the NOTE comment)

## Files to Keep As-Is

- `lib/utils/url-validation.ts` - SSRF protection (already working)
- `lib/utils/password-validation.ts` - Password validation (already working)
- `next.config.ts` - Security headers (already working)
- `lib/utils/env.ts` - Environment utilities (already working)
- `auth.ts` - Authentication configuration (already set up)
- `auth.config.ts` - Auth providers (already configured)

---

**Last Updated:** January 2025  
**Branch:** `/oauth-saas`  
**Status:** Ready for authentication implementation
