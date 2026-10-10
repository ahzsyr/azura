# Performance & Animation Improvement Plan

Based on the comprehensive audit conducted, this document outlines the strategic improvements organized by phases, impact, and effort.

## 📊 Executive Summary

| Phase | Duration | Focus Areas | Expected Impact |
|-------|----------|-------------|-----------------|
| Phase 1 | Week 1 | Quick Wins (P0) | 15-20% performance improvement |
| Phase 2 | Weeks 2-3 | Performance Optimization (P0-P1) | 25-30% bundle size reduction |
| Phase 3 | Week 4 | Animation System (P1) | Better UX on low-end devices |
| Phase 4 | Weeks 5-6 | Architecture (P1-P2) | Future-proofing for e-commerce |
| Phase 5 | Weeks 7-8 | Quality & DX (P2-P3) | Improved maintainability |

---

## 🚀 Phase 1: Quick Wins (Week 1)
**Impact**: High | **Effort**: Low | **Priority**: P0

### 1.1 Core Web Vitals Configuration
**File**: `next.config.js` (or `next.config.mjs`)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    optimizeCss: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;
```

**Actions**:
- [ ] Update next.config.js with experimental optimizations
- [ ] Test image format support in target browsers
- [ ] Verify console removal in production builds

### 1.2 GPU Acceleration CSS
**File**: `src/styles/performance/scroll-reveal-animations.css`

```css
/* Add to existing animation rules */
[data-animation],
[data-reveal],
[data-scroll-item] {
  transform: translateZ(0); /* Force GPU layer */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* Use contain for isolated animated sections */
.block-wrapper[data-animated="true"],
.az-lazy-revealed {
  contain: layout style paint;
}
```

**Actions**:
- [ ] Add GPU acceleration properties to animation CSS
- [ ] Test on mobile devices for performance impact
- [ ] Monitor for any visual artifacts

### 1.3 Priority Hints for LCP Images
**File**: `src/components/ui/optimized-image.tsx`

```typescript
export function OptimizedImage({
  aboveFold = false,
  loading,
  fetchPriority,
  // ... existing props
}: OptimizedImageProps) {
  // ... existing code

  const resolvedLoading = loading ?? (aboveFold ? "eager" : "lazy");
  const resolvedPriority = props.priority ?? (aboveFold ? true : undefined);
  const resolvedFetchPriority = fetchPriority ?? (aboveFold ? "high" : "auto");

  return (
    <Image
      {...props}
      src={src}
      loading={resolvedLoading}
      priority={resolvedPriority}
      fetchPriority={resolvedFetchPriority}
      // ... existing props
    />
  );
}
```

**Actions**:
- [ ] Add fetchPriority prop to OptimizedImage component
- [ ] Update hero images to use aboveFold={true}
- [ ] Test LCP score improvement

### 1.4 Bundle Analysis
**File**: `package.json`

```json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build",
    "build:prod": "npm run build"
  },
  "devDependencies": {
    "@next/bundle-analyzer": "^14.0.0"
  }
}
```

**File**: `next.config.js`

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

**Actions**:
- [ ] Install @next/bundle-analyzer
- [ ] Run bundle analysis: `npm run analyze`
- [ ] Identify top 5 largest bundles
- [ ] Create action items for bundle reduction

### 1.5 Animation Error Boundary
**File**: `src/components/animation-error-boundary.tsx`

```typescript
"use client";

import { Component, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AnimationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[AnimationErrorBoundary]', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: { react: { componentName: 'AnimationErrorBoundary' } },
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div data-motion="off">{this.props.children}</div>;
    }
    return this.props.children;
  }
}
```

**Actions**:
- [ ] Create AnimationErrorBoundary component
- [ ] Wrap lazy-block-reveal-observer with boundary
- [ ] Test error handling with intentional animation failures

### 1.6 Loading States for Routes
**File**: `app/[locale]/(marketing)/loading.tsx`

```typescript
export default function Loading() {
  return (
    <div className="route-loading-overlay route-loading-overlay--minimal">
      <div className="nav-progress" />
    </div>
  );
}
```

**Actions**:
- [ ] Create loading.tsx for main routes
- [ ] Test navigation feedback
- [ ] Verify overlay doesn't block interactions

### 1.7 Preconnect Critical Resources
**File**: `app/[locale]/layout.tsx`

```typescript
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://cdn.example.com" />
        <link rel="dns-prefetch" href="https://analytics.example.com" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
```

**Actions**:
- [ ] Identify external resources (CDNs, analytics)
- [ ] Add preconnect/dns-prefetch hints
- [ ] Test resource loading waterfall

---

## 🎨 Phase 2: Performance Optimization (Weeks 2-3)
**Impact**: High | **Effort**: Medium | **Priority**: P0-P1

### 2.1 React Server Components Migration
**Target Files**:
- `src/features/builder/components/panels/block-look-and-feel-panel.tsx`
- `src/features/builder/components/panels/block-style-panel.tsx`
- `src/features/builder/components/panels/block-animation-panel.tsx`

**Strategy**:
1. Identify which panels truly need interactivity
2. Convert static panels to Server Components
3. Use `next/dynamic` for interactive components

```typescript
// Before: All client components
"use client";
export function BlockLookAndFeelPanel({ block, onChange }: Props) {
  // ...
}

// After: Hybrid approach
import { BlockLookAndFeelPanelClient } from './block-look-and-feel-panel.client';

export function BlockLookAndFeelPanel({ block, onChange }: Props) {
  // Server-side logic if any
  return <BlockLookAndFeelPanelClient block={block} onChange={onChange} />;
}
```

**Actions**:
- [ ] Audit all admin panels for client-side necessity
- [ ] Convert 50% of panels to Server Components
- [ ] Measure bundle size reduction
- [ ] Test admin functionality

### 2.2 Icon Import Optimization
**File**: Various component files

**Before**:
```typescript
import * as Icons from 'lucide-react';
<Icons.Settings />
```

**After**:
```typescript
import { Settings } from 'lucide-react';
<Settings />
```

**Actions**:
- [ ] Find all icon imports using `import *`
- [ ] Convert to named imports
- [ ] Re-run bundle analysis
- [ ] Target: 30% icon bundle reduction

### 2.3 Animation Library Audit
**File**: `src/features/builder/animation/animation-resolver.ts`

**Assessment**:
- Check if framer-motion or GSAP is used
- Evaluate if Web Animations API can replace
- Measure bundle impact

**Actions**:
- [ ] Audit animation dependencies
- [ ] Identify heavy animation libraries
- [ ] Prototype WAAPI replacement for simple animations
- [ ] Keep complex libraries only where necessary

### 2.4 Tree-Shaking Verification
**File**: `package.json`

```json
{
  "sideEffects": false
}
```

**Actions**:
- [ ] Add `"sideEffects": false` to package.json
- [ ] Mark CSS files with sideEffects in package.json
- [ ] Verify tree-shaking in production build
- [ ] Test all functionality still works

### 2.5 Code Splitting for Heavy Routes
**File**: Route components

```typescript
// Instead of direct import
import { HeavyAdminPanel } from './heavy-admin-panel';

// Use dynamic import
const HeavyAdminPanel = dynamic(
  () => import('./heavy-admin-panel'),
  { loading: () => <AdminPanelSkeleton /> }
);
```

**Actions**:
- [ ] Identify routes with large component trees
- [ ] Apply dynamic imports to 3-5 heaviest routes
- [ ] Add loading skeletons
- [ ] Test initial load time improvement

---

## ⚡ Phase 3: Animation System (Week 4)
**Impact**: Medium | **Effort**: Medium | **Priority**: P1

### 3.1 Device-Tier Detection
**File**: `src/hooks/use-device-tier.ts`

```typescript
"use client";

import { useMemo } from 'react';

export type DeviceTier = 'low' | 'medium' | 'high';

export function useDeviceTier(): DeviceTier {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return 'high';

    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency || 4;
    const connection = (navigator as any).connection?.effectiveType;

    // Low tier: 2GB RAM, 2 cores, or slow connection
    if (memory <= 2 || cores <= 2 || connection === 'slow-2g' || connection === '2g') {
      return 'low';
    }

    // Medium tier: 4GB RAM, 4 cores, or 3g connection
    if (memory <= 4 || cores <= 4 || connection === '3g') {
      return 'medium';
    }

    return 'high';
  }, []);
}

export function getAnimationConfigForTier(tier: DeviceTier) {
  const configs = {
    low: {
      duration: 150,
      reducedMotion: true,
      skipParticles: true,
      maxConcurrentAnimations: 2,
    },
    medium: {
      duration: 250,
      reducedMotion: false,
      skipParticles: false,
      maxConcurrentAnimations: 4,
    },
    high: {
      duration: 350,
      reducedMotion: false,
      skipParticles: false,
      maxConcurrentAnimations: 8,
    },
  };
  return configs[tier];
}
```

**Actions**:
- [ ] Create useDeviceTier hook
- [ ] Integrate with animation resolver
- [ ] Test on low-end devices
- [ ] Profile performance improvements

### 3.2 Animation Performance Monitoring
**File**: `src/lib/animation-perf.ts`

```typescript
export function measureAnimationPerformance(name: string, fn: () => void) {
  if (typeof PerformanceObserver === 'undefined') {
    return fn();
  }

  const start = performance.now();
  fn();
  const duration = performance.now() - start;

  if (duration > 50) {
    console.warn(`[Animation] ${name} took ${duration}ms`);
    // Report to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'slow_animation', {
        animation_name: name,
        duration_ms: Math.round(duration),
      });
    }
  }

  return duration;
}

export function observeLongAnimations() {
  if (typeof PerformanceObserver === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 100) {
        console.warn(`[Long Animation] ${entry.name}: ${entry.duration}ms`);
      }
    }
  });

  observer.observe({ entryTypes: ['measure', 'longtask'] });
  return () => observer.disconnect();
}
```

**Actions**:
- [ ] Create performance monitoring utilities
- [ ] Add to lazy-block-reveal-observer
- [ ] Set up analytics tracking
- [ ] Monitor for slow animations in production

### 3.3 Adaptive Animation CSS
**File**: `src/styles/performance/scroll-reveal-animations.css`

```css
/* Low-tier device optimizations */
html[data-device-tier="low"] [data-animation],
html[data-device-tier="low"] [data-reveal] {
  transition-duration: 150ms !important;
  animation-duration: 150ms !important;
}

html[data-device-tier="low"] .az-preloader {
  --pre-anim-speed: 2; /* 2x faster */
}

/* High-tier device enhancements */
html[data-device-tier="high"] [data-animation] {
  will-change: transform, opacity;
}
```

**Actions**:
- [ ] Add device-tier CSS variables
- [ ] Update animation resolver to set data-device-tier
- [ ] Test adaptive behavior
- [ ] Document tier thresholds

### 3.4 Animation Queue Management
**File**: `src/lib/animation-queue.ts`

```typescript
class AnimationQueue {
  private queue: Array<() => void> = [];
  private running = false;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 4) {
    this.maxConcurrent = maxConcurrent;
  }

  add(fn: () => void) {
    this.queue.push(fn);
    this.process();
  }

  private process() {
    if (this.running || this.queue.length === 0) return;

    this.running = true;
    const batch = this.queue.splice(0, this.maxConcurrent);

    batch.forEach(fn => {
      requestAnimationFrame(() => {
        fn();
        if (this.queue.length > 0) {
          this.process();
        } else {
          this.running = false;
        }
      });
    });
  }
}

export const animationQueue = new AnimationQueue();
```

**Actions**:
- [ ] Create animation queue system
- [ ] Integrate with lazy-block-reveal-observer
- [ ] Set max concurrent based on device tier
- [ ] Test concurrent animation performance

---

## 🏗️ Phase 4: Architecture (Weeks 5-6)
**Impact**: Medium | **Effort**: High | **Priority**: P1-P2

### 4.1 Transaction State Machine Preparation
**File**: `src/lib/transactions/state-machine.ts`

```typescript
export type TransactionState =
  | 'idle'
  | 'cart-open'
  | 'checkout'
  | 'processing'
  | 'success'
  | 'error';

export type TransactionEvent =
  | { type: 'OPEN_CART' }
  | { type: 'START_CHECKOUT' }
  | { type: 'SUBMIT_PAYMENT' }
  | { type: 'PAYMENT_SUCCESS' }
  | { type: 'PAYMENT_ERROR'; error: Error }
  | { type: 'CLOSE_CART' }
  | { type: 'RESET' };

export interface AnimationConfig {
  type: 'fade' | 'slide' | 'scale' | 'pulse' | 'bounce';
  duration: number;
  easing?: string;
  loop?: boolean;
}

export const TRANSITION_ANIMATIONS: Record<string, AnimationConfig> = {
  'idle->cart-open': { type: 'slide-left', duration: 300, easing: 'ease-out' },
  'cart-open->checkout': { type: 'fade', duration: 200, easing: 'ease-in-out' },
  'checkout->processing': { type: 'pulse', duration: 1000, easing: 'ease-in-out', loop: true },
  'processing->success': { type: 'scale', duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  'processing->error': { type: 'shake', duration: 500, easing: 'ease-in-out' },
  'cart-open->idle': { type: 'slide-right', duration: 300, easing: 'ease-out' },
};

export class TransactionStateMachine {
  private state: TransactionState = 'idle';
  private listeners: Set<(state: TransactionState) => void> = new Set();

  getState(): TransactionState {
    return this.state;
  }

  subscribe(listener: (state: TransactionState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  transition(event: TransactionEvent): TransactionState {
    const previousState = this.state;
    let newState: TransactionState;

    switch (event.type) {
      case 'OPEN_CART':
        newState = 'cart-open';
        break;
      case 'START_CHECKOUT':
        newState = 'checkout';
        break;
      case 'SUBMIT_PAYMENT':
        newState = 'processing';
        break;
      case 'PAYMENT_SUCCESS':
        newState = 'success';
        break;
      case 'PAYMENT_ERROR':
        newState = 'error';
        break;
      case 'CLOSE_CART':
        newState = 'idle';
        break;
      case 'RESET':
        newState = 'idle';
        break;
      default:
        newState = this.state;
    }

    if (newState !== previousState) {
      this.state = newState;
      this.listeners.forEach(listener => listener(newState));
    }

    return newState;
  }

  getAnimationForTransition(from: TransactionState, to: TransactionState): AnimationConfig | null {
    const key = `${from}->${to}`;
    return TRANSITION_ANIMATIONS[key] || null;
  }
}

export const transactionStateMachine = new TransactionStateMachine();
```

**Actions**:
- [ ] Create transaction state machine
- [ ] Define animation configurations
- [ ] Create React hook for state machine
- [ ] Document state transitions

### 4.2 Transaction Animation Components
**File**: `src/components/transactions/transaction-animator.tsx`

```typescript
"use client";

import { useEffect, useState } from 'react';
import { transactionStateMachine, TransactionState } from '@/lib/transactions/state-machine';
import { cn } from '@/lib/utils';

interface TransactionAnimatorProps {
  children: React.ReactNode;
}

export function TransactionAnimator({ children }: TransactionAnimatorProps) {
  const [state, setState] = useState<TransactionState>(transactionStateMachine.getState());
  const [animation, setAnimation] = useState<string>('');

  useEffect(() => {
    const unsubscribe = transactionStateMachine.subscribe((newState) => {
      const previousState = state;
      setState(newState);

      const animConfig = transactionStateMachine.getAnimationForTransition(previousState, newState);
      if (animConfig) {
        setAnimation(`anim-${animConfig.type}`);
        setTimeout(() => setAnimation(''), animConfig.duration);
      }
    });

    return unsubscribe;
  }, [state]);

  return (
    <div className={cn('transaction-container', animation && animation)}>
      {children}
    </div>
  );
}
```

**Actions**:
- [ ] Create transaction animator component
- [ ] Define animation CSS classes
- [ ] Test state transitions
- [ ] Add to transaction UI when implemented

### 4.3 Enhanced Error Boundaries
**File**: `src/components/error-boundaries.tsx`

```typescript
"use client";

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AnimationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div data-motion="off">{this.props.children}</div>;
    }
    return this.props.children;
  }
}

export class ImageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center bg-muted" style={{ aspectRatio: '16/9' }}>
          <span className="text-muted-foreground">Image unavailable</span>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Actions**:
- [ ] Create specialized error boundaries
- [ ] Wrap OptimizedImage with ImageErrorBoundary
- [ ] Wrap animation components with AnimationErrorBoundary
- [ ] Test error scenarios

### 4.4 API Response Caching Strategy
**File**: `src/lib/api-cache.ts`

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new APICache();
```

**Actions**:
- [ ] Create API cache utility
- [ ] Integrate with data fetching hooks
- [ ] Set appropriate TTLs per endpoint
- [ ] Add cache invalidation on mutations

---

## 🧪 Phase 5: Quality & DX (Weeks 7-8)
**Impact**: Low-Medium | **Effort**: Medium | **Priority**: P2-P3

### 5.1 Visual Regression Testing
**File**: `tests/animations.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Scroll Reveal Animations', () => {
  test('animates on scroll', async ({ page }) => {
    await page.goto('/');

    // Scroll to reveal element
    await page.evaluate(() => window.scrollTo(0, 500));

    // Wait for animation
    await page.waitForTimeout(400);

    // Check opacity is 1
    const element = page.locator('[data-reveal]').first();
    await expect(element).toHaveCSS('opacity', '1');
  });

  test('respects reduced motion preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Check animation is disabled
    const element = page.locator('[data-reveal]').first();
    await expect(element).toHaveCSS('opacity', '1');
    await expect(element).toHaveCSS('transform', 'none');
  });

  test('lazy blocks reveal correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for lazy block observer
    await page.waitForSelector('[data-lazy-block].az-lazy-revealed', { timeout: 5000 });

    const lazyBlock = page.locator('[data-lazy-block].az-lazy-revealed').first();
    await expect(lazyBlock).toBeVisible();
  });
});

test.describe('Preloader', () => {
  test('shows on initial load', async ({ page }) => {
    await page.goto('/');

    // Preloader should be visible initially
    const preloader = page.locator('#azura-boot-preloader');
    await expect(preloader).toBeVisible();

    // Should fade out after load
    await page.waitForTimeout(500);
    await expect(preloader).toHaveCSS('opacity', '0');
  });

  test('respects reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Preloader should be hidden immediately
    const preloader = page.locator('#azura-boot-preloader');
    await expect(preloader).toHaveCSS('opacity', '0');
  });
});
```

**Actions**:
- [ ] Install Playwright
- [ ] Create animation test suite
- [ ] Add to CI pipeline
- [ ] Set up screenshot comparison

### 5.2 Performance Budget in CI
**File**: `package.json`

```json
{
  "scripts": {
    "test:perf": "lhci autorun",
    "bundle-check": "bundlesize"
  },
  "devDependencies": {
    "@lhci/cli": "^0.12.0",
    "bundlesize": "^0.18.0"
  },
  "bundlesize": [
    {
      "path": ".next/static/chunks/main-*.js",
      "maxSize": "100 kB"
    },
    {
      "path": ".next/static/chunks/framework-*.js",
      "maxSize": "150 kB"
    },
    {
      "path": ".next/static/css/*.css",
      "maxSize": "50 kB"
    }
  ]
}
```

**File**: `lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "staticDistDir": ".next",
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**Actions**:
- [ ] Install Lighthouse CI
- [ ] Configure performance budgets
- [ ] Add to GitHub Actions
- [ ] Set up failure notifications

### 5.3 Animation Documentation
**File**: `docs/animations.md`

```markdown
# Animation System Documentation

## Block Entrance Animations

| Preset | CSS Class | Duration | Use Case | Device Tier |
|--------|-----------|----------|----------|-------------|
| fade | `anim-fade` | 300ms | Subtle content reveal | All |
| slide-up | `anim-slide-up` | 400ms | Hero sections, CTAs | All |
| slide-down | `anim-slide-down` | 400ms | Dropdowns, overlays | All |
| slide-left | `anim-slide-left` | 300ms | Cart slide-in | Medium+ |
| slide-right | `anim-slide-right` | 300ms | Cart slide-out | Medium+ |
| scale | `anim-scale` | 350ms | Feature cards, modals | Medium+ |
| zoom | `anim-zoom` | 350ms | Image reveals | High |
| rotate | `anim-rotate` | 400ms | Creative elements | High |
| bounce | `anim-bounce` | 500ms | Attention-grabbing CTAs | High |

## Preloader Variants

| Variant | Animation | Duration | Use Case |
|---------|-----------|----------|----------|
| orbit | Continuous rotation | 2.4s | Tech, circular brands |
| pulse | Scale pulse | 1.6s | Friendly, modern |
| wave | Horizontal wave | 1.2s | Flow, movement |
| scan | Brightness scan | 1.4s | Tech, scanning |
| hex | Hexagonal pulse | 1.5s | Geometric, modern |
| bars | Vertical scale | 1.1s | Minimalist |
| glitch | Step glitch | 1.1s | Cyber, edgy |
| dots | Opacity pulse | 0.9s | Simple, clean |

## Device Tier Adaptation

### Low Tier (≤2GB RAM, ≤2 cores, 2G)
- Animation duration: 150ms
- Reduced motion: enabled
- Particles: disabled
- Max concurrent: 2

### Medium Tier (≤4GB RAM, ≤4 cores, 3G)
- Animation duration: 250ms
- Reduced motion: disabled
- Particles: enabled
- Max concurrent: 4

### High Tier (>4GB RAM, >4 cores, 4G+)
- Animation duration: 350ms
- Reduced motion: disabled
- Particles: enabled
- Max concurrent: 8

## Accessibility

All animations respect:
- `prefers-reduced-motion` media query
- `data-motion="off"` global disable
- `data-reduced-paint="true"` reduced paint mode

## Performance

- GPU acceleration via `transform: translateZ(0)`
- Containment via `contain: layout style paint`
- Will-change management (set during anim, reset after)
- IntersectionObserver for lazy revelation
- Content-visibility for lazy blocks
```

**Actions**:
- [ ] Create comprehensive animation docs
- [ ] Add code examples
- [ ] Include accessibility guidelines
- [ ] Document performance considerations

### 5.4 Storybook Setup
**File**: `.storybook/main.ts`

```typescript
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
```

**File**: `src/components/ui/optimized-image.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { OptimizedImage } from './optimized-image';

const meta: Meta<typeof OptimizedImage> = {
  title: 'UI/OptimizedImage',
  component: OptimizedImage,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof OptimizedImage>;

export const AboveFold: Story = {
  args: {
    src: '/images/hero.jpg',
    alt: 'Hero image',
    aboveFold: true,
    width: 1200,
    height: 600,
  },
};

export const BelowFold: Story = {
  args: {
    src: '/images/content.jpg',
    alt: 'Content image',
    aboveFold: false,
    width: 800,
    height: 400,
  },
};
```

**Actions**:
- [ ] Install Storybook
- [ ] Create stories for key components
- [ ] Add animation panel stories
- [ ] Set up for design team

### 5.5 Web Vitals Integration
**File**: `app/[locale]/layout.tsx`

```typescript
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect, prefetch */}
      </head>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
```

**File**: `src/lib/web-vitals.ts`

```typescript
export function reportWebVitals(metric: any) {
  // Report to analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Log slow vitals
  if (metric.value > (metric.threshold || 3000)) {
    console.warn(`[Web Vitals] ${metric.name}: ${metric.value}ms (threshold: ${metric.threshold}ms)`);
  }
}
```

**Actions**:
- [ ] Install Vercel Speed Insights
- [ ] Install Vercel Analytics
- [ ] Configure web vitals reporting
- [ ] Set up dashboards

---

## 📊 Tracking & Metrics

### Key Performance Indicators

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| LCP | TBD | <2.5s | Lighthouse CI |
| FID | TBD | <100ms | Lighthouse CI |
| CLS | TBD | <0.1 | Lighthouse CI |
| Bundle Size (main) | TBD | <100KB | Bundle analyzer |
| Bundle Size (framework) | TBD | <150KB | Bundle analyzer |
| Animation Frame Rate | TBD | >55fps | Performance Observer |
| Time to Interactive | TBD | <3.5s | Lighthouse CI |

### Success Criteria

- [ ] All P0 items completed in Phase 1
- [ ] 20%+ performance improvement measured
- [ ] 25%+ bundle size reduction achieved
- [ ] All tests passing in CI
- [ ] No animation-related user complaints
- [ ] Accessibility score maintained at 90+

---

## 🔄 Rollback Plan

If any phase causes issues:

1. **Phase 1**: Revert next.config.js changes
2. **Phase 2**: Revert RSC conversions incrementally
3. **Phase 3**: Disable device-tier detection via feature flag
4. **Phase 4**: Remove transaction state machine (not in use yet)
5. **Phase 5**: Disable CI checks temporarily

Use Git branches per phase for easy rollback:
- `phase-1-quick-wins`
- `phase-2-performance`
- `phase-3-animations`
- `phase-4-architecture`
- `phase-5-quality`

---

## 📝 Notes

- Test each phase in staging before production
- Monitor metrics after each deployment
- Gather user feedback on animation changes
- Document any deviations from this plan
- Update this document as learnings emerge
