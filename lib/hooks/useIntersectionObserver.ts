import { useEffect, useState, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  // Performance options
  updateDelay?: number;
  disable?: boolean;
}

interface IntersectionObserverResult {
  isIntersecting: boolean;
  intersectionRatio: number;
  entry: IntersectionObserverEntry | null;
}

export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
): IntersectionObserverResult {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    updateDelay = 0,
    disable = false
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [intersectionRatio, setIntersectionRatio] = useState(0);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disable || typeof IntersectionObserver === 'undefined') {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        
        const updateState = () => {
          setIsIntersecting(entry.isIntersecting);
          setIntersectionRatio(entry.intersectionRatio);
          setEntry(entry);
        };

        if (updateDelay > 0) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(updateState, updateDelay);
        } else {
          updateState();
        }
      },
      {
        threshold,
        root,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [elementRef, threshold, root, rootMargin, updateDelay, disable]);

  return { isIntersecting, intersectionRatio, entry };
}

// Hook for detecting when multiple elements are in view
export function useMultipleIntersectionObserver(
  elementRefs: RefObject<Element>[],
  options: UseIntersectionObserverOptions = {}
): Map<Element, IntersectionObserverResult> {
  const [results, setResults] = useState<Map<Element, IntersectionObserverResult>>(new Map());

  useEffect(() => {
    const elements = elementRefs.map(ref => ref.current).filter(Boolean) as Element[];
    
    if (elements.length === 0 || options.disable || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setResults(prev => {
          const newResults = new Map(prev);
          
          entries.forEach(entry => {
            newResults.set(entry.target, {
              isIntersecting: entry.isIntersecting,
              intersectionRatio: entry.intersectionRatio,
              entry
            });
          });
          
          return newResults;
        });
      },
      {
        threshold: options.threshold,
        root: options.root,
        rootMargin: options.rootMargin
      }
    );

    elements.forEach(element => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [elementRefs, options.threshold, options.root, options.rootMargin, options.disable]);

  return results;
}

// Specialized hook for widget visibility tracking
export function useWidgetVisibility(
  elementRef: RefObject<Element>,
  widgetId: string,
  onVisibilityChange?: (isVisible: boolean, ratio: number) => void
) {
  const result = useIntersectionObserver(elementRef, {
    threshold: [0, 0.1, 0.5, 1],
    rootMargin: '20px',
    updateDelay: 100 // Debounce updates for performance
  });

  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(result.isIntersecting, result.intersectionRatio);
    }
  }, [result.isIntersecting, result.intersectionRatio, onVisibilityChange]);

  return {
    ...result,
    widgetId,
    isVisible: result.isIntersecting,
    visibilityRatio: result.intersectionRatio
  };
}