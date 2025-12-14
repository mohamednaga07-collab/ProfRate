# College Doctor Rating Platform - Design Guidelines

## Design Approach: Material Design System (Academic Adaptation)
**Rationale:** Data-heavy academic platform requiring clear information hierarchy, trustworthy presentation, and efficient interaction patterns. Material Design provides the structured components needed for forms, data tables, and rating displays while maintaining professional credibility.

## Core Design Principles
1. **Academic Trust:** Clean, professional aesthetic that conveys credibility
2. **Data Clarity:** Information-first layouts with strong visual hierarchy
3. **Efficient Navigation:** Quick access to core functions (rate, compare, search)
4. **Anonymous Security:** Visual reassurance of privacy throughout rating flows

---

## Typography System

**Font Families:**
- Primary: Inter (headings, UI elements, data displays)
- Secondary: system-ui fallback for body text

**Hierarchy:**
- Page Titles: text-3xl font-bold (Doctor names, "Compare Doctors")
- Section Headers: text-xl font-semibold (Rating Categories, "Recent Reviews")
- Data Labels: text-sm font-medium uppercase tracking-wide (Factor names)
- Body Text: text-base (Reviews, descriptions)
- Metadata: text-sm text-gray-600 (Timestamps, review counts)
- Star Ratings: text-2xl for display, text-lg for interactive

---

## Layout System

**Spacing Primitives:** Tailwind units of 3, 4, 6, 8, 12 
- Component padding: p-6 or p-8
- Section spacing: space-y-8 or space-y-12
- Card margins: gap-6 in grids
- Form field spacing: space-y-4

**Grid Structure:**
- Login page: Single centered card (max-w-md)
- Doctor listing: Grid of cards (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Comparison view: Side-by-side layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Doctor profile: Two-column (rating summary left, reviews right on desktop)

---

## Component Library

### Authentication Pages

**Login Page:**
- Centered card layout (max-w-lg) with subtle shadow
- University/college logo at top (h-16)
- Role selection as prominent tab-style buttons (Admin | Student | Teacher)
- Email and password fields with clear labels
- "Forgot Password?" link below password field (text-sm, right-aligned)
- Primary login button (full-width, h-12)
- "New here? Register" link at bottom
- No background image - clean, focused design

**Registration Page:**
- Similar card layout to login
- Role selection as required first step (radio buttons with icons)
- Fields: Full Name, Email, Student/Employee ID, Password, Confirm Password
- Terms acceptance checkbox
- "Already have an account?" link

### Doctor Listing Page

**Layout:**
- Search bar at top (sticky, with filters dropdown)
- Sort options: Overall Rating, Number of Reviews, Department
- Doctor cards in responsive grid
- Each card shows: Profile placeholder, Name, Department, Overall star rating (large), Total reviews count, Quick stats bar (5 mini-graphs for each factor)

**Doctor Card Structure:**
- Compact rectangular cards (not square)
- 2-line name truncation with department below
- Prominent star rating display (gold stars, number out of 5)
- "View Profile" and "Compare" action buttons at bottom

### Doctor Profile Page

**Hero Section:**
- Full-width header with doctor name, department, title
- Large star rating display with breakdown
- "Write Review" CTA button (prominent, right-aligned)

**Rating Breakdown Section:**
- Horizontal bar charts for each of 5 factors
- Factor names left, bars middle, numerical ratings right
- Visual distinction between factors (different bar lengths)

**Reviews Section:**
- Anonymous review cards in chronological order
- Each review shows: Star rating, 5-factor individual ratings, written feedback, timestamp
- "Helpful" vote counter on each review

### Comparison Page

**Layout:**
- Side-by-side doctor columns (2-3 doctors max on desktop)
- Sticky header with doctor names
- Synchronized scrolling sections:
  - Overall ratings
  - Factor-by-factor comparison (side-by-side bars)
  - Review highlights
- Visual highlighting of highest/lowest ratings

### Review Submission Form

**Structure:**
- Modal overlay or dedicated page
- Anonymous badge at top ("Your review is completely anonymous")
- 5 factor rating sliders/star pickers (one per row)
- Optional text review (large textarea)
- Submission guidelines reminder
- "Submit Review" button (disabled until all factors rated)

---

## Rating Display Components

**5-Factor Rating System:**
Factor examples: Teaching Quality, Availability, Communication, Subject Knowledge, Fairness

**Visual Treatment:**
- Interactive star rating (clickable, hover states)
- Bar chart representation in comparisons
- Numerical display (e.g., "4.2/5.0")
- Small inline stars for list views
- Large prominent stars for profile headers

---

## Navigation Structure

**Top Navigation:**
- Logo/University name (left)
- Search doctors (center, expandable)
- "Rate a Doctor" | "Compare" | "My Reviews" links
- User profile dropdown (right) with role indicator

**Role-Based Access:**
- Students: Rate, review, compare, view
- Teachers: View only (no rating ability)
- Admins: All above + manage reviews, user management link

---

## Data Visualization

**Rating Aggregation:**
- Horizontal progress bars with percentage fills
- Colored indicators (excellent: green zone, poor: red zone)
- Review count badges
- Trend indicators (up/down arrows for rating changes)

**Comparison Charts:**
- Radar/spider charts for multi-factor comparison
- Side-by-side bar comparisons
- Highlighted winner/loser in each category

---

## Forms & Interactions

**Input Fields:**
- Floating labels or top-aligned labels
- Clear focus states (border highlight)
- Inline validation messages
- Required field indicators

**Buttons:**
- Primary actions: Solid fill, medium height (h-10 or h-12)
- Secondary actions: Outlined or ghost style
- Destructive actions: Distinct treatment for delete/remove

**Loading States:**
- Skeleton screens for doctor cards
- Spinner for form submissions
- Progress indicators for multi-step processes

---

## Responsive Behavior

**Mobile:**
- Stacked single-column layouts
- Collapsible filters
- Bottom sheet for quick actions
- Simplified comparison (1-2 doctors max, swipeable)

**Desktop:**
- Multi-column grids maximize screen real estate
- Persistent filters sidebar
- Expanded comparison views (up to 3 doctors)

---

## Images

**No large hero images required** - this is a functional, data-focused platform.

**Profile Placeholders:**
- Generic avatar icons for doctor profiles (circular, 96x96px for profile, 64x64px for cards)
- University logo in header (SVG preferred, h-12 to h-16)

**Icons:**
Use Heroicons throughout:
- Star (rating displays)
- UserCircle (profiles)
- ChartBar (comparisons)
- MagnifyingGlass (search)
- LockClosed (password fields, anonymous indicator)
- CheckCircle (successful submissions)

---

## Accessibility

- Maintain WCAG AA contrast ratios
- Keyboard navigation for all interactive elements
- Screen reader labels for star ratings and data visualizations
- Focus indicators on all form fields and buttons
- Semantic HTML for data tables and rating displays