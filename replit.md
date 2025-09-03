# Overview

This is a field agent management system built with React, Express, and PostgreSQL. The application enables field agents to submit service reports for ATM maintenance and feeding operations, while managers can view and analyze all submissions. The system implements role-based access control with Replit OAuth authentication and provides real-time dashboards for operational oversight.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Replit OAuth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with role-based access control

## Database Design
- **Users Table**: Stores user profiles with role-based permissions (agent/manager)
- **Sessions Table**: Manages authentication sessions (required for Replit Auth)
- **Submissions Table**: Records field service submissions with foreign key relationships to users
- **Schema Validation**: Drizzle-Zod integration for type-safe database operations

## Authentication & Authorization
- **OAuth Provider**: Replit OpenID Connect for secure authentication
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Role-Based Access**: Agent and manager roles with different dashboard access
- **Route Protection**: Middleware-based authentication checks on all protected endpoints

## Data Flow & Business Logic
- **Agent Workflow**: Submit service reports (feeding/maintenance) with client and ATM details
- **Manager Workflow**: View all submissions with filtering and search capabilities
- **Real-time Updates**: Query invalidation ensures fresh data across user sessions
- **Data Validation**: Comprehensive validation using Zod schemas on both client and server

# External Dependencies

## Authentication Services
- **Replit OAuth**: Primary authentication provider using OpenID Connect protocol
- **Session Management**: PostgreSQL-based session storage with connect-pg-simple

## Database Infrastructure
- **PostgreSQL**: Primary database via Neon serverless with connection pooling
- **Database Migrations**: Drizzle Kit for schema management and migrations

## UI Component Libraries
- **Radix UI**: Headless component primitives for accessibility and functionality
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component system built on Radix UI

## Build & Development Tools
- **Vite**: Frontend build tool with React plugin and runtime error handling
- **TypeScript**: Type safety across the entire application stack
- **ESBuild**: Server-side bundling for production deployment
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing

## External APIs & Services
- **Replit Development**: Integration with Replit's development environment including banner injection and cartographer plugin for enhanced development experience