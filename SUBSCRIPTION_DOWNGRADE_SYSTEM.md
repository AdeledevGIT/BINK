# Automatic Subscription Downgrade System

This document explains the automatic subscription tier downgrade system implemented in BINK that automatically reverts users from premium/creator tiers to free tier when their subscription expires.

## Overview

The system consists of multiple layers of checking and enforcement to ensure users are automatically downgraded when their premium subscription expires:

1. **Client-side Premium Enforcement** - Real-time checking in the browser
2. **Authentication-based Checking** - Checks on user login/authentication
3. **Page-specific Checking** - Checks when users visit specific pages
4. **Scheduled Server-side Checking** - Background processing via API endpoint
5. **Admin Panel Integration** - Manual triggering and monitoring

## Components

### 1. Premium Enforcement Script (`premium-enforcement.js`)

**Main Functions:**
- `checkPremiumStatus(userData, userId)` - Checks if user has valid premium status
- `autoDowngradeExpiredSubscription(userId, userData)` - Automatically downgrades expired subscriptions
- `startPeriodicSubscriptionCheck(userId)` - Starts periodic checking for a user
- `checkAllExpiredSubscriptions()` - Bulk check for all expired subscriptions

**Features:**
- Automatic template reversion for premium templates user hasn't purchased
- User notification system
- Integration with existing template system
- Fallback to legacy checking methods

### 2. Authentication Integration (`auth.js`)

**Features:**
- Automatic subscription checking on user authentication
- Starts periodic subscription monitoring for authenticated users
- Immediate downgrade on login if subscription has expired

### 3. Dashboard Integration (`dashboard.js`)

**Features:**
- Subscription status checking on dashboard load
- UI updates to reflect subscription changes
- Integration with sidebar user profile updates

### 4. Bio Editor Integration (`bio-editor.js`)

**Features:**
- Enhanced revert functionality using new premium enforcement system
- Template access enforcement
- Fallback to legacy implementation if new system unavailable

### 5. Server-side API Endpoint (`api/check-expired-subscriptions.js`)

**Features:**
- Bulk processing of expired subscriptions
- Firebase Admin SDK integration
- Batch updates for efficiency
- Comprehensive logging
- Template reversion for known premium templates

**Endpoint:** `GET /api/check-expired-subscriptions`

### 6. Admin Panel Integration

**Features:**
- Manual bulk subscription checking
- Integration with existing admin functionality
- Enhanced user loading with automatic expiration checking

## How It Works

### Client-side Flow

1. **User Authentication:**
   - When user logs in, `auth.js` triggers subscription check
   - Starts periodic monitoring (every 5 minutes)
   - Immediate downgrade if subscription expired

2. **Page Navigation:**
   - Dashboard checks subscription on load
   - Bio editor enforces template access
   - Premium enforcement runs continuously

3. **Real-time Monitoring:**
   - Periodic checks every 5 minutes for authenticated users
   - Immediate UI updates when expiration detected
   - User notifications about subscription changes

### Server-side Flow

1. **Scheduled Checking:**
   - External cron service calls `/api/check-expired-subscriptions`
   - Processes all premium/creator users
   - Batch updates expired subscriptions

2. **Template Handling:**
   - Checks if user is using premium template they haven't purchased
   - Reverts to classic template if necessary
   - Preserves templates user has previously unlocked

3. **Data Updates:**
   - Updates `subscriptionTier` to 'free'
   - Sets `subscriptionExpired` flag
   - Preserves subscription history
   - Updates timestamps

## Configuration

### Premium Enforcement Configuration

```javascript
const PREMIUM_ENFORCEMENT = {
    enabled: true,
    checkInterval: 60000, // Check every minute
    maxRetries: 3,
    retryDelay: 5000,
    autoDowngradeEnabled: true
};
```

### Periodic Checking

- **Client-side:** Every 5 minutes for authenticated users
- **Server-side:** Recommended every 6 hours or daily via cron

## Setup Instructions

### 1. Client-side Setup

The client-side components are automatically initialized when:
- User authenticates (via `auth.js`)
- User visits dashboard (via `dashboard.js`)
- User visits bio editor (via `bio-editor.js`)

### 2. Server-side Setup

1. **Deploy the API endpoint:**
   - The endpoint is automatically deployed with Vercel
   - Accessible at `/api/check-expired-subscriptions`

2. **Set up scheduled calling:**
   - Use external cron service (cron-job.org, EasyCron, etc.)
   - Call the endpoint every 6 hours or daily
   - Optional: Set `CRON_SECRET` environment variable for security

3. **Environment Variables:**
   - `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON
   - `CRON_SECRET` - Optional secret key for API authentication

### 3. Manual Administration

1. **Admin Panel:**
   - Visit admin panel to manually trigger bulk checks
   - Monitor subscription status in real-time
   - View expired subscriptions

2. **Dedicated Admin Page:**
   - Visit `admin-subscription-check.html` for dedicated subscription management
   - Manual triggering with detailed results
   - Setup instructions for external cron services

## Security Considerations

1. **API Endpoint Security:**
   - Optional authentication via `CRON_SECRET`
   - CORS headers configured
   - Input validation and error handling

2. **Client-side Validation:**
   - Multiple layers of checking prevent bypassing
   - Server-side validation as final authority
   - Graceful fallbacks if systems unavailable

## Monitoring and Logging

### Client-side Logging
- Console logs for debugging
- User notifications for subscription changes
- Error handling with fallbacks

### Server-side Logging
- Detailed processing logs
- Error tracking and reporting
- Batch operation summaries

## Troubleshooting

### Common Issues

1. **Premium Enforcement Not Working:**
   - Check if `premium-enforcement.js` is loaded
   - Verify Firebase configuration
   - Check browser console for errors

2. **Server-side Endpoint Errors:**
   - Verify Firebase service account configuration
   - Check environment variables
   - Review server logs

3. **Template Not Reverting:**
   - Check if template is in known premium templates list
   - Verify user's `usedTemplates` array
   - Check template access logic

### Debug Steps

1. **Client-side:**
   ```javascript
   // Check if premium enforcement is available
   console.log(window.PremiumEnforcement);
   
   // Manually trigger subscription check
   window.PremiumEnforcement.checkPremiumStatus(userData, userId);
   ```

2. **Server-side:**
   ```bash
   # Test the API endpoint
   curl https://your-domain.com/api/check-expired-subscriptions
   ```

## Future Enhancements

1. **Real-time Notifications:**
   - WebSocket integration for instant updates
   - Push notifications for subscription expiry

2. **Advanced Scheduling:**
   - Built-in Vercel cron integration
   - Configurable check intervals

3. **Enhanced Analytics:**
   - Subscription expiry analytics
   - User retention tracking

4. **Grace Period:**
   - Configurable grace period before downgrade
   - Warning notifications before expiry
