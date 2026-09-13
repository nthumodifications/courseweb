/**
 * GTM Tracking Events - Helper functions for common tracking scenarios
 * These functions provide a consistent interface for tracking user actions across the app
 */

import { trackEvent } from "./gtm";

/**
 * Course Search Events
 */
export const courseEvents = {
  /**
   * Track when a user searches for courses
   */
  search: (
    query: string,
    resultsCount: number,
    filters?: Record<string, string>,
  ) => {
    trackEvent("course_search", {
      search_query: query,
      results_count: resultsCount,
      filters: filters || {},
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track when a user views course details
   */
  viewDetail: (courseId: string, courseName: string, department?: string) => {
    trackEvent("course_view_detail", {
      course_id: courseId,
      course_name: courseName,
      department: department || "unknown",
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track when a user adds/removes course from timetable
   */
  addToTimetable: (
    courseId: string,
    courseName: string,
    action: "add" | "remove",
  ) => {
    trackEvent(`course_${action}_timetable`, {
      course_id: courseId,
      course_name: courseName,
      action: action,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track when a user filters courses
   */
  applyFilter: (filterType: string, filterValue: string) => {
    trackEvent("course_filter_applied", {
      filter_type: filterType,
      filter_value: filterValue,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track when a user rates/reviews a course
   */
  rateOrReview: (courseId: string, rating?: number, hasReview?: boolean) => {
    trackEvent("course_rated_reviewed", {
      course_id: courseId,
      rating: rating || 0,
      has_review: hasReview || false,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Timetable Events
 */
export const timetableEvents = {
  /**
   * Track when a user saves their timetable
   */
  save: (semesterId: string, courseCount: number) => {
    trackEvent("timetable_saved", {
      semester_id: semesterId,
      course_count: courseCount,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track when a user switches semesters
   */
  switchSemester: (fromSemesterId: string, toSemesterId: string) => {
    trackEvent("timetable_semester_switched", {
      from_semester: fromSemesterId,
      to_semester: toSemesterId,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track when a user changes timetable view
   */
  changeView: (viewType: "vertical" | "horizontal" | "list") => {
    trackEvent("timetable_view_changed", {
      view_type: viewType,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track when a user exports timetable
   */
  export: (format: string, courseCount: number) => {
    trackEvent("timetable_exported", {
      export_format: format,
      course_count: courseCount,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track when planner is viewed
   */
  viewPlanner: () => {
    trackEvent("timetable_planner_viewed", {
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Navigation Events
 */
export const navigationEvents = {
  /**
   * Track main feature navigation
   */
  navigate: (featureName: string, fromPage?: string) => {
    trackEvent("navigation_click", {
      feature_name: featureName,
      from_page: fromPage || "unknown",
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track sidebar toggle
   */
  sidebarToggle: (isOpen: boolean) => {
    trackEvent("navigation_sidebar_toggle", {
      is_open: isOpen,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track language change
   */
  languageChange: (fromLanguage: string, toLanguage: string) => {
    trackEvent("navigation_language_changed", {
      from_language: fromLanguage,
      to_language: toLanguage,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Feature-Specific Events
 */
export const featureEvents = {
  /**
   * AI Chat interactions
   */
  aiChat: {
    sendMessage: (messageLength: number) => {
      trackEvent("feature_ai_chat_message_sent", {
        message_length: messageLength,
        timestamp: new Date().toISOString(),
      });
    },
    startSession: () => {
      trackEvent("feature_ai_chat_session_started", {
        timestamp: new Date().toISOString(),
      });
    },
  },

  /**
   * Bus schedule lookups
   */
  bus: {
    viewSchedule: (routeName: string) => {
      trackEvent("feature_bus_schedule_viewed", {
        route_name: routeName,
        timestamp: new Date().toISOString(),
      });
    },
    search: (query: string, resultsCount: number) => {
      trackEvent("feature_bus_search", {
        search_query: query,
        results_count: resultsCount,
        timestamp: new Date().toISOString(),
      });
    },
  },

  /**
   * Venue/Building searches
   */
  venue: {
    search: (query: string, resultsCount: number) => {
      trackEvent("feature_venue_search", {
        search_query: query,
        results_count: resultsCount,
        timestamp: new Date().toISOString(),
      });
    },
    viewDetails: (venueName: string, venueType: string) => {
      trackEvent("feature_venue_view_details", {
        venue_name: venueName,
        venue_type: venueType,
        timestamp: new Date().toISOString(),
      });
    },
  },

  /**
   * Degree Planner interactions
   */
  planner: {
    viewPlanner: () => {
      trackEvent("feature_planner_viewed", {
        timestamp: new Date().toISOString(),
      });
    },
    updateProgress: (programId: string, completionPercentage: number) => {
      trackEvent("feature_planner_updated", {
        program_id: programId,
        completion_percentage: completionPercentage,
        timestamp: new Date().toISOString(),
      });
    },
  },

  /**
   * Calendar events
   */
  calendar: {
    viewCalendar: (semesterId: string) => {
      trackEvent("feature_calendar_viewed", {
        semester_id: semesterId,
        timestamp: new Date().toISOString(),
      });
    },
  },

  /**
   * Sports venues
   */
  sportsVenue: {
    search: (facilityType: string, resultsCount: number) => {
      trackEvent("feature_sports_venue_search", {
        facility_type: facilityType,
        results_count: resultsCount,
        timestamp: new Date().toISOString(),
      });
    },
  },

  /**
   * Shops/Dining
   */
  shops: {
    browse: (category?: string) => {
      trackEvent("feature_shops_browsed", {
        category: category || "all",
        timestamp: new Date().toISOString(),
      });
    },
  },
};

/**
 * User Authentication Events
 */
export const authEvents = {
  /**
   * Track successful login
   */
  loginSuccess: (authMethod: string, userId?: string) => {
    trackEvent("auth_login_success", {
      auth_method: authMethod,
      user_id: userId || "anonymous",
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track login failure
   */
  loginFailure: (authMethod: string, reason?: string) => {
    trackEvent("auth_login_failure", {
      auth_method: authMethod,
      reason: reason || "unknown",
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track logout
   */
  logout: () => {
    trackEvent("auth_logout", {
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track account creation
   */
  accountCreated: (authMethod: string) => {
    trackEvent("auth_account_created", {
      auth_method: authMethod,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Settings/Preferences Events
 */
export const settingsEvents = {
  /**
   * Track when user changes settings
   */
  update: (settingName: string, newValue: string | boolean | number) => {
    trackEvent("settings_updated", {
      setting_name: settingName,
      new_value: newValue,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track theme preference change
   */
  themeChanged: (theme: "light" | "dark" | "system") => {
    trackEvent("settings_theme_changed", {
      theme: theme,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track notification preference change
   */
  notificationsToggled: (enabled: boolean) => {
    trackEvent("settings_notifications_toggled", {
      enabled: enabled,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Error and Performance Events
 */
export const errorEvents = {
  /**
   * Track client-side errors
   */
  clientError: (errorType: string, errorMessage: string, pagePath?: string) => {
    trackEvent("error_client_error", {
      error_type: errorType,
      error_message: errorMessage,
      page_path: pagePath || "unknown",
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track network errors
   */
  networkError: (endpoint: string, statusCode?: number) => {
    trackEvent("error_network_error", {
      endpoint: endpoint,
      status_code: statusCode || 0,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track page performance issues
   */
  performanceIssue: (metricName: string, metricValue: number) => {
    trackEvent("error_performance_issue", {
      metric_name: metricName,
      metric_value: metricValue,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * User Engagement Events
 */
export const engagementEvents = {
  /**
   * Track button clicks
   */
  buttonClick: (buttonName: string, location: string) => {
    trackEvent("engagement_button_click", {
      button_name: buttonName,
      button_location: location,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track form submissions
   */
  formSubmit: (formName: string, fieldCount: number) => {
    trackEvent("engagement_form_submit", {
      form_name: formName,
      field_count: fieldCount,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track time spent on feature
   */
  timeSpent: (featureName: string, secondsSpent: number) => {
    trackEvent("engagement_time_spent", {
      feature_name: featureName,
      seconds_spent: secondsSpent,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track print/export actions
   */
  print: (contentType: string) => {
    trackEvent("engagement_print", {
      content_type: contentType,
      timestamp: new Date().toISOString(),
    });
  },
};
