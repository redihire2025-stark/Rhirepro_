# RhirePro - Developer Navigation Guide

A comprehensive guide to help developers understand the project architecture, locate specific functionality, and navigate the codebase efficiently.

---

## 📋 Project Overview

**Project Name:** RhirePro   
**Type:** React + TypeScript Job Portal Application  
**Build Tool:** Vite  
**Framework:** React 18.3.1  
**UI Library:** Radix UI + Tailwind CSS  
**Authentication:** Firebase  
**State Management:** React Hooks

---

## 🏗️ Application Architecture

### Entry Point
- **File:** [src/main.tsx](src/main.tsx)
  - Renders React App into root DOM element
  - Single mounting point for entire application

### Root Component
- **File:** [src/App.tsx](src/App.tsx)
  - **Purpose:** Main router and state management for screen navigation
  - **Key State:**
    - `currentScreen`: Active screen/page state
    - `userType`: User type (jobseeker/recruiter/null)
    - `selectedJobId`: Currently viewed job ID
  - **Key Functions:**
    - `handleLogin()`: Sets user type and navigates to respective dashboard
    - `handleLogout()`: Clears user data and returns to landing
    - `handleViewJob()`: Sets selected job and navigates to details page
    - `handleNavigate()`: Generic screen navigation handler

---

## 📱 Screen Layouts & Navigation Flow

```
Landing Page
    ├─ Header (Navigation)
    ├─ Hero Section (Search)
    ├─ Stats Section
    ├─ Featured Jobs Grid
    ├─ Top Companies Section
    └─ Features/Benefits Section

Auth Screen
    ├─ Branding Section (Left Panel)
    └─ Auth Form (Right Panel)
        ├─ Login/Register Tabs
        ├─ User Type Selection (JobSeeker/Recruiter)
        └─ Form Fields

JobSeeker Dashboard
    ├─ Header (with user menu)
    ├─ Profile Overview Section
    ├─ Applied Jobs Tab
    ├─ Recommended Jobs Tab
    └─ Filters & Search

Recruiter Dashboard
    ├─ Header (with user menu)
    ├─ Quick Stats Section
    ├─ Posted Jobs Tab
    ├─ Candidates Tab
    ├─ Post New Job Dialog
    └─ Job Management Tools

Job Details Page
    ├─ Header (with back button)
    ├─ Job Header (Title, Company, Quick Info)
    ├─ Job Description Section
    ├─ Responsibilities List
    ├─ Requirements List
    ├─ Benefits Section
    ├─ Company Info Section
    └─ Similar Jobs Carousel

Profile Settings
    ├─ Header
    ├─ Personal Information Tab (JobSeeker/Recruiter)
    ├─ Experience Tab (JobSeeker)
    ├─ Education Tab (JobSeeker)
    ├─ Certifications Tab (JobSeeker)
    ├─ Company Profile Tab (Recruiter)
    ├─ Subscription Tab (Recruiter)
    └─ Notifications & Privacy Settings
```

---

## 🎯 Main Components & Their Functionality

### 1. **Header Component**
- **File:** [src/components/Header.tsx](src/components/Header.tsx)
- **Purpose:** Navigation bar shown across all authenticated pages
- **Key Features:**
  - Logo & branding with navigation to landing
  - Dynamic nav links based on user type
  - Notifications bell (for logged-in users)
  - User profile dropdown menu
  - Mobile responsive menu with Sheet component
  - Logout functionality
- **Props:**
  - `userType`: Current user type for conditional rendering
  - `onNavigate`: Screen navigation callback
  - `onLogout`: Logout callback
  - `variant`: 'default' or 'compact' styling

### 2. **Landing Component**
- **File:** [src/components/Landing.tsx](src/components/Landing.tsx) (399 lines)
- **Purpose:** Home page visible to all users
- **Key Sections:**
  - **Hero Section:** Brand intro, search bar with location filter
  - **Stats Section:** Platform metrics (10k+ jobs, 5k+ companies, etc.)
  - **Featured Jobs:** 6 sample jobs in responsive grid
  - **Top Companies:** Grid showing top hiring companies
  - **Features Section:** Platform benefits highlighted
  - **CTA Section:** Call-to-action for registration
- **Key Data:**
  - `featuredJobs`: Array of 6 sample job postings
  - `topCompanies`: Array of 6 top companies
- **Interactivity:**
  - Search bar (placeholder implementation)
  - Job card click navigation to details
  - Company card interactions
- **Related UI Components:**
  - `Card`, `Input`, `Button`, `Badge`

### 3. **AuthScreen Component**
- **File:** [src/components/AuthScreen.tsx](src/components/AuthScreen.tsx) (363 lines)
- **Purpose:** Unified authentication screen for login/signup
- **Key Features:**
  - Left panel: Branding and benefits (desktop only)
  - Right panel: Authentication form
  - User type toggle (JobSeeker ↔ Recruiter)
  - Login/Register tab switching
  - Form validation (basic structure)
  - Social login integration point (Google Auth ready)
- **Key State:**
  - `isLogin`: Toggle between login and signup modes
  - `userType`: Selected user type
- **Form Fields:**
  - **Both modes:** Email, Password
  - **Signup only:** Full Name, Phone, Role/Company
- **Related Components:**
  - `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
  - `Input`, `Label`, `Checkbox`
  - `Card`, `CardHeader`, `CardTitle`
- **Firebase Integration Point:**
  - Commented code references Firebase auth
  - Ready for Google OAuth implementation

### 4. **JobSeekerDashboard Component**
- **File:** [src/components/JobSeekerDashboard.tsx](src/components/JobSeekerDashboard.tsx) (381 lines)
- **Purpose:** Main dashboard for job seekers
- **Key Sections:**
  - **Profile Overview Card:** Job seeker's profile summary
  - **Search & Filter Bar:** Find jobs by keyword/location
  - **Applied Jobs Tab:** Shows all applications with status
  - **Recommended Jobs Tab:** AI-matched job recommendations
  - **Profile Completion Card:** Motivates profile updates
- **Key Data:**
  - `appliedJobs`: Array of 3 sample applications
  - `recommendedJobs`: Array of 3 recommended positions
- **Job Application Statuses:**
  - Pending (Under Review)
  - Interview (Interview Scheduled)
  - Rejected (Not Selected)
- **Key State:**
  - `searchQuery`: Search input value
  - `locationFilter`: Location filter value
- **Interactive Elements:**
  - View Job Details button (calls `onViewJob`)
  - Filter and search functionality
  - Save job feature (UI ready, not implemented)
  - Apply now button (UI ready)
- **Related UI Components:**
  - `Tabs`, `Card`, `Badge`, `Progress`
  - `Input`, `Button`, `Icon components`

### 5. **RecruiterDashboard Component**
- **File:** [src/components/RecruiterDashboard.tsx](src/components/RecruiterDashboard.tsx) (448 lines)
- **Purpose:** Main dashboard for recruiters/employers
- **Key Sections:**
  - **Quick Stats:** Total openings, applications, team members
  - **Posted Jobs Tab:** List of all job postings with metrics
  - **Candidates Tab:** Pool of candidates with match scores
  - **Post New Job Dialog:** Modal form to add new job
- **Key Data:**
  - `postedJobs`: Array of 3 sample job postings
  - `candidates`: Array of 3 candidate profiles with skills
- **Job Metrics Displayed:**
  - Number of applicants
  - Job views count
  - Active/Closed status
  - Posted date
- **Candidate Information:**
  - Name, experience, location
  - Skills array
  - Applied position
  - Application status (New, Reviewed, Shortlisted)
  - Match score (0-100%)
- **Key Features:**
  - Post New Job button with dialog modal
  - Job listing with actions
  - Candidate filtering and sorting
  - View details / Contact candidate buttons
- **Related UI Components:**
  - `Dialog`, `DialogContent`, `DialogHeader`
  - `Tabs`, `Card`, `Badge`
  - `Select`, `Textarea`, `Label`

### 6. **JobDetailsPage Component**
- **File:** [src/components/JobDetailsPage.tsx](src/components/JobDetailsPage.tsx) (388 lines)
- **Purpose:** Detailed job information and application page
- **Key Sections:**
  - **Job Header:** Title, company, location, salary, job type
  - **Quick Info:** Experience required, applications count
  - **Job Description:** Detailed description text
  - **Responsibilities:** Bullet-point list of duties
  - **Requirements:** Required skills and experience
  - **Skills Tags:** Technology stack
  - **Benefits:** Compensation and perks list
  - **Company Info:** Company details and description
  - **Similar Jobs:** Carousel of related positions
- **Key Data Structure:**
  - `jobDetails`: Complete job posting object
  - `similarJobs`: Related job postings array
- **Actions Available:**
  - Back button (context-aware)
  - Apply Now button (if job seeker)
  - Save/Bookmark button
  - Share job button
- **Related UI Components:**
  - `Card`, `Badge`, `Button`
  - `Separator`, `Icon components`

### 7. **ProfileSettings Component**
- **File:** [src/components/ProfileSettings.tsx](src/components/ProfileSettings.tsx) (1199 lines)
- **Purpose:** Comprehensive profile management for both user types
- **Key Sections (JobSeeker):**
  - **Personal Information:** Name, email, phone, location, bio
  - **Experience Tab:** 
    - Add/Edit/Delete work experience
    - Designation, company, dates, location, description
    - Current job indicator
  - **Education Tab:**
    - Add/Edit/Delete educational credentials
    - Degree, college, graduation year
  - **Certifications Tab:**
    - Add/Edit/Delete certifications
    - Certificate name, year, upload capability
  - **Skills Tab:**
    - Add/Remove skills
    - Visual badge display
  - **Privacy & Notifications:**
    - Email notification preferences
    - Profile visibility settings
- **Key Sections (Recruiter):**
  - **Company Profile:**
    - Company name, size, industry
    - Website URL, description
    - Company logo upload
  - **Subscription/Plans:**
    - Active subscription tier
    - Job posting limits
    - Candidate view limits
  - **Settings:**
    - Notification preferences
    - Privacy settings
- **Key State Management:**
  - `skills`: Array of skill strings
  - `experiences`: Array of experience objects
  - `educations`: Array of education objects
  - `certifications`: Array of certification objects
  - Dialog states for add/edit modals
- **Form Components:**
  - Multiple modal dialogs for add/edit
  - Form validation (structure ready)
  - File upload inputs
- **Related UI Components:**
  - `Tabs`, `Dialog`, `Card`
  - `Input`, `Textarea`, `Label`
  - `Button`, `Badge`, `Switch`
  - `Select`, `DatePicker` (integrated with react-day-picker)

---

## 🎨 UI Component Library

All reusable UI components are located in [src/components/ui/](src/components/ui/)

### Core Components
| Component | File | Purpose |
|-----------|------|---------|
| Button | `button.tsx` | CTA buttons with variants |
| Input | `input.tsx` | Text input fields |
| Card | `card.tsx` | Content containers |
| Badge | `badge.tsx` | Tags and labels |
| Tabs | `tabs.tsx` | Tabbed navigation |
| Dialog | `dialog.tsx` | Modal dialogs |
| Select | `select.tsx` | Dropdown selections |
| Checkbox | `checkbox.tsx` | Boolean toggles |
| Switch | `switch.tsx` | On/off toggles |
| Label | `label.tsx` | Form labels |
| Textarea | `textarea.tsx` | Multi-line text input |

### Navigation Components
| Component | File | Purpose |
|-----------|------|---------|
| Breadcrumb | `breadcrumb.tsx` | Navigation path |
| Dropdown Menu | `dropdown-menu.tsx` | Dropdown menus |
| Context Menu | `context-menu.tsx` | Right-click menus |
| Navigation Menu | `navigation-menu.tsx` | Main navigation |
| Sidebar | `sidebar.tsx` | Side navigation panel |

### Display Components
| Component | File | Purpose |
|-----------|------|---------|
| Avatar | `avatar.tsx` | User profile images |
| Badge | `badge.tsx` | Status badges |
| Progress | `progress.tsx` | Progress bars |
| Skeleton | `skeleton.tsx` | Loading placeholders |
| Carousel | `carousel.tsx` | Image/content carousel |
| Table | `table.tsx` | Data tables |
| Accordion | `accordion.tsx` | Collapsible sections |

### Utility Components
| Component | File | Purpose |
|-----------|------|---------|
| Form | `form.tsx` | React Hook Form integration |
| Popover | `popover.tsx` | Popover tooltips |
| Tooltip | `tooltip.tsx` | Hover tooltips |
| Hover Card | `hover-card.tsx` | Info on hover |
| Separator | `separator.tsx` | Visual dividers |

### Specialized Components
| Component | File | Purpose |
|-----------|------|---------|
| Chart | `chart.tsx` | Recharts wrapper |
| Calendar | `calendar.tsx` | Date picker |
| Input OTP | `input-otp.tsx` | OTP verification |
| Slider | `slider.tsx` | Range sliders |
| Toggle | `toggle.tsx` | Button toggles |
| Radio Group | `radio-group.tsx` | Radio selections |
| Sheet | `sheet.tsx` | Slide-out panels |
| Alert Dialog | `alert-dialog.tsx` | Confirmation dialogs |
| Collapsible | `collapsible.tsx` | Expandable sections |
| Resizable | `resizable.tsx` | Resizable panels |
| Scroll Area | `scroll-area.tsx` | Custom scrollbars |
| Sonner | `sonner.tsx` | Toast notifications |

### Utilities & Hooks
| File | Purpose |
|------|---------|
| `utils.ts` | Utility functions (tailwind merging, class names) |
| `use-mobile.ts` | Mobile detection hook |

---

## 🔧 Core Technologies & Integration Points

### Frontend Framework
- **React 18.3.1** with TypeScript
- **Vite** build tool
- **Tailwind CSS** for styling

### UI & Design
- **Radix UI** - Unstyled, accessible component primitives
- **Lucide React** - Icon library (0.487.0)
- **Recharts** - Chart/visualization library
- **Embla Carousel** - Carousel component
- **Class Variance Authority** - CSS class utilities

### State & Forms
- **React Hooks** - useState, useContext for state management
- **React Hook Form** - Form state and validation
- **Next Themes** - Dark mode support (framework included)

### User Input/Output
- **Input OTP** - OTP input components
- **React Day Picker** - Date selection
- **Sonner** - Toast notifications
- **Vaul** - Drawer/modal animations

### Backend & Services
- **Firebase** - Authentication
  - Configuration: [src/firebase.js](src/firebase.js)
  - Google Auth integration (ready but commented)
  - Features available: Auth, Firestore, Storage

### Responsive Design
- Mobile-first approach with Tailwind CSS
- Sheet component for mobile menus
- Responsive grid layouts

---

## 📂 Project File Structure

```
src/
├── main.tsx                 # React DOM mount point
├── App.tsx                  # Root component with navigation routing
├── index.css               # Global styles (Tailwind imports)
├── firebase.js             # Firebase configuration & auth setup
│
├── components/
│   ├── Landing.tsx         # Home/landing page
│   ├── AuthScreen.tsx      # Login/signup page
│   ├── Header.tsx          # Navigation header (reusable)
│   ├── JobSeekerDashboard.tsx   # Job seeker main page
│   ├── RecruiterDashboard.tsx   # Recruiter main page
│   ├── JobDetailsPage.tsx  # Job detail view
│   ├── ProfileSettings.tsx # User profile/settings page
│   │
│   ├── figma/
│   │   └── ImageWithFallback.tsx  # Image component with fallback
│   │
│   └── ui/                 # Reusable UI components (see UI Components table above)
│       ├── accordion.tsx
│       ├── alert-dialog.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── ... (40+ more UI components)
│       └── utils.ts
│
├── guidelines/
│   └── Guidelines.md       # Design guidelines
│
├── styles/
│   └── globals.css        # Global CSS with Tailwind directives
│
├── Attributions.md        # Attribution for design/assets
```

---

## 🔀 Data Flow & State Management

### Application State Flow
```
App (root state)
  ├── currentScreen → Screen display logic
  ├── userType → Conditional rendering & navigation
  ├── selectedJobId → Job details page data
  │
  ├─→ Landing
  │     └── onNavigate → App.handleNavigate()
  │     └── onViewJob → App.handleViewJob()
  │
  ├─→ AuthScreen
  │     └── onLogin → App.handleLogin()
  │     └── onNavigate → App.handleNavigate()
  │
  ├─→ JobSeekerDashboard
  │     ├── onNavigate → App.handleNavigate()
  │     ├── onLogout → App.handleLogout()
  │     └── onViewJob → App.handleViewJob()
  │
  ├─→ RecruiterDashboard
  │     ├── onNavigate → App.handleNavigate()
  │     └── onLogout → App.handleLogout()
  │
  ├─→ JobDetailsPage
  │     ├── userType (read-only)
  │     ├── onNavigate → App.handleNavigate()
  │     └── onViewJob → App.handleViewJob()
  │
  └─→ ProfileSettings
        └── onNavigate → App.handleNavigate()
```

### Local Component State Examples
- **JobSeekerDashboard:** `searchQuery`, `locationFilter`
- **ProfileSettings:** `skills`, `experiences`, `educations`, `certifications`, dialog open states
- **RecruiterDashboard:** `isPostJobOpen` (modal state)
- **AuthScreen:** `isLogin`, `userType`

---

## 🎯 Feature Implementation Roadmap

### Currently Implemented (UI Only)
- ✅ Landing page with featured jobs display
- ✅ Authentication screen (UI structure)
- ✅ Job seeker dashboard layout
- ✅ Recruiter dashboard layout
- ✅ Job details page
- ✅ Profile settings for both user types
- ✅ Responsive design for mobile/tablet/desktop
- ✅ Reusable UI component library

### Ready for Implementation
- 🔧 **Authentication:** Firebase Google Auth (config present, needs activation)
- 🔧 **Backend Integration:** API endpoints for jobs, applications, profiles
- 🔧 **Search & Filtering:** Currently placeholder UI, needs backend logic
- 🔧 **Form Validation:** Structure present, needs implementation
- 🔧 **Data Persistence:** Firestore integration for database
- 🔧 **Notifications:** Toast notifications (Sonner component ready)
- 🔧 **File Uploads:** Resume, certificates, company logo upload
- 🔧 **Analytics:** Track user interactions and job applications

---

## 🚀 Quick Navigation Guide for Developers

### "I need to add a new page"
1. Create component file in `src/components/`
2. Add screen type to App.tsx `currentScreen` state
3. Add routing condition in App.tsx render
4. Add navigation handler in App.tsx

### "I need to modify the landing page"
→ Edit [src/components/Landing.tsx](src/components/Landing.tsx)
- Hero section: Lines ~69-125
- Featured jobs grid: Lines ~141-175
- Top companies: Lines ~176-215

### "I need to add form validation"
→ Use React Hook Form integration in:
- [src/components/ui/form.tsx](src/components/ui/form.tsx)
- Apply in AuthScreen or ProfileSettings components

### "I need to add a new UI component"
→ Create component in [src/components/ui/](src/components/ui/)
→ Follow Radix UI + Tailwind CSS pattern used in existing components

### "I need to connect to Firebase"
→ Reference [src/firebase.js](src/firebase.js)
→ Uncomment/implement auth functions in AuthScreen.tsx
→ Add Firestore/Storage calls as needed

### "I need to add dark mode support"
→ Next Themes is configured (in dependencies)
→ Extend Tailwind config with dark: variants
→ Apply `dark:` Tailwind classes to components

### "I need to handle errors and notifications"
→ Sonner toast component in [src/components/ui/sonner.tsx](src/components/ui/sonner.tsx)
→ Usage: `toast.error('message')` or `toast.success('message')`

### "I need to create responsive layouts"
→ Use Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
→ Grid system: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
→ Reference Landing.tsx for examples

---

## 🔐 Security & Best Practices

### Authentication
- Firebase auth ready in [src/firebase.js](src/firebase.js)
- Google OAuth configured but not activated
- Consider adding:
  - Session management
  - Token refresh logic
  - Secure cookie handling

### Form Security
- Input validation needed (structure present in ProfileSettings)
- CSRF protection on API calls
- Rate limiting for auth attempts

### Data Protection
- Never commit Firebase keys to version control
- Use environment variables for sensitive config
- Encrypt sensitive user data at rest

---

## 📚 Additional Resources

- **Figma Design:** https://www.figma.com/design/STWeQNwe6SHJ1BYZX1uq4k/Multi-Screen-UI-UX-Design
- **Radix UI Docs:** https://www.radix-ui.com/docs/primitives/overview/introduction
- **Tailwind CSS:** https://tailwindcss.com/docs
- **React Hook Form:** https://react-hook-form.com/
- **Firebase Docs:** https://firebase.google.com/docs

---

## 🔄 Common Development Tasks

### Running the Application
```bash
npm i              # Install dependencies
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Adding a New Job to Featured Jobs
→ Edit `featuredJobs` array in [src/components/Landing.tsx](src/components/Landing.tsx)
→ Add object with properties: `id`, `title`, `company`, `location`, `experience`, `salary`, `type`, `postedDays`, `logo`, `tags`

### Changing Button Styles
→ Edit [src/components/ui/button.tsx](src/components/ui/button.tsx)
→ Uses `class-variance-authority` for variants
→ Apply updated styles with `className` prop

### Customizing Colors
→ Tailwind classes use: `blue-600`, `teal-500`, `gray-50`, etc.
→ Update colors throughout by modifying Tailwind theme config
→ Current palette: Blues, Teals, Grays

---

**Last Updated:** January 21, 2026  
**Version:** 1.0  
**Maintainer:** Development Team
