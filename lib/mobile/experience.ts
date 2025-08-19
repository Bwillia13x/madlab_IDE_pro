interface TouchGesture {
  type: 'tap' | 'doubleTap' | 'longPress' | 'swipe' | 'pinch' | 'rotate';
  coordinates: { x: number; y: number };
  delta?: { x: number; y: number; scale?: number; rotation?: number };
  duration: number;
  timestamp: number;
}

interface MobileMetrics {
  screenSize: { width: number; height: number };
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
  touchSupport: boolean;
  performance: {
    fps: number;
    memoryUsage: number;
    loadTime: number;
  };
  userBehavior: {
    sessionDuration: number;
    interactionsPerSession: number;
    commonActions: string[];
    errorRate: number;
  };
}

interface TouchOptimization {
  targetSize: number;
  spacing: number;
  feedback: 'visual' | 'haptic' | 'audio' | 'combined';
  gestureRecognition: boolean;
  accessibility: boolean;
}

export class MobileExperienceEnhancer {
  private touchGestures: TouchGesture[] = [];
  private metrics: MobileMetrics;
  private optimizations: TouchOptimization;
  private performanceMonitor: PerformanceObserver | null = null;
  private touchStartTime: number = 0;
  private lastTouchPosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.metrics = this.initializeMetrics();
    this.optimizations = this.initializeOptimizations();
    this.setupPerformanceMonitoring();
    this.setupTouchEventHandling();
  }

  /**
   * Initialize mobile metrics
   */
  private initializeMetrics(): MobileMetrics {
    return {
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      touchSupport: 'ontouchstart' in window,
      performance: {
        fps: 60,
        memoryUsage: 0,
        loadTime: performance.now()
      },
      userBehavior: {
        sessionDuration: 0,
        interactionsPerSession: 0,
        commonActions: [],
        errorRate: 0
      }
    };
  }

  /**
   * Initialize touch optimizations
   */
  private initializeOptimizations(): TouchOptimization {
    return {
      targetSize: Math.max(44, 44 * this.metrics.devicePixelRatio), // Minimum 44px touch target
      spacing: Math.max(8, 8 * this.metrics.devicePixelRatio), // Minimum 8px spacing
      feedback: 'combined',
      gestureRecognition: true,
      accessibility: true
    };
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceMonitor = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              this.updatePerformanceMetrics(entry);
            }
          }
        });
        this.performanceMonitor.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }
  }

  /**
   * Setup touch event handling
   */
  private setupTouchEventHandling(): void {
    if (!this.metrics.touchSupport) return;

    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Handle touch start event
   */
  private handleTouchStart(event: TouchEvent): void {
    this.touchStartTime = Date.now();
    const touch = event.touches[0];
    this.lastTouchPosition = { x: touch.clientX, y: touch.clientY };

    // Prevent default for better control
    if (this.shouldPreventDefault(event)) {
      event.preventDefault();
    }
  }

  /**
   * Handle touch move event
   */
  private handleTouchMove(event: TouchEvent): void {
    const touch = event.touches[0];
    const currentPosition = { x: touch.clientX, y: touch.clientY };
    
    // Detect swipe gesture
    if (this.isSwipeGesture(this.lastTouchPosition, currentPosition)) {
      const gesture: TouchGesture = {
        type: 'swipe',
        coordinates: currentPosition,
        delta: {
          x: currentPosition.x - this.lastTouchPosition.x,
          y: currentPosition.y - this.lastTouchPosition.y
        },
        duration: Date.now() - this.touchStartTime,
        timestamp: Date.now()
      };
      
      this.touchGestures.push(gesture);
      this.handleGesture(gesture);
    }

    this.lastTouchPosition = currentPosition;
  }

  /**
   * Handle touch end event
   */
  private handleTouchEnd(event: TouchEvent): void {
    const touchDuration = Date.now() - this.touchStartTime;
    
    if (touchDuration < 200) {
      // Short touch - tap
      const gesture: TouchGesture = {
        type: 'tap',
        coordinates: this.lastTouchPosition,
        duration: touchDuration,
        timestamp: Date.now()
      };
      
      this.touchGestures.push(gesture);
      this.handleGesture(gesture);
    } else if (touchDuration > 500) {
      // Long touch - long press
      const gesture: TouchGesture = {
        type: 'longPress',
        coordinates: this.lastTouchPosition,
        duration: touchDuration,
        timestamp: Date.now()
      };
      
      this.touchGestures.push(gesture);
      this.handleGesture(gesture);
    }
  }

  /**
   * Handle orientation change
   */
  private handleOrientationChange(): void {
    setTimeout(() => {
      this.metrics.orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      this.metrics.screenSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      this.optimizeForOrientation();
    }, 100);
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    this.metrics.screenSize = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    this.optimizeLayout();
  }

  /**
   * Check if touch event should prevent default
   */
  private shouldPreventDefault(event: TouchEvent): boolean {
    const target = event.target as HTMLElement;
    
    // Prevent default for scrollable elements
    if (target.closest('.scrollable') || target.closest('[data-scrollable]')) {
      return false;
    }
    
    // Prevent default for custom touch handlers
    if (target.closest('[data-touch-handler]')) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if movement constitutes a swipe gesture
   */
  private isSwipeGesture(start: { x: number; y: number }, end: { x: number; y: number }): boolean {
    const minDistance = 50; // Minimum distance for swipe
    const deltaX = Math.abs(end.x - start.x);
    const deltaY = Math.abs(end.y - start.y);
    
    return deltaX > minDistance || deltaY > minDistance;
  }

  /**
   * Handle recognized gestures
   */
  private handleGesture(gesture: TouchGesture): void {
    switch (gesture.type) {
      case 'tap':
        this.handleTap(gesture);
        break;
      case 'longPress':
        this.handleLongPress(gesture);
        break;
      case 'swipe':
        this.handleSwipe(gesture);
        break;
    }
    
    this.updateUserBehavior(gesture.type);
  }

  /**
   * Handle tap gesture
   */
  private handleTap(gesture: TouchGesture): void {
    // Provide haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    // Find and trigger tap target
    const element = this.findElementAtPosition(gesture.coordinates);
    if (element) {
      this.triggerTapAction(element, gesture);
    }
  }

  /**
   * Handle long press gesture
   */
  private handleLongPress(gesture: TouchGesture): void {
    // Provide haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Show context menu or long press options
    this.showLongPressMenu(gesture);
  }

  /**
   * Handle swipe gesture
   */
  private handleSwipe(gesture: TouchGesture): void {
    if (!gesture.delta) return;
    
    const { delta } = gesture;
    const isHorizontal = Math.abs(delta.x) > Math.abs(delta.y);
    
    if (isHorizontal) {
      if (delta.x > 0) {
        this.handleSwipeRight(gesture);
      } else {
        this.handleSwipeLeft(gesture);
      }
    } else {
      if (delta.y > 0) {
        this.handleSwipeDown(gesture);
      } else {
        this.handleSwipeUp(gesture);
      }
    }
  }

  /**
   * Find element at touch position
   */
  private findElementAtPosition(coordinates: { x: number; y: number }): Element | null {
    return document.elementFromPoint(coordinates.x, coordinates.y);
  }

  /**
   * Trigger tap action on element
   */
  private triggerTapAction(element: Element, gesture: TouchGesture): void {
    // Check if element has custom tap handler
    const tapHandler = element.getAttribute('data-tap-handler');
    if (tapHandler) {
      this.executeTapHandler(tapHandler, element, gesture);
      return;
    }
    
    // Default tap behavior
    if (element instanceof HTMLElement) {
      element.click();
    }
  }

  /**
   * Execute custom tap handler
   */
  private executeTapHandler(handler: string, element: Element, gesture: TouchGesture): void {
    try {
      // Execute handler function if available
      const handlerFunction = (window as any)[handler];
      if (typeof handlerFunction === 'function') {
        handlerFunction(element, gesture);
      }
    } catch (error) {
      console.error('Error executing tap handler:', error);
    }
  }

  /**
   * Show long press menu
   */
  private showLongPressMenu(gesture: TouchGesture): void {
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'mobile-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${gesture.coordinates.x}px;
      top: ${gesture.coordinates.y}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      padding: 8px 0;
    `;
    
    // Add menu items
    const menuItems = ['Copy', 'Share', 'Delete', 'More...'];
    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.textContent = item;
      menuItem.style.cssText = `
        padding: 12px 16px;
        cursor: pointer;
        min-height: ${this.optimizations.targetSize}px;
        display: flex;
        align-items: center;
      `;
      
      menuItem.addEventListener('click', () => {
        this.handleMenuAction(item, gesture);
        document.body.removeChild(menu);
      });
      
      menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // Auto-remove menu after 3 seconds
    setTimeout(() => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
    }, 3000);
  }

  /**
   * Handle menu action
   */
  private handleMenuAction(action: string, gesture: TouchGesture): void {
    console.log(`Menu action: ${action}`, gesture);
    // Implement menu actions
  }

  /**
   * Handle swipe directions
   */
  private handleSwipeRight(gesture: TouchGesture): void {
    // Navigate back or show previous
    this.triggerSwipeAction('right', gesture);
  }

  private handleSwipeLeft(gesture: TouchGesture): void {
    // Navigate forward or show next
    this.triggerSwipeAction('left', gesture);
  }

  private handleSwipeUp(gesture: TouchGesture): void {
    // Show more options or expand
    this.triggerSwipeAction('up', gesture);
  }

  private handleSwipeDown(gesture: TouchGesture): void {
    // Hide options or collapse
    this.triggerSwipeAction('down', gesture);
  }

  /**
   * Trigger swipe action
   */
  private triggerSwipeAction(direction: string, gesture: TouchGesture): void {
    const element = this.findElementAtPosition(gesture.coordinates);
    if (element) {
      const event = new CustomEvent('swipe', {
        detail: { direction, gesture, element }
      });
      element.dispatchEvent(event);
    }
  }

  /**
   * Optimize layout for current screen size
   */
  private optimizeLayout(): void {
    const { width, height } = this.metrics.screenSize;
    
    // Adjust touch targets for screen size
    if (width < 768) {
      this.optimizations.targetSize = Math.max(44, 44 * this.metrics.devicePixelRatio);
      this.optimizations.spacing = Math.max(8, 8 * this.metrics.devicePixelRatio);
    } else {
      this.optimizations.targetSize = Math.max(32, 32 * this.metrics.devicePixelRatio);
      this.optimizations.spacing = Math.max(4, 4 * this.metrics.devicePixelRatio);
    }
    
    // Apply optimizations to DOM
    this.applyTouchOptimizations();
  }

  /**
   * Optimize for current orientation
   */
  private optimizeForOrientation(): void {
    const isPortrait = this.metrics.orientation === 'portrait';
    
    // Adjust layout for orientation
    document.body.classList.toggle('portrait', isPortrait);
    document.body.classList.toggle('landscape', !isPortrait);
    
    // Optimize touch targets for orientation
    if (isPortrait) {
      this.optimizations.targetSize = Math.max(44, 44 * this.metrics.devicePixelRatio);
    } else {
      this.optimizations.targetSize = Math.max(32, 32 * this.metrics.devicePixelRatio);
    }
  }

  /**
   * Apply touch optimizations to DOM
   */
  private applyTouchOptimizations(): void {
    // Find all interactive elements
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [data-touch-target]');
    
    interactiveElements.forEach(element => {
      if (element instanceof HTMLElement) {
        // Ensure minimum touch target size
        const rect = element.getBoundingClientRect();
        const minSize = this.optimizations.targetSize;
        
        if (rect.width < minSize || rect.height < minSize) {
          element.style.minWidth = `${minSize}px`;
          element.style.minHeight = `${minSize}px`;
        }
        
        // Add touch-friendly styling
        element.classList.add('touch-optimized');
      }
    });
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(entry: PerformanceEntry): void {
    if (entry.entryType === 'measure') {
      const measure = entry as PerformanceMeasure;
      this.metrics.performance.loadTime = measure.duration;
    }
  }

  /**
   * Update user behavior metrics
   */
  private updateUserBehavior(action: string): void {
    this.metrics.userBehavior.interactionsPerSession++;
    this.metrics.userBehavior.commonActions.push(action);
    
    // Keep only last 100 actions
    if (this.metrics.userBehavior.commonActions.length > 100) {
      this.metrics.userBehavior.commonActions = this.metrics.userBehavior.commonActions.slice(-100);
    }
  }

  /**
   * Get current mobile metrics
   */
  getMetrics(): MobileMetrics {
    return { ...this.metrics };
  }

  /**
   * Get touch optimizations
   */
  getOptimizations(): TouchOptimization {
    return { ...this.optimizations };
  }

  /**
   * Get touch gesture history
   */
  getTouchGestures(): TouchGesture[] {
    return [...this.touchGestures];
  }

  /**
   * Clear touch gesture history
   */
  clearTouchGestures(): void {
    this.touchGestures = [];
  }

  /**
   * Enable/disable gesture recognition
   */
  setGestureRecognition(enabled: boolean): void {
    this.optimizations.gestureRecognition = enabled;
  }

  /**
   * Set feedback type
   */
  setFeedbackType(type: TouchOptimization['feedback']): void {
    this.optimizations.feedback = type;
  }

  /**
   * Generate mobile experience report
   */
  generateReport(): {
    metrics: MobileMetrics;
    optimizations: TouchOptimization;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    // Performance recommendations
    if (this.metrics.performance.loadTime > 3000) {
      recommendations.push('Optimize page load time - current load time is too high');
    }
    
    if (this.metrics.userBehavior.errorRate > 5) {
      recommendations.push('Investigate high error rate in user interactions');
    }
    
    // Touch optimization recommendations
    if (this.metrics.screenSize.width < 768) {
      recommendations.push('Ensure all touch targets are at least 44px for mobile devices');
    }
    
    if (!this.optimizations.accessibility) {
      recommendations.push('Enable accessibility features for better mobile experience');
    }
    
    return {
      metrics: this.getMetrics(),
      optimizations: this.getOptimizations(),
      recommendations
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.disconnect();
    }
    
    // Remove event listeners
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    document.removeEventListener('orientationchange', this.handleOrientationChange.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
