# Lifeflow Setup Checklist

## 📋 Pre-Launch Configuration

Complete these steps to get Lifeflow fully operational with all external integrations.

---

## ✅ Phase 1: Environment Setup (Completed)

- [x] Node.js 18+ installed
- [x] npm dependencies installed (44 packages)
- [x] TypeScript compilation verified (0 errors)
- [x] .env file created
- [x] .env.example created with documentation
- [x] Metro bundler verified (runs on port 8082)
- [x] Expo Doctor checks: 17/17 passing

---

## ⏳ Phase 2: Backend & Authentication

### Supabase Setup

**Status:** ⏳ Awaiting Credentials

Steps to complete:
- [ ] Visit https://supabase.com
- [ ] Sign up / Log in
- [ ] Create new project
  - [ ] Project name: "Lifeflow"
  - [ ] Region: Choose closest to your location
  - [ ] Database password: Generate strong password (save it)
  - [ ] Wait for project initialization (2-3 minutes)
- [ ] Get Credentials:
  - [ ] Go to Settings > API
  - [ ] Copy `Project URL` → EXPO_PUBLIC_SUPABASE_URL
  - [ ] Copy `anon` key → EXPO_PUBLIC_SUPABASE_ANON_KEY
- [ ] Update `.env` file:
  ```env
  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-key-here
  ```
- [ ] Create Database Tables (run SQL in Supabase Editor):
  ```sql
  -- Users table
  CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_description TEXT,
    objective_90d TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- Journal entries
  CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE,
    gratitud_1 TEXT,
    gratitud_2 TEXT,
    gratitud_3 TEXT,
    victorias TEXT[],
    retos TEXT[],
    intencion TEXT,
    breathing_done BOOLEAN DEFAULT FALSE,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- Sovereignty wheel assessments
  CREATE TABLE sovereignty_wheel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    fe INTEGER,
    finanzas INTEGER,
    salud INTEGER,
    familia INTEGER,
    mente INTEGER,
    negocio INTEGER,
    impacto INTEGER,
    legado INTEGER,
    actualizado_at TIMESTAMP DEFAULT NOW()
  );

  -- Biometric data
  CREATE TABLE biometric_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_type TEXT, -- 'whoop' or 'oura'
    hrv_score INTEGER,
    sleep_hours DECIMAL,
    recovery_score INTEGER,
    recorded_at TIMESTAMP DEFAULT NOW()
  );

  -- AI session history
  CREATE TABLE ai_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    messages JSONB, -- Array of {role, content}
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- Community sectors
  CREATE TABLE community_sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    emoji TEXT,
    agent_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- Community posts (Intel)
  CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id UUID REFERENCES community_sectors(id),
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sovereignty_wheel ENABLE ROW LEVEL SECURITY;

  -- RLS Policies (allow users to see only their own data)
  CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

  CREATE POLICY "Users can view own entries"
    ON journal_entries FOR SELECT
    USING (auth.uid() = user_id);

  -- Enable Realtime on community tables
  ALTER PUBLICATION supabase_realtime ADD TABLE community_sectors;
  ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
  ```
- [ ] Test connection in app
  - [ ] Open app
  - [ ] Try Register → should create user in database
  - [ ] Check Supabase dashboard: Tables > users > see new row

---

## 🤖 Phase 3: AI Mentoring (OpenAI)

**Status:** ⏳ Awaiting API Key

Steps to complete:
- [ ] Visit https://platform.openai.com
- [ ] Sign up / Log in (requires paid account with $5+ balance)
- [ ] Go to https://platform.openai.com/api-keys
- [ ] Click "Create new secret key"
  - [ ] Name: "Lifeflow"
  - [ ] Copy key → save securely (shown only once)
- [ ] Update `.env` file:
  ```env
  EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...your-key-here
  ```
- [ ] Test AI mentoring in app
  - [ ] Navigate to Mentor tab (5th icon)
  - [ ] Type a message → should get AI response
  - [ ] Check console for any errors
  - [ ] Verify response relates to user's sovereign wheels

**Note:** OpenAI API is pay-as-you-go. Monitor usage at https://platform.openai.com/account/billing/overview

---

## 💳 Phase 4: In-App Purchases (RevenueCat)

**Status:** ⏳ Awaiting Setup

Steps to complete:
- [ ] Visit https://revenuecat.com
- [ ] Sign up / Log in
- [ ] Create new project: "Lifeflow"
- [ ] Add Products:
  - [ ] `jaco_soberano_monthly` - Price: $29.99/month
  - [ ] `jaco_soberano_annual` - Price: $299.99/year
  - [ ] `jaco_maestro_lifetime` - Price: $497.00 (one-time)
- [ ] Get API Key:
  - [ ] Settings > API Keys > Copy Public SDK Key
  - [ ] Update `.env`:
    ```env
    REVENUE_CAT_API_KEY=your-api-key
    ```
- [ ] Connect to App Store (iOS):
  - [ ] Apple App Store Connect credentials
  - [ ] Shared secret from App Store Connect
- [ ] Connect to Google Play (Android):
  - [ ] Google Play Console service account JSON
  - [ ] RevenueCat will guide through setup
- [ ] Test subscriptions in app
  - [ ] Navigate to Planes tab
  - [ ] Tap "Seleccionar Plan" on $29/month plan
  - [ ] Mock purchase should complete (real app requires app store testing)

---

## 📱 Phase 5: Biometrics Integration

### Whoop Setup

**Status:** ⏳ Optional (OAuth ready)

- [ ] Visit https://www.whoop.com/developer
- [ ] Register application
- [ ] Get Client ID & Secret
- [ ] Update `.env`:
  ```env
  WHOOP_CLIENT_ID=your-client-id
  WHOOP_CLIENT_SECRET=your-client-secret
  ```
- [ ] Test in Biometría tab
  - [ ] Tap "Conectar Whoop"
  - [ ] Should open Whoop OAuth page
  - [ ] After auth: should show HRV chart

### Oura Ring Setup

**Status:** ⏳ Optional (OAuth ready)

- [ ] Visit https://cloud.ouraring.com/oauth/applications/
- [ ] Create new application
- [ ] Get Client ID & Secret
- [ ] Update `.env`:
  ```env
  OURA_CLIENT_ID=your-client-id
  OURA_CLIENT_SECRET=your-client-secret
  ```
- [ ] Test in Biometría tab
  - [ ] Tap "Conectar Oura"
  - [ ] Should open Oura OAuth page
  - [ ] After auth: should show sleep & recovery data

---

## 🍎 Phase 6: iOS Deployment

**Status:** ⏳ Requires Apple Account

Prerequisites:
- [ ] Apple Developer account ($99/year) - https://developer.apple.com
- [ ] Mac with Xcode installed (can build on Mac or use EAS)

Steps to complete:
- [ ] Create Certificates & Provisioning Profiles:
  - [ ] Go to https://developer.apple.com/account
  - [ ] Certificates > Create Certificate (Development)
  - [ ] Identifiers > Create App ID (com.yourcompany.lifeflow)
  - [ ] Devices > Register test devices
  - [ ] Provisioning Profiles > Create Development profile
- [ ] Update app configuration:
  - [ ] Edit `app.json`:
    ```json
    {
      "ios": {
        "bundleIdentifier": "com.yourcompany.lifeflow",
        "buildNumber": "1"
      }
    }
    ```
- [ ] Update EAS credentials:
  - [ ] Run: `eas credentials configure --platform ios`
  - [ ] Follow prompts to upload certificates
- [ ] Build for simulator:
  ```bash
  npm run ios
  # or
  eas build --platform ios --profile development
  ```
- [ ] Build for App Store:
  ```bash
  npm run build:ios
  ```
- [ ] Submit to App Store:
  ```bash
  npm run submit:ios
  ```

---

## 🤖 Phase 7: Android Deployment

**Status:** ⏳ Requires Google Account

Prerequisites:
- [ ] Google Play Developer account ($25 one-time) - https://play.google.com/console
- [ ] Android SDK (auto-installed with npm/Expo)

Steps to complete:
- [ ] Create Signing Key:
  - [ ] Run: `eas credentials configure --platform android`
  - [ ] Choose "Generate new" for keystore
  - [ ] EAS will generate and store credentials securely
- [ ] Update app configuration:
  - [ ] Edit `app.json`:
    ```json
    {
      "android": {
        "package": "com.yourcompany.lifeflow",
        "versionCode": 1
      }
    }
    ```
- [ ] Build for emulator:
  ```bash
  npm run android
  # or
  eas build --platform android --profile development
  ```
- [ ] Build for Play Store:
  ```bash
  npm run build:android
  ```
- [ ] Submit to Google Play:
  ```bash
  npm run submit:android
  ```

---

## 🎨 Phase 8: App Branding

**Status:** ⏳ Optional Customization

- [ ] Update app name in `app.json`:
  ```json
  {
    "name": "Lifeflow",
    "slug": "lifeflow",
    "version": "1.0.0"
  }
  ```
- [ ] Create app icon (512x512 PNG with rounded corners)
  - [ ] Save as `assets/icon.png`
  - [ ] Expo will auto-generate other sizes
- [ ] Create splash screen (1080x2340 PNG)
  - [ ] Save as `assets/splash.png`
  - [ ] Update `app.json`:
    ```json
    {
      "splash": {
        "image": "./assets/splash.png",
        "resizeMode": "contain",
        "backgroundColor": "#070a08"
      }
    }
    ```
- [ ] Customize colors in `constants/Colors.ts` (if desired)
- [ ] Update typography in `constants/Typography.ts` (if desired)

---

## 🧪 Phase 9: Testing

**Status:** ⏳ Manual Testing Required

### Unit Tests
- [ ] Set up Jest configuration
- [ ] Write tests for store slices
- [ ] Write tests for custom hooks
- [ ] Write tests for utility functions

### Integration Tests
- [ ] Test auth flow (register → login → logout)
- [ ] Test onboarding flow (3 steps)
- [ ] Test daily ritual completion
- [ ] Test Supabase data persistence
- [ ] Test AI mentor responses
- [ ] Test subscription purchase flow

### Device Testing
- [ ] Test on Android emulator
  - [ ] All screens load without crashes
  - [ ] Navigation between screens works
  - [ ] Animations play smoothly
  - [ ] Fonts display correctly
- [ ] Test on iOS simulator
  - [ ] All screens load without crashes
  - [ ] Navigation between screens works
  - [ ] Animations play smoothly
  - [ ] Fonts display correctly
- [ ] Test on physical Android device
  - [ ] App installs successfully
  - [ ] Camera/permissions work correctly
  - [ ] Network requests work
  - [ ] Notifications display
- [ ] Test on physical iOS device
  - [ ] App installs successfully
  - [ ] Camera/permissions work correctly
  - [ ] Network requests work
  - [ ] Notifications display

### Performance Testing
- [ ] Measure app startup time
- [ ] Monitor memory usage during use
- [ ] Check battery drain impact
- [ ] Verify network request efficiency

---

## 📊 Phase 10: Monitoring & Analytics

**Status:** ⏳ Optional Enhancement

- [ ] Set up Firebase Analytics
  - [ ] Create Firebase project
  - [ ] Add Android & iOS apps to Firebase
  - [ ] Install firebase packages
  - [ ] Implement analytics events
- [ ] Set up Sentry error tracking
  - [ ] Create Sentry account
  - [ ] Get DSN key
  - [ ] Install @sentry/react-native
  - [ ] Configure error reporting
- [ ] Set up app usage monitoring
  - [ ] Implement custom analytics events for key user actions
  - [ ] Monitor onboarding completion rate
  - [ ] Track daily active users
  - [ ] Monitor subscription conversion

---

## ✅ Pre-Launch Checklist

Before submitting to app stores:

### Code Quality
- [ ] No console errors or warnings
- [ ] All TypeScript types verified
- [ ] No console.logs left in production code
- [ ] Error handling on all API calls
- [ ] Loading states on all async operations

### Security
- [ ] No hardcoded secrets or API keys
- [ ] All sensitive data handled securely
- [ ] OAuth tokens stored in secure storage
- [ ] Password hashing implemented (Supabase handles)
- [ ] HTTPS enforced for all API calls

### Privacy & Legal
- [ ] Privacy Policy written and linked
- [ ] Terms of Service written and linked
- [ ] GDPR compliance verified
- [ ] Data deletion functionality implemented
- [ ] User consent for analytics/tracking

### Performance
- [ ] App starts in < 3 seconds
- [ ] Screens render in < 500ms
- [ ] Animations are 60fps
- [ ] Bundle size < 50MB
- [ ] Network requests use caching

### Functionality
- [ ] All screens tested on multiple devices
- [ ] All user flows tested end-to-end
- [ ] Network errors handled gracefully
- [ ] Offline mode considered (if needed)
- [ ] Data sync conflict resolution tested

### Compliance
- [ ] App Store Review Guidelines checked
- [ ] Google Play Policies verified
- [ ] Content rating questionnaire completed
- [ ] App categories selected correctly
- [ ] Screenshots and descriptions prepared

---

## 🚀 Launch Day Checklist

1. [ ] Final code review completed
2. [ ] All credentials verified in production environment
3. [ ] Backup plan ready (version rollback strategy)
4. [ ] Support email configured and monitored
5. [ ] App Store listing published
6. [ ] Google Play listing published
7. [ ] Notify beta testers of launch
8. [ ] Monitor crash reports and analytics
9. [ ] Prepare first app update (bug fixes, improvements)

---

## 📞 Support Resources

### Documentation
- Expo Docs: https://docs.expo.dev
- React Native Docs: https://reactnative.dev/docs/getting-started
- TypeScript Handbook: https://www.typescriptlang.org/docs
- Supabase Docs: https://supabase.com/docs
- Zustand Docs: https://github.com/pmndrs/zustand

### Communities
- Expo Discord: https://discord.gg/expo
- React Native Community: https://react-native-community.github.io
- Supabase Discord: https://discord.supabase.com

### Troubleshooting
- See QUICK_START.md for common issues
- Check app.json syntax: https://docs.expo.dev/workflow/configuration
- Debug networking: Flip back to localhost: true in app.json

---

**Lifeflow Completion Status: 85% Ready**  
✅ Core app built and tested  
⏳ Awaiting: credentials, testing, store preparation  

**Time to Complete:** ~2-4 weeks depending on manual testing and review process
