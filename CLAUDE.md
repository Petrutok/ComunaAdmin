# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Primăria Digitală" - a digital platform for local government (Romanian commune/municipality) that provides online services for citizens. The application is a Next.js 15 PWA with Capacitor for mobile deployment, Firebase for backend services, and includes features like online forms, announcements, job postings, issue reporting, and an email registry system (registratură).

## Commands

### Development
```bash
# Start dev server on port 9002 with Turbopack
npm run dev

# Type checking
npm run typecheck

# Linting (currently ignores errors during builds)
npm run lint
```

### Build & Deploy
```bash
# Web build (exports static site)
npm run build

# Start production server
npm start
```

### Mobile Development (Capacitor)
```bash
# Build for mobile and copy assets
npm run mobile:build

# Sync Capacitor plugins
npm run mobile:sync

# Full mobile update (build + sync)
npm run mobile:update

# Android specific
npm run android:build    # Build and copy to Android
npm run android:open     # Open Android Studio
npm run android:run      # Build and open
npm run android:dev      # Run with live reload

# iOS specific
npm run ios:build        # Build and copy to iOS
npm run ios:open         # Open Xcode
npm run ios:run          # Build and open
npm run ios:dev          # Run with live reload

# Setup (first time only)
npm run mobile:init      # Initialize Capacitor and add platforms
npm run mobile:clean     # Clean and re-add platforms
```

### AI Features (Genkit)
```bash
npm run genkit:dev       # Start Genkit development server
npm run genkit:watch     # Start with watch mode
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router, static export mode
- **UI**: React 18 with Radix UI components, Tailwind CSS, Framer Motion
- **Backend**: Firebase (Firestore, Auth, Storage, Cloud Messaging)
- **Mobile**: Capacitor 5 for iOS/Android native apps
- **Forms**: React Hook Form with Zod validation
- **State**: TanStack Query for data fetching
- **AI**: Google Genkit for AI features
- **Email**: IMAP for email fetching, Resend for sending

### Key Configuration Notes
- **Static Export**: Uses `output: 'export'` for PWABuilder compatibility
- **Image Optimization**: Disabled (`unoptimized: true`)
- **Build Errors**: TypeScript and ESLint errors are ignored during builds
- **Service Worker**: Custom middleware handles SW headers and caching
- **Port**: Development server runs on port 9002

### Firebase Structure

**Client SDK** (`lib/firebase.ts`):
- Exports: `auth`, `db`, `storage`, `messaging`
- Collections defined in `COLLECTIONS` constant
- Main collections:
  - `announcements` - Community announcements with categories (terenuri, produse-locale, diverse, servicii, cumparare)
  - `jobs` - Job postings
  - `notifications` - Notification logs
  - `fcm_tokens` - Firebase Cloud Messaging tokens
  - `push_subscriptions` - Web push subscriptions
  - `registratura_emails` - Email registry system
  - `admins` - Admin user records

**Admin SDK** (`lib/firebase-admin.ts`):
- Lazy initialization to avoid build-time errors
- Use `getAdminDb()` to get Firestore instance
- Requires env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

### Core Services

**Email Registry System** (`lib/registratura-service.ts`, `lib/email-service.ts`):
- Automatic email fetching via IMAP
- Generates unique registration numbers (format: `REG-YYYY-NNNNNN`)
- Uploads attachments to Firebase Storage
- Tracks email status: `nou`, `in_lucru`, `rezolvat`, `respins`
- Uses transaction-based counter for registration numbers
- API route: `/api/fetch-emails` - fetches new emails from IMAP
- API route: `/api/registratura/count-new` - counts new emails
- Type definitions in `types/registratura.ts`

**Notification System** (`lib/notificationSystem.ts`):
- Web push notifications using service workers
- FCM (Firebase Cloud Messaging) integration
- Support for broadcast and targeted notifications
- Subscription management with cleanup of inactive subscriptions
- Notification history tracking

**Admin Authentication** (`contexts/AdminAuthContext.tsx`):
- Firebase Auth based
- Hardcoded list of authorized admins in `AUTHORIZED_ADMINS` array
- Additional check in Firestore `admins` collection
- Protects all `/admin/*` routes except `/admin/login`
- Auto-redirects unauthorized users to login

### Layout Structure

**Root Layout** (`app/layout.tsx`):
- Wraps app with `NotificationProvider` and `Toaster`
- Includes `ServiceWorkerRegistration` and `PWAInstallPrompt` components
- PWA manifest and icons configuration
- Romanian language (`lang="ro"`)

**Admin Layout** (`app/admin/layout.tsx`):
- Protected layout with `AdminAuthProvider`
- Admin sidebar navigation with badge for new emails
- User session display and logout
- Responsive mobile menu

### Component Organization

**UI Components** (`components/ui/`):
- Radix UI primitives with custom styling
- Consistent design system using Tailwind
- Common components: Button, Card, Dialog, Form inputs, etc.

**Admin Components** (`components/admin/`):
- `AdminSidebar` - Navigation with new email badges
- `EmailRegistryTable` - Display and manage registry emails
- `RegistraturaStats` - Statistics dashboard for email registry

**Notification Components**:
- `NotificationProvider` - Context provider for notifications
- `NotificationPermissionManager` - Handles push permission requests
- `ServiceWorkerRegistration` - Registers service worker on client
- `PWAInstallPrompt` - Install prompt for PWA

### Request Forms System

**Schema & Types** (`lib/schemas/request-schema.ts`, `lib/types/request-types.ts`):
- Zod schemas for form validation
- Dynamic form generation based on form type
- File upload support with `FileUpload` component

**Form Hook** (`lib/hooks/useSubmitRequest.ts`):
- Handles form submission with file uploads
- PDF generation using `lib/simple-pdf-generator.ts`
- Firebase Storage integration

**Dynamic Routes** (`app/cereri-online/[formType]/`):
- `CerereFormularClient.tsx` - Client component for form rendering
- Dynamic form generation based on route parameter

### Mobile-Specific Features

**Capacitor Configuration** (`capacitor.config.json`):
- App ID: `digital.primaria.app`
- Server URL: `https://primaria.digital`
- Web dir: `public`

**Mobile Detection**: Check `process.env.NEXT_PUBLIC_IS_MOBILE` or use Capacitor's platform detection APIs

### Middleware (`middleware.ts`)

- Sets Service Worker headers for all `.js` files
- Cache control for service worker files
- Security headers (X-Content-Type-Options)
- Applies to all routes except Next.js internals

## Important Patterns

### Firebase Operations
- Always check if admin DB is initialized before server-side operations
- Use transactions for counter increments (registration numbers)
- Handle Timestamp conversion between client/server

### Email Registry Workflow
1. Fetch emails via IMAP (API route triggered manually or by cron)
2. Check for duplicates using `messageId`
3. Generate unique registration number using transaction
4. Upload attachments to Storage
5. Create Firestore document with email data
6. Display in admin panel with filtering by status

### Notification Flow
1. User grants permission via `NotificationPermissionManager`
2. Subscribe to push notifications
3. Save subscription to `push_subscriptions` collection
4. Admin sends notifications via admin panel
5. Service worker displays notifications
6. Log sent notifications in `notification_history`

### Form Submission Flow
1. User fills form in `cereri-online/[formType]`
2. Client-side validation with Zod
3. File uploads to Firebase Storage
4. Generate PDF with form data
5. Save to Firestore
6. Send confirmation (optional)

## Environment Variables

Required variables (see `.env.local`):
```
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase Admin
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY

# Email (IMAP)
EMAIL_USER
EMAIL_PASSWORD
EMAIL_HOST
EMAIL_PORT
EMAIL_TLS

# Other
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_IS_MOBILE
```

## Common Issues & Solutions

### Firebase Admin Initialization
- Admin SDK may fail during build time - this is expected
- Always use `getAdminDb()` and check for null in API routes
- Gracefully handle missing env vars in production builds

### Service Worker Caching
- Service worker files should never be cached
- Middleware sets appropriate headers
- Clear cache if SW updates don't apply

### Mobile Build Process
- Must build Next.js first (`mobile:build`)
- Then sync with Capacitor (`mobile:sync`)
- Use `mobile:update` for both steps
- Web dir in capacitor config must match Next.js output

### Type Errors During Build
- TypeScript errors are currently ignored (`ignoreBuildErrors: true`)
- This is intentional for rapid development
- Consider fixing before production deployment

## File Structure Highlights

```
app/
├── admin/              # Admin panel pages
│   ├── registratura/   # Email registry
│   ├── cereri/         # Form submissions
│   ├── issues/         # Issue reports
│   └── ...
├── cereri-online/      # Public form system
│   └── [formType]/     # Dynamic form routes
├── api/                # API routes
│   ├── fetch-emails/   # IMAP email fetcher
│   └── registratura/   # Registry APIs
└── layout.tsx          # Root layout with providers

lib/
├── firebase.ts         # Client SDK & types
├── firebase-admin.ts   # Admin SDK
├── email-service.ts    # IMAP email fetching
├── registratura-service.ts  # Email registry logic
├── notificationSystem.ts    # Push notifications
└── schemas/            # Form validation schemas

components/
├── admin/              # Admin-specific components
└── ui/                 # Shared UI components

types/
└── registratura.ts     # Email registry types
```

## Testing

No test suite is currently configured. When adding tests:
- Use the build/lint commands to check for obvious errors
- Test Firebase operations carefully (uses real database)
- Test mobile builds on actual devices when possible
- Verify service worker updates apply correctly

## Deployment

The app uses static export (`output: 'export'`) which means:
- No server-side rendering (SSR)
- No API routes in production (must use separate backend)
- Suitable for static hosting (Vercel, Netlify, GitHub Pages)
- For API routes, deploy to a platform that supports Next.js API routes or create separate backend

Mobile apps are built separately using Capacitor and deployed to app stores.
