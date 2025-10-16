# 247-App Repository File Structure

## Complete Directory Tree

This document provides a comprehensive view of the current repository structure, including all files and directories. This structure represents the Uber clone foundation that will be adapted for the trades services platform.

```
247-App/
├── .eslintrc                          # ESLint configuration for code quality
├── .gitignore                         # Git ignore patterns
├── .prettierignore                    # Prettier ignore patterns
├── .watchmanconfig                    # Watchman configuration for file watching
├── App.js                             # Main application entry point
├── README.md                          # Project documentation
├── app.json                           # Expo application configuration
├── babel.config.js                    # Babel transpiler configuration
├── package.json                       # NPM dependencies and scripts
├── yarn.lock                          # Yarn dependency lock file
│
├── screenshots/                       # Application screenshots
│   ├── screenshare-3.png             # Multi-screen showcase
│   └── screenshot-v0.0.1.jpg         # Version 0.0.1 screenshot
│
└── src/                              # Source code directory
    │
    ├── assets/                       # Static assets
    │   ├── fonts/                    # Custom font files
    │   │   ├── uber-bold.ttf        # Uber brand bold font
    │   │   ├── uber-medium.ttf      # Uber brand medium font
    │   │   └── uber-regular.ttf     # Uber brand regular font
    │   │
    │   ├── images/                   # Image assets
    │   │   ├── bike-lg.jpg          # Large bike image for selection
    │   │   ├── bike-sm.jpg          # Small bike icon
    │   │   ├── car-lg.jpg           # Large car image for selection
    │   │   ├── car-sm.jpg           # Small car icon
    │   │   ├── icon-qr-bike.png     # QR code bike icon
    │   │   ├── icon-qr-code.png     # QR code scanner icon
    │   │   ├── icon-qr-flashlight.png # QR flashlight icon
    │   │   ├── icon-qr-id-code.png  # QR ID code icon
    │   │   ├── icon-qr-scooter.png  # QR scooter icon
    │   │   └── user.jpg             # Default user avatar
    │   │
    │   ├── icon.png                  # App icon
    │   └── splash.png                # Splash screen image
    │
    ├── components/                   # Reusable React components
    │   ├── CustomDrawerContent.js    # Custom drawer menu content
    │   ├── ModalBackdrop.js          # Modal backdrop overlay component
    │   ├── ModalHeader.js            # Modal header with close button
    │   ├── RequestRideType.js        # Ride type request button component
    │   ├── RideTypeItem.js           # Individual ride type selection item
    │   ├── SelectRideType.js         # Ride type selection modal
    │   ├── TouchIcon.js              # Touchable icon button component
    │   ├── TouchText.js              # Touchable text button component
    │   ├── WhereTo.js                # "Where to?" destination input component
    │   │
    │   └── icons/                    # SVG icon components
    │       ├── Svg.ArrowRight.js    # Right arrow icon
    │       ├── Svg.CheckShield.js   # Check shield icon (safety)
    │       ├── Svg.ChevronDown.js   # Chevron down icon
    │       ├── Svg.ChevronRight.js  # Chevron right icon
    │       ├── Svg.Close.js         # Close/X icon
    │       ├── Svg.Menu.js          # Hamburger menu icon
    │       ├── Svg.QRCode.js        # QR code icon
    │       └── Svg.Truck.js         # Truck/delivery icon
    │
    ├── constants/                    # Application constants and utilities
    │   ├── colors.js                 # Color palette definitions
    │   ├── device.js                 # Device detection utilities
    │   ├── fonts.js                  # Font family definitions
    │   ├── functions.js              # Utility functions (asset loading)
    │   ├── globalStyles.js           # Global style definitions
    │   ├── index.js                  # Constants barrel export
    │   ├── preloadFonts.js          # Font preloading configuration
    │   └── preloadImages.js         # Image preloading configuration
    │
    ├── navigation/                   # Navigation configuration
    │   ├── DrawerStack.js           # Drawer navigation setup
    │   └── RootStack.js             # Root stack navigator with modals
    │
    └── screens/                      # Screen components
        ├── Home.js                   # Main home screen with map
        ├── ModalHelp.js             # Help modal screen
        ├── ModalQRCode.js           # QR code scanner modal
        └── ModalTutorialBike.js     # Bike tutorial modal
```

## Directory Structure Analysis

### Root Level Files

The root level contains essential configuration files that define the project's build process, dependencies, and development environment. The **App.js** file serves as the application entry point, initializing the navigation structure and handling asset preloading. The **package.json** defines all project dependencies and available scripts for development, while **app.json** contains Expo-specific configuration including app name, version, and platform settings.

### Source Directory (`src/`)

The source directory is organized into logical subdirectories following React Native best practices. This structure separates concerns and makes the codebase maintainable and scalable.

#### Assets (`src/assets/`)

The assets directory contains all static resources used throughout the application. Custom fonts provide brand-specific typography, while images include both functional icons and decorative elements. The current assets are Uber-branded and will need to be replaced with trades-specific imagery and branding.

#### Components (`src/components/`)

This directory houses reusable UI components that can be composed to build screens. The current components are focused on the ride-hailing use case but demonstrate good component design patterns. The **icons** subdirectory contains SVG-based icon components, which is a best practice for scalable vector graphics in React Native.

#### Constants (`src/constants/`)

Constants provide centralized definitions for values used throughout the app. The **colors.js** file defines the color palette, **fonts.js** specifies font families, and **device.js** contains utilities for detecting device characteristics like screen size and iPhone notch. The **functions.js** file includes utility functions, particularly for asset preloading.

#### Navigation (`src/navigation/`)

The navigation directory defines the app's navigation structure using React Navigation v6. The **RootStack.js** sets up the main navigation container with modal presentations, while **DrawerStack.js** configures the drawer menu navigation. This two-level navigation structure provides flexibility for both standard screen transitions and modal overlays.

#### Screens (`src/screens/`)

Screens represent full-page views in the application. The current implementation has only four screens: a main **Home** screen with map functionality, and three modal screens for help, QR scanning, and bike tutorials. A trades platform will require significantly more screens for features like job management, profiles, messaging, and dashboards.

## File Count Summary

| Category | Count | Notes |
|----------|-------|-------|
| JavaScript Files | 33 | All application code is in JavaScript |
| Configuration Files | 6 | Build and linting configuration |
| Font Files | 3 | Custom Uber brand fonts |
| Image Files | 11 | Icons and UI images |
| Documentation | 1 | README.md |
| **Total Files** | **54** | Excluding node_modules and .git |

## Key Files for Modification

When adapting this repository for the trades platform, the following files will require significant modification or replacement:

### Critical Modifications Required

**App.js** - While the basic structure can remain, the asset preloading will need to include trades-specific fonts and images.

**app.json** - Must be updated with new app name, slug, description, and branding assets specific to the trades platform.

**package.json** - Will require additional dependencies for payment processing (Stripe), messaging, notifications, and backend communication.

**src/screens/Home.js** - Requires complete redesign to show available tradespeople instead of ride options, and job request functionality instead of destination input.

**src/components/WhereTo.js** - Should be replaced with a job request component allowing customers to describe their service needs.

**src/components/SelectRideType.js** - Can be adapted to select trade service categories (Electrician, Plumber, etc.) instead of ride types.

**src/navigation/DrawerStack.js** - Needs expansion to include additional screens for profiles, job history, messages, and settings.

### Reusable Files

**src/constants/device.js** - Can be used as-is for device detection.

**src/constants/globalStyles.js** - Provides a good pattern for global styles, though specific values will change.

**src/components/ModalBackdrop.js** - Generic modal backdrop component, fully reusable.

**src/components/ModalHeader.js** - Generic modal header, fully reusable.

**src/components/TouchIcon.js** - Generic touchable icon wrapper, fully reusable.

**src/components/TouchText.js** - Generic touchable text wrapper, fully reusable.

**src/navigation/RootStack.js** - Basic structure is reusable, but will need additional screen definitions.

## Recommended New Directory Structure

For the trades platform, the following additional directories and files should be created:

```
src/
├── api/                              # API communication layer
│   ├── auth.js                      # Authentication API calls
│   ├── jobs.js                      # Job management API calls
│   ├── payments.js                  # Payment API calls
│   ├── profiles.js                  # Profile API calls
│   └── reviews.js                   # Review API calls
│
├── contexts/                         # React Context providers
│   ├── AuthContext.js               # Authentication state
│   ├── JobContext.js                # Job state management
│   └── UserContext.js               # User profile state
│
├── hooks/                            # Custom React hooks
│   ├── useAuth.js                   # Authentication hook
│   ├── useJobs.js                   # Jobs management hook
│   └── useLocation.js               # Location tracking hook
│
├── models/                           # Data models and types
│   ├── Job.js                       # Job data model
│   ├── User.js                      # User data model
│   └── Review.js                    # Review data model
│
├── services/                         # Business logic services
│   ├── notificationService.js       # Push notifications
│   ├── paymentService.js            # Payment processing
│   └── messagingService.js          # Real-time messaging
│
├── utils/                            # Utility functions
│   ├── validation.js                # Form validation
│   ├── formatting.js                # Data formatting
│   └── dateHelpers.js               # Date utilities
│
└── screens/                          # Additional screens needed
    ├── auth/                         # Authentication screens
    │   ├── Login.js
    │   ├── Register.js
    │   └── ForgotPassword.js
    │
    ├── customer/                     # Customer-specific screens
    │   ├── JobRequest.js
    │   ├── JobDetails.js
    │   ├── JobHistory.js
    │   └── CustomerProfile.js
    │
    ├── tradesperson/                 # Tradesperson-specific screens
    │   ├── Dashboard.js
    │   ├── JobOffers.js
    │   ├── ActiveJobs.js
    │   ├── Availability.js
    │   ├── Earnings.js
    │   └── TradespersonProfile.js
    │
    └── shared/                       # Shared screens
        ├── Messages.js
        ├── Reviews.js
        ├── Settings.js
        └── Support.js
```

## Dependencies Analysis

### Current Dependencies (from package.json)

**Core Framework:**
- expo: ^45.0.0 (Framework for React Native development)
- react: 17.0.2 (React library)
- react-native: 0.68.1 (React Native framework)

**Navigation:**
- @react-navigation/drawer: ^6.4.1 (Drawer navigation)
- @react-navigation/native: ^6.0.10 (Navigation core)
- @react-navigation/native-stack: ^6.6.2 (Stack navigation)

**Maps & Location:**
- react-native-maps: 0.30.1 (Map component)
- expo-location: ~14.2.2 (Location services)

**UI & Utilities:**
- react-native-gesture-handler: ~2.2.0 (Gesture handling)
- react-native-reanimated: ~2.8.0 (Animations)
- react-native-svg: 12.3.0 (SVG support)
- expo-barcode-scanner: ~11.3.0 (QR code scanning)

### Required Additional Dependencies

For the trades platform, the following dependencies will need to be added:

**Payment Processing:**
- @stripe/stripe-react-native (Stripe payment integration)

**Backend Communication:**
- axios or fetch (HTTP client for API calls)
- @react-native-async-storage/async-storage (Local data persistence)

**Real-time Features:**
- socket.io-client (Real-time communication)
- @react-native-firebase/messaging (Push notifications)

**Forms & Validation:**
- formik or react-hook-form (Form management)
- yup (Schema validation)

**Image Handling:**
- react-native-image-picker (Camera and gallery access)
- react-native-image-crop-picker (Image cropping)

**Date & Time:**
- date-fns or moment (Date manipulation)
- react-native-calendars (Calendar component)

**State Management:**
- @reduxjs/toolkit or zustand (Global state management)

## Conclusion

The current file structure provides a clean, well-organized foundation following React Native and Expo best practices. However, the structure is minimal and will require significant expansion to support the complexity of a trades services platform. The existing organization patterns should be maintained and extended with additional directories for API communication, state management, business logic, and the numerous additional screens required for the platform's features.

The repository currently contains 54 files across 10 directories. A fully-featured trades platform will likely require 150-200+ files across 20-25 directories to accommodate all necessary features, screens, and supporting infrastructure.

