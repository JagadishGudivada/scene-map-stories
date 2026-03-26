

# Add Authentication Page to Sarevista

## What
Create a polished `/auth` page with email+password sign-up/sign-in and Google OAuth, matching the existing Sarevista dark cinematic design system. This requires connecting an external Supabase project first.

## Prerequisites
- Connect an external Supabase project to enable authentication
- Enable Google OAuth provider in the Supabase dashboard

## Implementation

### 1. Connect Supabase
Set up the Supabase client integration (`src/integrations/supabase/client.ts`) and environment variables.

### 2. Create Auth page (`src/pages/Auth.tsx`)
A single page handling both sign-in and sign-up modes with a toggle.

**Layout:**
- Full-viewport split: left panel = cinematic hero image with grain overlay, tagline, and branding; right panel = auth form
- Mobile: form only, hero hidden
- Glassmorphism form card matching existing card style

**Form features:**
- Email + password fields with validation (zod)
- Toggle between "Sign In" and "Create Account" modes
- Google OAuth button (outlined, with Google icon)
- "Forgot password?" link → triggers `resetPasswordForEmail`
- Amber primary CTA button with `shimmer-sweep` animation
- Error/success toasts via existing toast system
- Loading states on buttons

**Typography & colors:** Instrument Serif heading, Inter body, all existing CSS tokens (amber CTA, glass cards, grain texture)

### 3. Create Reset Password page (`src/pages/ResetPassword.tsx`)
- Simple centered form to set a new password
- Checks for `type=recovery` in URL hash
- Calls `supabase.auth.updateUser({ password })`

### 4. Create Auth context (`src/hooks/useAuth.tsx`)
- `AuthProvider` wrapping the app with `onAuthStateChange` listener (set up BEFORE `getSession()`)
- Exposes `user`, `session`, `signOut`, `loading`
- Used by Navigation to show avatar/login button conditionally

### 5. Update routing (`src/App.tsx`)
- Add `/auth` and `/reset-password` routes (public, no nav)
- Wrap app with `AuthProvider`
- Conditionally hide nav on auth pages

### 6. Update Navigation
- Replace static avatar with conditional: logged in → avatar + sign out; logged out → "Sign In" amber button linking to `/auth`

## Files Changed
| File | Action |
|---|---|
| `src/integrations/supabase/client.ts` | Create — Supabase client init |
| `src/pages/Auth.tsx` | Create — Auth page |
| `src/pages/ResetPassword.tsx` | Create — Password reset page |
| `src/hooks/useAuth.tsx` | Create — Auth context/provider |
| `src/App.tsx` | Edit — Add routes, wrap with AuthProvider |
| `src/components/Navigation.tsx` | Edit — Conditional auth UI |

