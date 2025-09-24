# Component Documentation

## Overview

This document provides detailed documentation for all custom components in the Football Forecast application.

---

## Core Components

### ErrorBoundary

**Purpose**: Catches JavaScript errors in component tree and displays fallback UI.

**Props**:
- `children: ReactNode` - Components to wrap
- `fallback?: ReactNode` - Custom fallback UI (optional)

**Usage**:
```tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary fallback={<CustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

**Features**:
- Development error details
- Retry functionality
- Production-safe error display

---

### LoadingState

**Purpose**: Consistent loading UI with spinner and message.

**Props**:
- `message?: string` - Loading message (default: "Loading...")
- `showSpinner?: boolean` - Show spinner (default: true)
- `className?: string` - Additional CSS classes

**Usage**:
```tsx
<LoadingState message="Loading matches..." />
<LoadingState showSpinner={false} message="Processing..." />
```

---

### LoadingSpinner

**Purpose**: Animated spinner for inline loading states.

**Props**:
- `size?: 'sm' | 'md' | 'lg'` - Spinner size (default: 'md')
- `className?: string` - Additional CSS classes

**Usage**:
```tsx
<LoadingSpinner size="lg" />
<LoadingSpinner className="text-primary" />
```

---

## Skeleton Components

### MatchCardSkeleton

**Purpose**: Loading placeholder for match cards.

**Usage**:
```tsx
<MatchCardSkeleton />

// Multiple skeletons
<SkeletonGrid count={3} component={MatchCardSkeleton} />
```

### PredictionCardSkeleton

**Purpose**: Loading placeholder for prediction cards.

**Usage**:
```tsx
<PredictionCardSkeleton />
```

### StandingsTableSkeleton

**Purpose**: Loading placeholder for standings tables.

**Usage**:
```tsx
<StandingsTableSkeleton />
```

---

## Layout Components

### LazyWrapper

**Purpose**: Wraps components with lazy loading and error boundaries.

**Props**:
- `children: ReactNode` - Component to wrap
- `fallback?: ReactNode` - Loading fallback
- `errorFallback?: ReactNode` - Error fallback

**Usage**:
```tsx
<LazyWrapper fallback={<LoadingState />}>
  <HeavyComponent />
</LazyWrapper>
```

### withLazyLoading

**Purpose**: HOC for adding lazy loading to components.

**Usage**:
```tsx
const LazyComponent = withLazyLoading(YourComponent, "Loading component...");
```

---

## Accessibility Components

### SkipToMain

**Purpose**: Skip navigation link for screen readers.

**Usage**:
```tsx
// Place at top of page
<SkipToMain />
```

### LiveRegion

**Purpose**: Announces dynamic content to screen readers.

**Props**:
- `children: ReactNode` - Content to announce
- `priority?: 'polite' | 'assertive' | 'off'` - Announcement priority

**Usage**:
```tsx
<LiveRegion priority="assertive">
  Match score updated: 2-1
</LiveRegion>
```

### AccessibleButton

**Purpose**: Button with proper ARIA attributes.

**Props**:
- `children: ReactNode` - Button content
- `onClick: () => void` - Click handler
- `ariaLabel?: string` - Accessible label
- `ariaDescribedBy?: string` - Description reference
- `disabled?: boolean` - Disabled state
- `variant?: 'default' | 'outline' | 'ghost'` - Button style
- `size?: 'default' | 'sm' | 'lg' | 'icon' | null | undefined` - Button size (default: 'default')

**Usage**:
```tsx
<AccessibleButton
  ariaLabel="View match details"
  onClick={handleClick}
>
  View Details
</AccessibleButton>
```

---

## Football-Specific Components

### LiveMatches

**Purpose**: Displays live football matches with real-time updates.

**Features**:
- WebSocket integration for real-time updates
- Fallback to polling when WebSocket unavailable
- Loading states and error handling
- Responsive grid layout

**Usage**:
```tsx
<LiveMatches />
```

**Data Requirements**:
- Authenticated user
- Live fixtures from `/api/fixtures/live`
- Teams data from `/api/teams`

---

### PredictionsPanel

**Purpose**: Shows AI-powered match predictions.

**Features**:
- Win/Draw/Loss probabilities
- Expected goals (xG) data
- Confidence indicators
- Detailed analysis tooltips

**Usage**:
```tsx
<PredictionsPanel />
```

**Data Requirements**:
- Upcoming fixtures from `/api/fixtures`
- Teams data from `/api/teams`
- Predictions from `/api/predictions`

---

### TeamDisplay

**Purpose**: Displays team information with logo and name.

**Props**:
- `team?: Team` - Team data object
- `size?: 'sm' | 'md' | 'lg'` - Display size
- `showName?: boolean` - Show team name
- `showFlag?: boolean` - Show country flag
- `className?: string` - Additional CSS classes

**Usage**:
```tsx
<TeamDisplay 
  team={homeTeam} 
  size="lg"
  showName={true}
  showFlag={false}
/>
```

---

### MatchTeamsDisplay

**Purpose**: Shows both teams in a match with vs. separator.

**Props**:
- `homeTeam?: Team` - Home team data
- `awayTeam?: Team` - Away team data
- `size?: 'sm' | 'md' | 'lg'` - Display size
- `showFlags?: boolean` - Show country flags
- `className?: string` - Additional CSS classes

**Usage**:
```tsx
<MatchTeamsDisplay
  homeTeam={homeTeam}
  awayTeam={awayTeam}
  size="lg"
  showFlags={false}
/>
```

---

## Hooks

### useWebSocket

**Purpose**: Manages WebSocket connection for real-time updates.

**Returns**:
- `isConnected: boolean` - Connection status
- `isConnecting: boolean` - Connecting state
- `connectionStats: object` - Connection statistics

**Usage**:
```tsx
const { isConnected, isConnecting, connectionStats } = useWebSocket({
  onMessage: (message) => {
    console.log('Received:', message);
  }
});
```

### useScreenReaderAnnouncement

**Purpose**: Provides screen reader announcement functionality.

**Returns**:
- `announce: (message: string, priority?: string) => void` - Announce function
- `AnnouncementRegion: Component` - Live region component

**Usage**:
```tsx
const { announce, AnnouncementRegion } = useScreenReaderAnnouncement();

// In component
<AnnouncementRegion />

// To announce
announce("Data updated successfully");
```

### useFocusTrap

**Purpose**: Traps focus within a container (for modals).

**Parameters**:
- `isActive: boolean` - Whether trap is active

**Usage**:
```tsx
const [isModalOpen, setIsModalOpen] = useState(false);
useFocusTrap(isModalOpen);
```

### useKeyboardNavigation

**Purpose**: Handles common keyboard shortcuts.

**Parameters**:
- `onEscape?: () => void` - Escape key handler
- `onEnter?: () => void` - Enter key handler

**Usage**:
```tsx
useKeyboardNavigation(
  () => setIsModalOpen(false), // Escape
  () => handleSubmit()         // Enter
);
```

### useHighContrastMode

**Purpose**: Detects high contrast mode preference.

**Returns**:
- `isHighContrast: boolean` - High contrast mode status

**Usage**:
```tsx
const isHighContrast = useHighContrastMode();
```

### useReducedMotion

**Purpose**: Detects reduced motion preference.

**Returns**:
- `prefersReducedMotion: boolean` - Reduced motion preference

**Usage**:
```tsx
const prefersReducedMotion = useReducedMotion();
```

---

## CSS Classes

### Animation Classes
- `animate-fade-in` - Fade in animation
- `animate-slide-in` - Slide in from left
- `live-pulse` - Pulsing animation for live indicators
- `shimmer` - Shimmer loading effect

### Interaction Classes
- `hover-lift` - Lift effect on hover
- `smooth-transition` - Smooth transitions
- `focus-ring` - Focus ring for accessibility
- `glass-effect` - Glassmorphism effect

### Utility Classes
- `gradient-bg` - Primary gradient background
- `prediction-confidence` - Confidence bar gradient

---

## Data Structures

### Team
```typescript
interface Team {
  id: number;
  name: string;
  code?: string;
  country?: string;
  founded?: number;
  national?: boolean;
  logo?: string;
}
```

### Fixture
```typescript
interface Fixture {
  id: number;
  referee?: string;
  timezone?: string;
  date: string;
  timestamp?: number;
  status: string;
  elapsed?: number;
  round?: string;
  homeTeamId?: number;
  awayTeamId?: number;
  leagueId?: number;
  venue?: string;
  homeScore?: number;
  awayScore?: number;
  halftimeHomeScore?: number;
  halftimeAwayScore?: number;
}
```

### Prediction
```typescript
interface Prediction {
  id: number;
  fixtureId?: number;
  homeWinProbability?: string;
  drawProbability?: string;
  awayWinProbability?: string;
  expectedGoalsHome?: string;
  expectedGoalsAway?: string;
  bothTeamsScore?: string;
  over25Goals?: string;
  confidence?: string;
  createdAt?: string;
}
```

---

## Testing

### Test IDs

All interactive components include `data-testid` attributes for testing:

- `match-card-{fixtureId}` - Match cards
- `prediction-card-{fixtureId}` - Prediction cards
- `nav-{section}` - Navigation links
- `league-selector` - League dropdown
- `live-indicator` - Live status indicator

### Example Test
```typescript
// Test match card rendering
const matchCard = screen.getByTestId('match-card-123');
expect(matchCard).toBeInTheDocument();

// Test button interaction
const viewButton = screen.getByTestId('view-details-123');
fireEvent.click(viewButton);
```

---

## Performance Considerations

### Lazy Loading
Heavy components are lazy-loaded:
- `LazyDataVisualization` - Charts and graphs
- `LazyScrapedInsights` - Data analysis
- `LazyTeamPerformance` - Performance metrics

### Memoization
Use React.memo for expensive components:
```tsx
export const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});
```

### Bundle Splitting
Components are split by feature:
- Core UI components
- Football-specific components
- Analytics components
- Admin components

---

## Error Handling

### Error Boundaries
All major sections wrapped in error boundaries:
- Page level: Catches all errors
- Component level: Isolates failures
- Feature level: Prevents cascade failures

### Error Types
- Network errors: API failures
- Parsing errors: Invalid data
- Runtime errors: Component failures
- Authentication errors: Session issues

---

## Accessibility Features

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- Live regions for dynamic content
- Skip navigation links

### Keyboard Navigation
- Tab order management
- Focus indicators
- Keyboard shortcuts
- Focus trapping in modals

### Visual Accessibility
- High contrast mode support
- Reduced motion support
- Color contrast compliance
- Scalable text support

---

**Last Updated**: September 2025
**Version**: 1.0.0
