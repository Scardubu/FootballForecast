# Football Forecast Style Guide

## Design System Overview

This style guide documents the visual design system, component patterns, and UX principles for the Football Forecast platform.

---

## Color Palette

### Primary Colors
- **Primary Green**: `hsl(122, 64%, 22%)` - Main brand color for buttons, links, and emphasis
- **Secondary Orange**: `hsl(24, 100%, 50%)` - Secondary actions and highlights
- **Accent Blue**: `hsl(207, 90%, 54%)` - Information states and data visualization

### Semantic Colors
- **Success**: `hsl(122, 39%, 49%)` - Positive states, wins, confirmations
- **Destructive**: `hsl(356, 90%, 54%)` - Errors, losses, warnings
- **Muted**: `hsl(0, 0%, 96%)` - Subtle backgrounds and disabled states

### Neutral Colors
- **Background**: `hsl(0, 0%, 98%)` (light) / `hsl(0, 0%, 3.9%)` (dark)
- **Foreground**: `hsl(0, 0%, 13%)` (light) / `hsl(0, 0%, 98%)` (dark)
- **Border**: `hsl(0, 0%, 90%)` (light) / `hsl(0, 0%, 14.9%)` (dark)

---

## Typography

### Font Families
- **Primary**: Inter - Modern, readable sans-serif for UI text
- **Monospace**: JetBrains Mono - Code, data, and technical content
- **Serif**: Georgia - Fallback for formal content

### Font Scales
- **Display**: `text-4xl` (36px) - Hero headings
- **H1**: `text-3xl` (30px) - Page titles
- **H2**: `text-2xl` (24px) - Section headers
- **H3**: `text-xl` (20px) - Subsection headers
- **Body**: `text-base` (16px) - Default text
- **Small**: `text-sm` (14px) - Secondary information
- **Caption**: `text-xs` (12px) - Labels and metadata

---

## Spacing System

### Base Unit: 4px (0.25rem)

- **xs**: `4px` - Tight spacing
- **sm**: `8px` - Small gaps
- **md**: `16px` - Default spacing
- **lg**: `24px` - Section spacing
- **xl**: `32px` - Large gaps
- **2xl**: `48px` - Major sections

---

## Component Patterns

### Cards
```tsx
<Card className="hover-lift smooth-transition">
  <CardContent className="p-6">
    {/* Content */}
  </CardContent>
</Card>
```

**Usage**: Container for related information with subtle elevation and hover effects.

### Buttons
```tsx
// Primary action
<Button className="focus-ring">Primary Action</Button>

// Secondary action
<Button variant="outline" className="focus-ring">Secondary</Button>

// Destructive action
<Button variant="destructive" className="focus-ring">Delete</Button>
```

### Loading States
```tsx
// Skeleton loading
<MatchCardSkeleton />

// Spinner loading
<LoadingSpinner size="lg" />

// Full page loading
<LoadingState message="Loading data..." />
```

### Error Handling
```tsx
// Component-level error boundary
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// Inline error fallback
<ErrorFallback error={error} resetError={resetError} />
```

---

## Animation Guidelines

### Principles
- **Subtle**: Animations should enhance, not distract
- **Fast**: Keep durations under 300ms for UI feedback
- **Purposeful**: Every animation should serve a function

### Common Animations
- **Hover Effects**: `hover-lift` class for cards and interactive elements
- **Transitions**: `smooth-transition` for state changes
- **Loading**: `animate-pulse` for skeleton states
- **Entry**: `animate-fade-in` for new content

### Reduced Motion
Respect user preferences with `prefers-reduced-motion: reduce` media query.

---

## Accessibility Standards

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Focus Indicators**: Visible focus rings on all interactive elements
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Readers**: Proper ARIA labels and semantic HTML

### Implementation
```tsx
// Accessible button
<AccessibleButton
  ariaLabel="View match details"
  onClick={handleClick}
>
  View Details
</AccessibleButton>

// Skip navigation
<SkipToMain />

// Screen reader announcements
const { announce } = useScreenReaderAnnouncement();
announce("Data updated successfully");
```

---

## Responsive Design

### Breakpoints
- **Mobile**: `< 768px` - Single column layout
- **Tablet**: `768px - 1024px` - Two column layout
- **Desktop**: `> 1024px` - Multi-column layout

### Grid System
```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Items */}
</div>
```

---

## Data Visualization

### Chart Colors
- **Chart 1**: Primary green for main data series
- **Chart 2**: Secondary orange for comparisons
- **Chart 3**: Accent blue for additional metrics
- **Chart 4**: Success green for positive trends
- **Chart 5**: Destructive red for negative trends

### Principles
- **Clarity**: Data should be immediately understandable
- **Consistency**: Use consistent colors and patterns
- **Accessibility**: Ensure charts work without color alone

---

## Performance Guidelines

### Loading Strategy
1. **Critical Path**: Load essential UI components first
2. **Lazy Loading**: Use `LazyWrapper` for heavy components
3. **Code Splitting**: Separate routes and features
4. **Prefetching**: Preload likely next actions

### Bundle Optimization
- **Tree Shaking**: Import only used components
- **Dynamic Imports**: Load features on demand
- **Image Optimization**: Use appropriate formats and sizes

---

## Component Library

### Core Components
- **Button**: Primary interaction element
- **Card**: Content container
- **Input**: Form field
- **Select**: Dropdown selection
- **Tabs**: Content organization
- **Modal**: Overlay content

### Football-Specific Components
- **TeamDisplay**: Team logo and name
- **MatchCard**: Fixture information
- **PredictionCard**: AI prediction display
- **StandingsTable**: League table
- **LiveIndicator**: Real-time status

### Layout Components
- **Header**: Navigation and branding
- **Sidebar**: Secondary navigation
- **Footer**: Site information
- **Container**: Content wrapper

---

## Development Workflow

### Component Creation
1. **Design**: Create component design in Figma/design tool
2. **Implement**: Build with TypeScript and accessibility in mind
3. **Test**: Ensure keyboard navigation and screen reader compatibility
4. **Document**: Add to style guide with usage examples

### Code Standards
- **TypeScript**: All components must be typed
- **Props Interface**: Define clear prop interfaces
- **Default Props**: Provide sensible defaults
- **Error Handling**: Wrap with error boundaries
- **Testing**: Include data-testid attributes

---

## Browser Support

### Supported Browsers
- **Chrome**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Safari**: Latest 2 versions
- **Edge**: Latest 2 versions

### Progressive Enhancement
- **Core Functionality**: Works without JavaScript
- **Enhanced Experience**: JavaScript adds interactivity
- **Modern Features**: Use feature detection for new APIs

---

## Maintenance

### Regular Reviews
- **Quarterly**: Review color contrast and accessibility
- **Bi-annually**: Update component library
- **Annually**: Major design system updates

### Version Control
- **Semantic Versioning**: Major.Minor.Patch for design system
- **Change Log**: Document all modifications
- **Migration Guides**: Provide upgrade instructions

---

## Resources

### Tools
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **React Query**: Data fetching and caching
- **Wouter**: Lightweight routing

### References
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs)

---

**Last Updated**: September 2025
**Version**: 1.0.0
