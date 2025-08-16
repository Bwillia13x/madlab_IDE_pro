'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Settings, 
  Menu, 
  X,
  Home,
  Briefcase,
  Activity,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  notifications?: number;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'charts', label: 'Charts', icon: BarChart3 },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'analytics', label: 'Analytics', icon: Activity },
  { id: 'news', label: 'News', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function MobileNavigation({ 
  activeSection, 
  onSectionChange, 
  notifications = 0 
}: MobileNavigationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const navRef = useRef<HTMLDivElement>(null);
  const touchStartTime = useRef<number>(0);

  // Touch gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const timeElapsed = Date.now() - touchStartTime.current;
    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);
    const isFastSwipe = timeElapsed < 300;
    const isLongSwipe = Math.abs(distanceX) > 100;

    if (isHorizontal && isFastSwipe && isLongSwipe) {
      const currentIndex = navigationItems.findIndex(item => item.id === activeSection);
      
      if (distanceX > 0 && currentIndex < navigationItems.length - 1) {
        // Swipe left - next section
        const nextSection = navigationItems[currentIndex + 1];
        onSectionChange(nextSection.id);
        setSwipeDirection('left');
      } else if (distanceX < 0 && currentIndex > 0) {
        // Swipe right - previous section
        const prevSection = navigationItems[currentIndex - 1];
        onSectionChange(prevSection.id);
        setSwipeDirection('right');
      }
    }

    // Reset touch states
    setTouchStart(null);
    setTouchEnd(null);
    
    // Clear swipe direction after animation
    setTimeout(() => setSwipeDirection(null), 300);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        const currentIndex = navigationItems.findIndex(item => item.id === activeSection);
        if (currentIndex > 0) {
          onSectionChange(navigationItems[currentIndex - 1].id);
        }
      } else if (e.key === 'ArrowRight') {
        const currentIndex = navigationItems.findIndex(item => item.id === activeSection);
        if (currentIndex < navigationItems.length - 1) {
          onSectionChange(navigationItems[currentIndex + 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, onSectionChange]);

  // Auto-hide navigation on scroll (mobile only)
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateNav = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const isScrollingUp = currentScrollY < lastScrollY;
      
      if (navRef.current) {
        if (isScrollingDown && currentScrollY > 100) {
          navRef.current.style.transform = 'translateY(100%)';
        } else if (isScrollingUp) {
          navRef.current.style.transform = 'translateY(0)';
        }
      }
      
      lastScrollY = currentScrollY;
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateNav);
        ticking = true;
      }
    };

    window.addEventListener('scroll', requestTick);
    return () => window.removeEventListener('scroll', requestTick);
  }, []);

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div
        ref={navRef}
        className="mobile-nav fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
          <div className="px-2 py-2">
            <div className="mobile-nav-list">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={cn(
                      'mobile-nav-item mobile-touch-target relative flex flex-col items-center gap-1 rounded-lg px-2 py-2 transition-all duration-200',
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-lg' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Icon className="mobile-nav-icon" />
                    <span className="mobile-nav-text">{item.label}</span>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute -top-1 left-1/2 w-2 h-2 bg-primary rounded-full transform -translate-x-1/2" />
                    )}
                    
                    {/* Notifications badge */}
                    {item.badge && item.badge > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Swipe Indicator */}
      {swipeDirection && (
        <div
          className={cn(
            'fixed top-1/2 z-40 pointer-events-none transition-all duration-300',
            swipeDirection === 'left' 
              ? 'left-4 animate-slide-in-left' 
              : 'right-4 animate-slide-in-right'
          )}
        >
          <div className="bg-primary/20 backdrop-blur rounded-full p-3">
            <div className="text-primary">
              {swipeDirection === 'left' ? (
                <TrendingUp className="h-6 w-6" />
              ) : (
                <TrendingUp className="h-6 w-6 rotate-180" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Quick Actions */}
      <div className="fixed bottom-20 right-4 z-40">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mobile-touch-target h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          {isExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        {isExpanded && (
          <div className="absolute bottom-16 right-0 space-y-2 animate-in slide-in-from-bottom-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSectionChange('charts')}
              className="mobile-touch-target h-10 w-10 rounded-full shadow-md"
              title="Quick Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSectionChange('portfolio')}
              className="mobile-touch-target h-10 w-10 rounded-full shadow-md"
              title="Portfolio View"
            >
              <PieChart className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSectionChange('analytics')}
              className="mobile-touch-target h-10 w-10 rounded-full shadow-md"
              title="Analytics"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Section Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">
              {navigationItems.find(item => item.id === activeSection)?.label}
            </h1>
            
            <div className="flex items-center gap-2">
              {notifications > 0 && (
                <Badge variant="destructive" className="h-6 px-2 text-xs">
                  {notifications}
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSectionChange('settings')}
                className="mobile-touch-target h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Content Area */}
      <div className="pb-20">
        {/* Content will be rendered here based on activeSection */}
      </div>
    </>
  );
}