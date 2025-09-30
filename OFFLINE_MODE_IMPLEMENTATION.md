# Offline Mode Implementation

## Overview

This document outlines the implementation of robust offline mode capabilities in the Football Forecast application. The offline mode ensures that the application remains functional even when the server is unavailable, providing a seamless user experience with graceful degradation.

## Key Features

1. **Automatic Server Status Detection**
   - Detects when the server is unavailable and switches to offline mode
   - Provides visual indicators to users when running in offline mode
   - Periodically checks for server availability to restore online functionality

2. **Mock Data Provider**
   - Provides realistic mock data for all critical API endpoints
   - Simulates network delays for a natural user experience
   - Maintains consistent data structure with the real API

3. **Enhanced Error Handling**
   - Graceful handling of network errors and timeouts
   - Informative error messages with troubleshooting guidance
   - Automatic retry logic with exponential backoff

4. **Resilient Component Loading**
   - Retry mechanism for lazy-loaded components
   - Fallback UI for components that fail to load
   - Offline indicators within components using mock data

## Implementation Details

### 1. Server Status Detection

The `DegradedModeBanner` component has been enhanced to:

- Detect server connectivity issues
- Store server status in localStorage
- Dispatch events when server status changes
- Provide troubleshooting guidance to users

### 2. Mock Data Provider

A new `mock-data-provider.ts` module provides:

- Mock implementations of all critical API endpoints
- Realistic data structures matching the real API
- Simulated network delays for a natural feel
- Helper methods to check offline status

### 3. Enhanced API Hook

The `useApi` hook has been updated to:

- Check for offline mode before making requests
- Use mock data when server is unavailable
- Add timeout handling to prevent hanging requests
- Implement retry logic with exponential backoff
- Switch to offline mode automatically when requests fail

### 4. Resilient Component Loading

The lazy loading mechanism has been improved to:

- Retry failed imports with configurable attempts
- Skip retries when in offline mode to avoid unnecessary network requests
- Provide informative error states when components fail to load
- Show offline indicators when using mock data

## Usage Guidelines

### For Developers

When implementing new features:

1. **API Endpoints**

   - Add corresponding mock implementations in `mock-data-provider.ts`
   - Use the `useApi` hook which handles offline mode automatically

2. **Components**

   - Use the `LazyWrapper` component for lazy-loaded components
   - Implement proper data validation (Array.isArray() checks)
   - Handle potential null/undefined values gracefully

3. **Testing Offline Mode**

   - Set `localStorage.setItem('serverStatus', 'offline')` to simulate offline mode
   - Dispatch `window.dispatchEvent(new Event('serverStatusChange'))` to notify components

### For Users

The application will:

- Automatically detect when the server is unavailable
- Show a banner with troubleshooting steps
- Continue to function with limited capabilities using cached and mock data
- Automatically reconnect when the server becomes available again

## Future Enhancements

1. **Offline Data Persistence**

   - Implement IndexedDB for more robust offline data storage
   - Add synchronization capabilities when coming back online

2. **Progressive Web App Features**

   - Service worker implementation for true offline capabilities
   - Push notifications for important updates

3. **Enhanced Mock Data**

   - More sophisticated mock data generation
   - User-configurable mock data scenarios for testing
