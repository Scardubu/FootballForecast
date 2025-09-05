# Overview

SabiScore Analytics is a real-time football (soccer) analytics platform that provides live match tracking, AI-powered predictions, team performance insights, and data visualizations. The application focuses on delivering comprehensive football statistics and analysis through an intuitive web interface, integrating with the API-Football service to fetch live match data, standings, team information, and other football-related content.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built using React with TypeScript, utilizing a modern component-based architecture. The application uses Vite as the build tool and development server, providing fast hot module replacement and optimized builds. The UI is implemented with shadcn/ui components built on top of Radix UI primitives, ensuring accessibility and consistent design patterns.

The client-side routing is handled by Wouter, a lightweight routing solution. State management is handled through React Query (TanStack Query) for server state management, which provides caching, background updates, and optimistic updates for football data.

The styling approach uses Tailwind CSS with CSS variables for theming, allowing for easy customization of colors and design tokens. The application supports both light and dark themes through CSS custom properties.

## Backend Architecture

The backend is built with Express.js running on Node.js, providing a REST API architecture. The server implements middleware for request logging, JSON parsing, and error handling. The application uses a custom storage abstraction layer that currently implements in-memory storage but can be extended to support persistent databases.

The server integrates with the API-Football service through HTTP requests to fetch real-time football data including live fixtures, team information, league standings, and match predictions. The integration includes proper error handling and rate limiting considerations.

## Data Storage Solutions

The application uses Drizzle ORM with PostgreSQL as the primary database solution. The database schema includes tables for users, leagues, teams, fixtures, predictions, standings, and team statistics. The schema is defined with proper relationships and constraints to ensure data integrity.

Currently, the storage layer includes both in-memory storage (for development/testing) and database integration capabilities. The Drizzle configuration points to PostgreSQL with connection pooling through Neon Database serverless driver.

## Authentication and Authorization

The application includes a basic user system with username/password authentication. User sessions are managed through the storage layer, though the current implementation appears to be in early development stages without full session management middleware.

## External Service Integrations

The primary external integration is with API-Football (RapidAPI), which provides comprehensive football data including:
- Live match fixtures and scores
- Team information and statistics
- League standings and tournament data
- Match predictions and analytics
- Historical match data

The integration includes proper API key management through environment variables and error handling for API failures. The application implements real-time updates by polling the live fixtures endpoint at regular intervals.