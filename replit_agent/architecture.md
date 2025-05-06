# Architecture Documentation

## Overview

This repository contains a full-stack web application with a Discord bot integration. The application is designed as a ticket management system, primarily focused on sports/football role-playing communities. Users can create tickets, categorize them, track their status, and interact with staff members through the Discord interface. The web application provides a dashboard to monitor and manage these tickets.

The system follows a client-server architecture with a clear separation between frontend and backend. It uses modern web technologies and follows a RESTful API design pattern.

## System Architecture

The application follows a three-tier architecture:

1. **Frontend**: React-based single-page application built with TypeScript
2. **Backend**: Node.js Express server that handles API requests and business logic
3. **Data Layer**: PostgreSQL database with Drizzle ORM for data persistence

Additionally, there's a Discord bot integration that provides an alternative interface to the system through Discord's messaging platform.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │   Database  │
│   (React)   │────▶│  (Express)  │────▶│ (PostgreSQL)│
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Discord Bot │
                    │  Interface  │
                    └─────────────┘
```

## Key Components

### Frontend

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Custom components built with Radix UI primitives and Tailwind CSS
- **State Management**: React Query for server state management
- **Routing**: Wouter for lightweight client-side routing

The frontend is organized into:
- Components (reusable UI elements)
- Pages (route-specific views)
- Contexts (shared state)
- Hooks (reusable logic)
- Lib (utility functions)

### Backend

- **Server**: Express.js running on Node.js
- **API**: RESTful endpoints for ticket and user management
- **Discord Integration**: Discord.js library for bot functionality
- **Authentication**: Session-based authentication (inferred from connection-pg-simple dependency)

The backend is organized into:
- Routes (API endpoint definitions)
- Storage (data access layer)
- Discord (bot command handlers and utilities)

### Database

- **Database**: PostgreSQL (via Neon Serverless PostgreSQL)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Defined in `shared/schema.ts` with tables for:
  - Users
  - Ticket categories
  - Tickets
  - Ticket responses
  - Funny auto-responses

### Discord Bot

- **Library**: Discord.js
- **Features**:
  - Ticket creation and management
  - Category-based ticket organization
  - Staff assignment and response handling
  - Automatic funny responses
  - Ticket logging and archiving

## Data Flow

### Ticket Creation Flow

1. User initiates ticket creation (either via web or Discord)
2. System presents category selection options
3. User provides ticket details and category
4. System creates ticket record in database
5. Discord bot creates a dedicated channel for the ticket
6. Staff members are notified about the new ticket
7. User and staff communicate within the ticket channel
8. Ticket is resolved and closed by staff

### Ticket Management Flow

1. Staff views open tickets via dashboard or Discord commands
2. Staff can assign tickets to themselves
3. Staff can respond to tickets, change status, or close tickets
4. System logs all activities related to tickets
5. Closed tickets are archived and accessible in ticket logs

## External Dependencies

### Frontend Dependencies

- **UI Components**: Multiple Radix UI packages (`@radix-ui/*`) for accessible UI primitives
- **Styling**: Tailwind CSS for utility-first styling
- **Data Fetching**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod for validation

### Backend Dependencies

- **Discord API**: Discord.js for bot functionality
- **Database**: @neondatabase/serverless for PostgreSQL connections
- **ORM**: Drizzle ORM for database operations
- **Session Management**: connect-pg-simple for PostgreSQL session storage
- **Date Handling**: date-fns for date formatting and calculations

## Deployment Strategy

The application is configured for deployment on Replit, a cloud development platform:

1. **Development Environment**:
   - Uses Replit's node-20 and postgresql-16 modules
   - Development server runs with `npm run dev`

2. **Production Build Process**:
   - Frontend: Vite builds the React application into static assets
   - Backend: esbuild bundles the server code
   - Combined artifacts are stored in the `dist` directory

3. **Production Runtime**:
   - Node.js server runs the bundled application
   - Server serves both the API endpoints and static frontend assets
   - Environment variables configure database connections and Discord token

4. **Database Management**:
   - Schema migrations using drizzle-kit
   - Seed scripts for initial data population

The deployment is configured for autoscaling on Replit's infrastructure, with automatic build and run commands defined in the `.replit` configuration file.

## Security Considerations

- **Environmental Security**: Sensitive configuration like database URLs and Discord tokens are stored as environment variables
- **API Security**: JSON requests are validated before processing
- **Discord Permissions**: The bot requires specific permissions for channel creation and management
- **Database Security**: Connection to PostgreSQL database uses secure connection strings

## Future Considerations

- **Authentication Improvements**: Implementing OAuth for Discord integration
- **Real-time Updates**: Adding WebSocket support for live ticket updates
- **Analytics**: Adding tracking for ticket resolution times and staff performance
- **Localization**: Supporting multiple languages for international communities