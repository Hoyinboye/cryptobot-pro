# CryptoBot Pro

## Overview

CryptoBot Pro is a full-stack AI-powered cryptocurrency trading platform that combines real-time market analysis with automated trading capabilities. The application features a React frontend with TypeScript, an Express.js backend, and PostgreSQL database integration through Drizzle ORM. Users can analyze market trends, receive AI-generated trading signals, execute trades through Kraken API integration, and manage their portfolios with comprehensive risk management tools.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design system
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Firebase Authentication for user management
- **Real-time Communication**: WebSocket integration for live market data updates

### Backend Architecture
- **Framework**: Express.js with TypeScript for API server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Firebase Admin SDK for token verification and user management
- **API Integration**: Kraken API for cryptocurrency trading and market data
- **Real-time Features**: WebSocket server for live price updates and notifications
- **Session Management**: PostgreSQL-based session storage with connect-pg-simple

### Database Design
- **Users Table**: Firebase UID mapping, API credentials, risk settings, demo/live mode flags
- **Portfolios Table**: User balance tracking, P&L calculations, trading statistics
- **Holdings Table**: Current positions with real-time value calculations
- **Trades Table**: Complete trading history with execution details and status tracking
- **AI Signals Table**: Machine learning predictions with confidence scores and recommendations
- **Trading Strategies Table**: User-defined automated trading rules and configurations

### External Dependencies

#### Third-party Services
- **Firebase**: User authentication and authorization management
- **Kraken API**: Cryptocurrency exchange integration for trading and market data
- **OpenAI API**: AI-powered market analysis and trading signal generation
- **Neon Database**: PostgreSQL hosting with serverless scaling

#### Key Libraries
- **Drizzle ORM**: Type-safe database queries and schema management
- **shadcn/ui**: Pre-built accessible UI components
- **TanStack Query**: Server state management and data synchronization
- **React Hook Form**: Form handling with Zod validation
- **WebSocket (ws)**: Real-time bidirectional communication
- **Radix UI**: Headless accessible component primitives

#### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Static type checking across the entire stack
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundling for production