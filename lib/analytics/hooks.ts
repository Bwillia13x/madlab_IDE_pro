/**
 * React hooks for analytics integration
 */

import { useEffect, useCallback, useRef } from 'react';
import { analytics, track, trackWidget, trackFeature } from './index';

/**
 * Hook to track page views and navigation
 */
export function usePageTracking(pageName: string, properties: Record<string, any> = {}) {
  const hasTracked = useRef(false);
  
  useEffect(() => {
    if (!hasTracked.current) {
      track('page_view', {
        page_name: pageName,
        ...properties,
      }, 'navigation');
      hasTracked.current = true;
    }
  }, [pageName, properties]);
}

/**
 * Hook to track widget lifecycle and interactions
 */
export function useWidgetTracking(widgetType: string, widgetId: string) {
  const startTime = useRef(Date.now());
  const hasTrackedMount = useRef(false);

  useEffect(() => {
    if (!hasTrackedMount.current) {
      trackWidget('mounted', widgetType, {
        widget_id: widgetId,
      });
      hasTrackedMount.current = true;
      try { localStorage.setItem('madlab_recent_widget', `${widgetType}:${widgetId}`); } catch {}
    }

    return () => {
      const sessionDuration = Date.now() - startTime.current;
      trackWidget('unmounted', widgetType, {
        widget_id: widgetId,
        session_duration: sessionDuration,
      });
    };
  }, [widgetType, widgetId]);

  // Track widget interactions
  const trackInteraction = useCallback((action: string, properties: Record<string, any> = {}) => {
    trackWidget(action, widgetType, {
      widget_id: widgetId,
      ...properties,
    });
  }, [widgetType, widgetId]);

  // Track widget configuration changes
  const trackConfigChange = useCallback((changes: Record<string, any>) => {
    trackWidget('config_changed', widgetType, {
      widget_id: widgetId,
      changes,
    });
  }, [widgetType, widgetId]);

  // Track widget errors
  const trackError = useCallback((error: Error | string, context: Record<string, any> = {}) => {
    trackWidget('error', widgetType, {
      widget_id: widgetId,
      error: error instanceof Error ? error.message : error,
      error_stack: error instanceof Error ? error.stack : undefined,
      ...context,
    });
  }, [widgetType, widgetId]);

  return {
    trackInteraction,
    trackConfigChange,
    trackError,
  };
}

/**
 * Hook to track feature discovery and usage
 */
export function useFeatureTracking(featureName: string) {
  const hasDiscovered = useRef(false);

  useEffect(() => {
    if (!hasDiscovered.current) {
      trackFeature(featureName, 'discovered');
      hasDiscovered.current = true;
    }
  }, [featureName]);

  const trackUsage = useCallback((properties: Record<string, any> = {}) => {
    trackFeature(featureName, 'used', properties);
  }, [featureName]);

  const trackCompletion = useCallback((properties: Record<string, any> = {}) => {
    trackFeature(featureName, 'completed', properties);
  }, [featureName]);

  return {
    trackUsage,
    trackCompletion,
  };
}

/**
 * Hook to track user interactions with performance measurement
 */
export function usePerformanceTracking() {
  const measureInteraction = useCallback((name: string, fn: () => void | Promise<void>) => {
    const startTime = performance.now();
    
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const endTime = performance.now();
        analytics.trackPerformance({
          name: `interaction_${name}`,
          value: endTime - startTime,
          unit: 'ms',
        });
      });
    } else {
      const endTime = performance.now();
      analytics.trackPerformance({
        name: `interaction_${name}`,
        value: endTime - startTime,
        unit: 'ms',
      });
      return result;
    }
  }, []);

  return { measureInteraction };
}

/**
 * Hook to track form interactions and completion
 */
export function useFormTracking(formName: string) {
  const startTime = useRef<number | null>(null);
  const fieldInteractions = useRef(new Set<string>());

  const trackFormStart = useCallback(() => {
    startTime.current = Date.now();
    track('form_started', { form_name: formName }, 'user_flow');
  }, [formName]);

  const trackFieldInteraction = useCallback((fieldName: string, action: 'focus' | 'blur' | 'change') => {
    fieldInteractions.current.add(fieldName);
    track('form_field_interaction', {
      form_name: formName,
      field_name: fieldName,
      action,
    }, 'user_flow');
  }, [formName]);

  const trackFormSubmission = useCallback((success: boolean, errors?: string[]) => {
    const duration = startTime.current ? Date.now() - startTime.current : 0;
    
    track('form_submitted', {
      form_name: formName,
      success,
      errors,
      completion_time: duration,
      fields_interacted: Array.from(fieldInteractions.current),
      fields_count: fieldInteractions.current.size,
    }, 'user_flow');
  }, [formName]);

  const trackFormAbandonment = useCallback((lastField?: string) => {
    const duration = startTime.current ? Date.now() - startTime.current : 0;
    
    track('form_abandoned', {
      form_name: formName,
      last_field: lastField,
      time_spent: duration,
      fields_interacted: Array.from(fieldInteractions.current),
      completion_percentage: (fieldInteractions.current.size / 5) * 100, // Assume 5 fields average
    }, 'user_flow');
  }, [formName]);

  return {
    trackFormStart,
    trackFieldInteraction,
    trackFormSubmission,
    trackFormAbandonment,
  };
}

/**
 * Hook to track search and filtering behavior
 */
export function useSearchTracking(searchContext: string) {
  const trackSearch = useCallback((query: string, results: number) => {
    track('search_performed', {
      context: searchContext,
      query: query.toLowerCase(),
      query_length: query.length,
      results_count: results,
    }, 'feature_usage');
  }, [searchContext]);

  const trackFilterApplied = useCallback((filterType: string, filterValue: any, resultCount: number) => {
    track('filter_applied', {
      context: searchContext,
      filter_type: filterType,
      filter_value: String(filterValue),
      results_count: resultCount,
    }, 'feature_usage');
  }, [searchContext]);

  const trackSearchResultClick = useCallback((resultIndex: number, resultId: string) => {
    track('search_result_clicked', {
      context: searchContext,
      result_index: resultIndex,
      result_id: resultId,
    }, 'feature_usage');
  }, [searchContext]);

  return {
    trackSearch,
    trackFilterApplied,
    trackSearchResultClick,
  };
}

/**
 * Hook to track data operations (loading, caching, errors)
 */
export function useDataTracking() {
  const trackDataLoad = useCallback((
    source: string,
    query: any,
    result: {
      success: boolean;
      loadTime: number;
      fromCache: boolean;
      dataSize?: number;
      error?: string;
    }
  ) => {
    analytics.trackDataRequest(source, query, result);
  }, []);

  const trackCacheHit = useCallback((source: string, cacheAge: number) => {
    track('cache_hit', {
      data_source: source,
      cache_age: cacheAge,
    }, 'performance');
  }, []);

  const trackDataError = useCallback((source: string, error: Error | string, context: Record<string, any> = {}) => {
    track('data_error', {
      data_source: source,
      error: error instanceof Error ? error.message : error,
      error_stack: error instanceof Error ? error.stack : undefined,
      ...context,
    }, 'error');
  }, []);

  return {
    trackDataLoad,
    trackCacheHit,
    trackDataError,
  };
}

/**
 * Hook to track keyboard shortcuts usage
 */
export function useKeyboardTracking() {
  const trackShortcut = useCallback((shortcut: string, action: string, context: string) => {
    track('keyboard_shortcut_used', {
      shortcut,
      action,
      context,
    }, 'feature_usage');
  }, []);

  return { trackShortcut };
}

/**
 * Hook to automatically track component performance
 */
export function useComponentPerformance(componentName: string) {
  const renderStart = useRef(performance.now());
  const mountTime = useRef<number>();

  useEffect(() => {
    mountTime.current = performance.now();
    const mountDuration = mountTime.current - renderStart.current;
    
    analytics.trackPerformance({
      name: `component_mount_${componentName}`,
      value: mountDuration,
    });

    return () => {
      if (mountTime.current) {
        const sessionDuration = performance.now() - mountTime.current;
        analytics.trackPerformance({
          name: `component_session_${componentName}`,
          value: sessionDuration,
        });
      }
    };
  }, [componentName]);

  // Track render performance
  useEffect(() => {
    const renderEnd = performance.now();
    const renderDuration = renderEnd - renderStart.current;
    
    if (renderDuration > 16) { // More than one frame
      analytics.trackPerformance({
        name: `component_render_${componentName}`,
        value: renderDuration,
        context: { slow_render: true },
      });
    }
    
    renderStart.current = renderEnd;
  });
}

export default {
  usePageTracking,
  useWidgetTracking,
  useFeatureTracking,
  usePerformanceTracking,
  useFormTracking,
  useSearchTracking,
  useDataTracking,
  useKeyboardTracking,
  useComponentPerformance,
};