# Google Tag Manager Integration Guide

## Overview

Google Tag Manager (GTM) is a free tag management system that allows you to quickly and easily update measurement codes and related code fragments collectively. This document explains how GTM is integrated into the NTHUMods web application and how to use it.

## What is Google Tag Manager?

GTM is a tag management system that:

- Manages analytics, marketing, and measurement tags without requiring code changes
- Provides a centralized interface for managing tracking across your website
- Allows non-technical users to implement and modify tags
- Improves website performance by consolidating multiple tracking scripts

## Current Setup

The NTHUMods application is configured with GTM ID: **GTM-NZKGV8R3**

### Files Involved

1. **`src/lib/gtm.ts`** - Core GTM utilities and initialization
2. **`src/hooks/useGTMPageTracking.ts`** - React hook for automatic page view tracking
3. **`src/components/RootLayout.tsx`** - Root layout component with page tracking
4. **`src/main.tsx`** - Application entry point where GTM is initialized
5. **`index.html`** - HTML head with GTM script and noscript fallback
6. **`.env.example`** - Environment variable template

## How It Works

### 1. Initialization

GTM is initialized in `src/main.tsx` as soon as the application starts:

```typescript
import { initializeGTM } from "@/lib/gtm";

// Initialize Google Tag Manager
initializeGTM();
```

The `initializeGTM()` function:

- Loads the GTM script from Google's servers
- Creates the `dataLayer` object for event tracking
- Prevents re-initialization on subsequent loads
- Works in both production and development environments

### 2. Page View Tracking

Page views are automatically tracked when users navigate between routes. This is handled by the `useGTMPageTracking()` hook in your root layout:

```typescript
import { useGTMPageTracking } from '@/hooks/useGTMPageTracking';

export function RootLayout() {
  useGTMPageTracking(); // Automatically tracks page views
  return <Outlet />;
}
```

The hook listens for route changes and pushes `pageview` events to the GTM data layer with:

- `page.title` - The page's document title
- `page.path` - The current URL path

### 3. HTML Integration

The `index.html` file includes both:

- **GTM Script**: Loads and initializes GTM in the `<head>`
- **GTM Noscript**: Fallback iframe for users with JavaScript disabled

## Configuration

### Environment Variables

Set the GTM ID in your environment variables. Create a `.env.local` file:

```env
VITE_GTM_ID=GTM-NZKGV8R3
```

If not set, the default GTM ID in `src/lib/gtm.ts` is used.

## Usage Examples

### Tracking Custom Events

Track specific user actions beyond automatic page views:

```typescript
import { trackEvent } from "@/lib/gtm";

// Simple event tracking
function handleButtonClick() {
  trackEvent("button_click", {
    button_name: "Subscribe",
    button_location: "header",
  });
}

// Track course enrollment
function enrollCourse(courseId, courseName) {
  trackEvent("course_enrolled", {
    course_id: courseId,
    course_name: courseName,
    timestamp: new Date().toISOString(),
  });
}

// Track search
function handleSearch(query) {
  trackEvent("search", {
    search_query: query,
    results_count: results.length,
  });
}
```

### Tracking Page Views Manually

For cases where automatic tracking doesn't apply:

```typescript
import { trackPageView } from "@/lib/gtm";

function handleModalOpen() {
  trackPageView("Course Details Modal", "/modal/course-details");
}
```

### Pushing Raw Data to DataLayer

For advanced scenarios, push data directly to GTM's data layer:

```typescript
import { pushGTMEvent } from "@/lib/gtm";

pushGTMEvent("custom_event", {
  custom_property: "value",
  timestamp: Date.now(),
});
```

## Common Events to Track

Here are recommended events to track for better analytics:

### User Engagement

- `course_search` - When users search for courses
- `course_view` - When users view course details
- `course_enrolled` - When users add course to timetable
- `timetable_saved` - When users save their timetable
- `filter_applied` - When users apply filters

### Navigation

- `navigation_click` - Main navigation clicks
- `sidebar_toggle` - Sidebar open/close
- `language_change` - Language preference change

### Features

- `ai_chat_message` - AI chat interactions
- `planner_interaction` - Degree planner interactions
- `bus_schedule_view` - Bus schedule lookups
- `venue_search` - Venue/building searches

### Conversions

- `account_created` - New user registration
- `login_success` - Successful login
- `settings_updated` - User settings changes

## Testing

### 1. Check GTM Initialization

Open your browser's developer console and check if GTM loaded:

```javascript
// In browser console
window.dataLayer; // Should show array with events
window.gtmInitialized; // Should be true
```

### 2. Use Google Tag Manager Preview Mode

1. Go to [Google Tag Manager](https://tagmanager.google.com)
2. Select your container (GTM-NZKGV8R3)
3. Click "Preview" button
4. Enter your website URL
5. A preview panel will show events being fired in real-time

### 3. Monitor Events in Console

Add this to your browser console to log all GTM events:

```javascript
const originalPush = window.dataLayer.push;
window.dataLayer.push = function (...args) {
  console.log("GTM Event:", args[0]);
  return originalPush.apply(window.dataLayer, args);
};
```

## Best Practices

### 1. Use Consistent Event Names

- Use snake_case for event names: `course_enrolled`, `user_login`
- Keep names descriptive but concise

### 2. Include Relevant Context

- Always include identifying information (IDs, categories)
- Add timestamps when timing matters
- Include user segments or categories when useful

### 3. Avoid Sensitive Data

- ❌ Don't track passwords, tokens, or API keys
- ❌ Don't track full email addresses
- ✅ Track user_id or anonymous identifiers
- ✅ Track user roles or segments

### 4. Performance Considerations

- GTM is loaded asynchronously to avoid blocking page load
- Use event debouncing for high-frequency events
- Batch related events when possible

### 5. Testing Before Production

- Always test event tracking in development first
- Use GTM Preview mode to verify events
- Check Google Analytics to ensure data is flowing correctly

## Integrating with Google Analytics 4 (GA4)

GTM automatically sends page view events to GA4 if you have GA4 configured in GTM:

1. In GTM, create a tag that listens to the `pageview` event
2. Configure the tag to send data to your GA4 property
3. Test using GTM Preview mode

Events pushed via `trackEvent()` will also be captured if you configure GA4 tags in GTM.

## Advanced: Custom Tag Configuration

### Setting User Properties

```typescript
import { pushGTMEvent } from "@/lib/gtm";

function updateUserProperties(userId, userLevel) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    user_id: userId,
    user_level: userLevel,
    // These are accessible to all tags
  });
}
```

### E-commerce Tracking (if applicable)

```typescript
import { pushGTMEvent } from "@/lib/gtm";

function trackCourseRegistration(course) {
  pushGTMEvent("view_item", {
    items: [
      {
        item_id: course.id,
        item_name: course.name,
        item_category: course.department,
        price: 0, // Free courses
      },
    ],
  });
}
```

## Troubleshooting

### GTM Not Loading

- Check browser console for errors
- Verify GTM ID is correct
- Ensure JavaScript is enabled
- Check network tab for GTM script requests

### Events Not Appearing in GA4

- Verify GA4 tags are configured in GTM container
- Check that GTM container is published (not in draft)
- Wait up to 24 hours for real-time reporting to update
- Use GTM Preview mode to verify events are firing

### Data Not Showing in Reports

- Confirm GA4 property is properly configured
- Check GA4 event name matches your tracked events
- Verify user consent/cookie settings if using consent mode
- Allow 24 hours for initial data processing

## Resources

- [Google Tag Manager Documentation](https://support.google.com/tagmanager)
- [GTM Best Practices](https://support.google.com/tagmanager/answer/6102821)
- [DataLayer Guide](https://support.google.com/tagmanager/answer/6164391)
- [GA4 + GTM Integration](https://support.google.com/analytics/answer/9744881)

## Support

For issues or questions about GTM integration:

1. Check this documentation first
2. Review your GTM container configuration
3. Consult the team's development channel
4. Refer to official Google Tag Manager support

---

**Last Updated**: 2024
**GTM Container**: GTM-NZKGV8R3
**Application**: NTHUMods
