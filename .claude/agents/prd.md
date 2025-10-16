# Product Requirements Document: 247-App - Trades Services Platform

## 1. Introduction

This document outlines the product requirements for transforming the existing "247-App" Uber clone into a comprehensive, on-demand trades services platform. The new platform will connect homeowners and business owners with a network of qualified and vetted tradespeople, including Electricians, Plumbers, Locksmiths, Gas Engineers, and Glazers.

## 2. Vision

To become the leading on-demand platform for reliable and trusted trades services, providing a seamless and efficient experience for both customers and tradespeople.

## 3. Goals

-   **For Customers:** To provide a fast, easy, and secure way to find and hire qualified tradespeople for their needs.
-   **For Tradespeople:** To provide a flexible and powerful platform to find new customers, manage their work, and grow their business.
-   **For the Platform:** To build a scalable and profitable business by connecting customers and tradespeople and taking a commission on each transaction.

## 4. User Personas

### 4.1. Customer: Sarah, the Homeowner

-   **Bio:** Sarah is a 35-year-old homeowner with a busy schedule. She values convenience and reliability.
-   **Needs:** When a home maintenance issue arises (e.g., a leaky faucet, a broken lock), she needs to find a qualified tradesperson quickly and easily. She wants to see reviews, get a clear price estimate, and pay securely through the app.
-   **Pain Points:** The traditional process of finding a tradesperson is time-consuming and stressful. It involves searching online, making multiple phone calls, and vetting contractors herself.

### 4.2. Tradesperson: John, the Electrician

-   **Bio:** John is a 45-year-old self-employed electrician with over 20 years of experience. He is skilled at his trade but not an expert in marketing or technology.
-   **Needs:** John wants to spend more time doing his job and less time finding new customers. He needs a platform that brings him qualified leads, allows him to manage his schedule, and handles payments for him.
-   **Pain Points:** John struggles with the administrative side of his business, including marketing, scheduling, and invoicing. He also wants to avoid the hassle of chasing payments.

## 5. Features

### 5.1. Customer-Facing Features

-   **User Registration and Profile:**
    -   Sign up with email, phone number, or social media.
    -   Create a profile with name, contact information, and address.
    -   Manage payment methods.
-   **Service Request:**
    -   Select a trade category (e.g., Plumbing, Electrical).
    -   Describe the problem with text and photos.
    -   Choose a preferred time slot (on-demand or scheduled).
-   **Tradesperson Selection:**
    -   View a list of available tradespeople on a map.
    -   Filter tradespeople by distance, rating, and price.
    -   View detailed tradesperson profiles with reviews, certifications, and portfolio.
-   **Booking and Payment:**
    -   Book a tradesperson and receive a confirmation.
    -   Pay securely through the app using a credit card or other payment methods.
    -   Receive an invoice after the job is completed.
-   **Real-time Tracking and Communication:**
    -   Track the tradesperson's location and ETA in real-time.
    -   Communicate with the tradesperson through in-app messaging.
    -   Receive push notifications for job status updates.
-   **Reviews and Ratings:**
    -   Rate and review the tradesperson after the job is completed.

### 5.2. Tradesperson-Facing Features

-   **Registration and Onboarding:**
    -   Sign up and create a detailed profile with business information, trade specializations, and service areas.
    -   Upload certifications, licenses, and insurance documents for verification.
-   **Availability Management:**
    -   Set working hours and service areas.
    -   Toggle availability status (online/offline).
    -   Manage a calendar of upcoming jobs.
-   **Job Management:**
    -   Receive job requests with detailed descriptions.
    -   Accept or decline job requests.
    -   View a list of active and completed jobs.
-   **Dashboard and Earnings:**
    -   View a dashboard with key metrics, such as earnings, job completion rate, and average rating.
    -   Track earnings and receive payouts.
-   **Communication and Support:**
    -   Communicate with customers through in-app messaging.
    -   Access customer support for any issues.

### 5.3. Platform-Admin Features

-   **User Management:**
    -   View and manage all customer and tradesperson accounts.
    -   Verify tradesperson credentials and approve new accounts.
-   **Job Management:**
    -   Monitor all jobs on the platform.
    -   Resolve disputes between customers and tradespeople.
-   **Payment Management:**
    -   Track all transactions on the platform.
    -   Manage payouts to tradespeople.
-   **Analytics and Reporting:**
    -   View key platform metrics, such as revenue, user growth, and job volume.

## 6. Technical Requirements

-   **Frontend (Mobile App):**
    -   React Native with Expo
    -   React Navigation for routing
    -   Stripe for payment processing
    -   Real-time messaging with Firebase or Socket.io
    -   Push notifications
-   **Backend:**
    -   Node.js with Express or NestJS
    -   PostgreSQL for the primary database
    -   Redis for caching and session management
-   **Infrastructure:**
    -   AWS or Google Cloud Platform for hosting
    -   AWS S3 or Google Cloud Storage for file storage

## 7. Success Metrics

-   Number of active users (customers and tradespeople)
-   Number of completed jobs per month
-   Gross transaction value (GTV)
-   Customer and tradesperson satisfaction ratings

