import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

// Categories supported for selective data updates
export const REFRESH_CATEGORIES = {
  ALL: 'ALL',
  FOLDERS: 'FOLDERS',
  FILES: 'FILES',
  USERS: 'USERS',
  MOUS: 'MOUS',
  DEPARTMENTS: 'DEPARTMENTS',
  TEMPLATES: 'TEMPLATES',
  NOTIFICATIONS: 'NOTIFICATIONS',
  ACTIVITY_LOGS: 'ACTIVITY_LOGS',
  SETTINGS: 'SETTINGS',
  PROFILE: 'PROFILE',
};

const AutoRefreshContext = createContext(null);

// Global subscriber registry for non-React contexts (e.g. Axios interceptors)
const globalListeners = new Map();

/**
 * Triggers a global auto-refresh event for a specific category or ALL.
 * Callable from anywhere (components, axios interceptors, background events).
 */
export const triggerGlobalAutoRefresh = (category = REFRESH_CATEGORIES.ALL) => {
  const callbacksToCall = new Set();

  globalListeners.forEach((listenerObj) => {
    if (
      listenerObj.category === REFRESH_CATEGORIES.ALL ||
      category === REFRESH_CATEGORIES.ALL ||
      listenerObj.category === category
    ) {
      callbacksToCall.add(listenerObj.callback);
    }
  });

  // Debounced execution to merge rapid simultaneous API calls
  callbacksToCall.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.debug('AutoRefresh callback execution error:', err);
    }
  });
};

export const AutoRefreshProvider = ({ children }) => {
  const debounceTimers = useRef(new Map());

  const publish = useCallback((category = REFRESH_CATEGORIES.ALL) => {
    if (debounceTimers.current.has(category)) {
      clearTimeout(debounceTimers.current.get(category));
    }

    const timer = setTimeout(() => {
      triggerGlobalAutoRefresh(category);
      debounceTimers.current.delete(category);
    }, 400); // 400ms debounce buffer

    debounceTimers.current.set(category, timer);
  }, []);

  const subscribe = useCallback((category, callback) => {
    const id = Math.random().toString(36).substring(2, 9);
    globalListeners.set(id, { category, callback });

    return () => {
      globalListeners.delete(id);
    };
  }, []);

  return (
    <AutoRefreshContext.Provider value={{ publish, subscribe, triggerRefresh: publish }}>
      {children}
    </AutoRefreshContext.Provider>
  );
};

export const useAutoRefreshContext = () => {
  const context = useContext(AutoRefreshContext);
  if (!context) {
    throw new Error('useAutoRefreshContext must be used within an AutoRefreshProvider');
  }
  return context;
};

/**
 * Custom React Hook to subscribe a page/component to auto-refresh events.
 * Handles category filtering, debouncing, visibilitychange, and background polling.
 * 
 * @param {string|string[]} category - REFRESH_CATEGORIES string or array of categories
 * @param {function} refetchFn - Async or Sync refetch callback function
 * @param {object} options - Configuration options (pollInterval, enabled, etc.)
 */
export const useAutoRefresh = (category, refetchFn, options = {}) => {
  const { pollInterval = 30000, enabled = true } = options;
  const refetchRef = useRef(refetchFn);
  const isExecutingRef = useRef(false);

  useEffect(() => {
    refetchRef.current = refetchFn;
  }, [refetchFn]);

  // Safe executor with exponential backoff retry on network failures
  const executeRefetch = useCallback(async (retryCount = 0) => {
    if (!enabled || isExecutingRef.current) return;
    isExecutingRef.current = true;

    try {
      await Promise.resolve(refetchRef.current());
    } catch (err) {
      console.debug('AutoRefresh fetch failed, retrying silently...', err);
      if (retryCount < 2) {
        setTimeout(() => {
          isExecutingRef.current = false;
          executeRefetch(retryCount + 1);
        }, Math.pow(2, retryCount) * 1000);
        return;
      }
    } finally {
      isExecutingRef.current = false;
    }
  }, [enabled]);

  // Event bus subscription
  useEffect(() => {
    if (!enabled) return;

    const categories = Array.isArray(category) ? category : [category];
    const unsubscribes = categories.map((cat) => {
      const id = Math.random().toString(36).substring(2, 9);
      globalListeners.set(id, {
        category: cat,
        callback: () => executeRefetch(),
      });
      return () => globalListeners.delete(id);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [category, enabled, executeRefetch]);

  // Tab visibility change & window focus listener
  useEffect(() => {
    if (!enabled) return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        executeRefetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [enabled, executeRefetch]);

  // Passive background polling (default 30s)
  useEffect(() => {
    if (!enabled || !pollInterval || pollInterval <= 0) return;

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        executeRefetch();
      }
    }, pollInterval);

    return () => clearInterval(timer);
  }, [enabled, pollInterval, executeRefetch]);
};

export default AutoRefreshContext;
