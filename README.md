# 247-App: On-Demand Trades Services Platform

[![React Native](https://img.shields.io/badge/React%20Native-0.68.1-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2045-000020.svg)](https://expo.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

247-App is a comprehensive on-demand trades services platform that connects homeowners and business owners with a network of qualified and verified tradespeople. Built with React Native and Expo, the platform provides a seamless mobile experience for both customers seeking services and tradespeople offering their expertise.

## What We Do

We connect customers with trusted professionals across multiple trades:

- **Electricians** - Electrical repairs, installations, and inspections
- **Plumbers** - Plumbing repairs, installations, and emergency services
- **Locksmiths** - Lock repairs, installations, and emergency lockout services
- **Gas Engineers** - Gas appliance installations, repairs, and safety checks
- **Glazers** - Window repairs, replacements, and installations

## Key Features

### For Customers

- **Easy Service Requests** - Describe your problem with text and photos, select your trade category, and get matched with available tradespeople
- **Real-time Tracking** - See your tradesperson's location and estimated arrival time
- **Secure Payments** - Pay safely through the app with Stripe integration
- **Reviews & Ratings** - Read reviews from other customers and rate your experience
- **Job History** - Access all your past service requests and invoices
- **In-app Messaging** - Communicate directly with your tradesperson

### For Tradespeople

- **Flexible Availability** - Set your working hours and toggle availability on/off
- **Job Management** - Accept or decline job offers, view your schedule, and manage active jobs
- **Earnings Dashboard** - Track your income, view analytics, and manage payouts
- **Professional Profile** - Showcase your certifications, licenses, and portfolio
- **Direct Communication** - Message customers and provide status updates
- **Verified Platform** - Build trust through our verification and review system

## Technology Stack

### Frontend (Mobile App)
- **React Native** - Cross-platform mobile development
- **Expo SDK 45** - Development framework and tooling
- **React Navigation v6** - Navigation and routing
- **react-native-maps** - Map integration with Google Maps
- **@stripe/stripe-react-native** - Payment processing
- **Firebase/Socket.io** - Real-time messaging and notifications

### Backend (Planned)
- **Node.js with Express/NestJS** - API server
- **PostgreSQL** - Primary database
- **Redis** - Caching and session management
- **Stripe API** - Payment processing
- **AWS S3/Google Cloud Storage** - File storage

## Project Status

🚧 **Currently in Development** 🚧

This project is being transformed from an Uber UI clone into a full-featured trades services platform. See the [Development Roadmap](./doc/03-development-roadmap.md) for detailed progress and timelines.

### Current Phase: Foundation and Infrastructure
- ✅ Repository structure established
- ✅ Documentation completed
- ✅ Claude Code agents configured
- 🔄 Backend API setup (in progress)
- 🔄 Database schema design (in progress)
- ⏳ Authentication system (planned)

## Getting Started

### Prerequisites

- Node.js 18 or newer
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- A Claude.ai or Claude Console account (for Claude Code development)

### Installation

```bash
# Clone the repository
git clone https://github.com/kelvincushman/247-App.git

# Navigate to the project directory
cd 247-App

# Install dependencies
yarn install
# or
npm install

# Start the development server
yarn dev
# or
npm start
```

### Running the App

```bash
# Run on iOS
yarn ios

# Run on Android
yarn android

# Run on web
yarn web
```

## Development with Claude Code

This project is optimized for development with Claude Code, an AI-powered coding assistant. All necessary configuration files and specialized agents are included.

### Starting Claude Code

```bash
# Navigate to the project directory
cd 247-App

# Start Claude Code
claude
```

### Available Agents

The project includes specialized agents for different development tasks:

- **senior-engineer** - Architecture and complex problem-solving
- **junior-engineer** - Feature implementation and bug fixes
- **git-expert** - Version control operations
- **security-analyst** - Security vulnerability scanning
- **expo-expert** - Expo configuration and troubleshooting
- **stripe-expert** - Payment integration
- **react-native-expert** - Performance optimization
- **documentation-writer** - Documentation maintenance
- **qa-engineer** - Testing and quality assurance
- **code-architect** - Code structure and file organization

See [claude.md](./claude.md) for detailed instructions and [.claude/agents/](./.claude/agents/) for agent definitions.

## Documentation

Comprehensive documentation is available in the [doc](./doc/) folder:

- **[Feature Comparison](./doc/01-feature-comparison.md)** - Current vs. required features analysis
- **[File Structure Tree](./doc/02-file-structure-tree.md)** - Complete codebase organization
- **[Development Roadmap](./doc/03-development-roadmap.md)** - Phased development plan with timelines
- **[Product Requirements](./doc/.claude/agents/prd.md)** - Detailed product requirements document

## Project Structure

```
247-App/
├── .claude/
│   └── agents/          # Claude Code agent definitions
├── doc/                 # Project documentation
├── src/
│   ├── assets/         # Images, fonts, and static files
│   ├── components/     # Reusable React components
│   ├── constants/      # App constants and configuration
│   ├── navigation/     # Navigation configuration
│   └── screens/        # Screen components
├── App.js              # Application entry point
├── app.json            # Expo configuration
├── claude.md           # Claude Code instructions
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the coding standards defined in `.eslintrc`
- Write tests for new features
- Update documentation as needed
- Use the appropriate Claude Code agent for your task
- Ensure all tests pass before submitting a PR

## Linting

```bash
# Run linting
yarn lint

# Fix linting issues automatically
yarn lint --fix
```

## Testing

```bash
# Run tests
yarn test

# Run tests with coverage
yarn test --coverage
```

## Roadmap

### Phase 1: Foundation (Weeks 1-8)
- Backend API infrastructure
- Database schema
- User authentication

### Phase 2: User Management (Weeks 9-14)
- Customer and tradesperson profiles
- Document verification system

### Phase 3: Job Management (Weeks 15-22)
- Service request creation
- Job matching and assignment
- Status tracking

### Phase 4: Payments (Weeks 23-27)
- Stripe integration
- Payment processing
- Invoicing and payouts

### Phase 5: Communication (Weeks 28-32)
- Real-time messaging
- Push notifications

See the [full roadmap](./doc/03-development-roadmap.md) for complete details.

## Security

Security is a top priority. We implement:

- Secure authentication with JWT tokens
- PCI-compliant payment processing via Stripe
- Encrypted data storage and transmission
- Regular security audits
- Tradesperson verification and background checks

Report security vulnerabilities to: [security contact to be added]

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- 📧 Email: [support email to be added]
- 💬 Discord: [discord link to be added]
- 📖 Documentation: [./doc/](./doc/)

## Acknowledgments

- Original Uber UI clone by [calebnance](https://github.com/calebnance/expo-uber)
- Built with [React Native](https://reactnative.dev/) and [Expo](https://expo.dev/)
- Payment processing by [Stripe](https://stripe.com/)

## Status Badges

![Build Status](https://img.shields.io/badge/build-pending-yellow)
![Tests](https://img.shields.io/badge/tests-pending-yellow)
![Coverage](https://img.shields.io/badge/coverage-0%25-red)
![Version](https://img.shields.io/badge/version-0.0.1-blue)

---

**Made with ❤️ for tradespeople and their customers**
