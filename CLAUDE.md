# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IsThatSlop.com is a community database for rating AI-generated vs human-created content with a 5-tier scoring system. The project features a Windows 95 aesthetic theme.

## Development Commands

```bash
# Install dependencies (uses Bun, not npm/yarn)
bun install

# Start development server
bun run dev

# Build all apps and packages
bun run build

# Linting and formatting
bun run lint          # ESLint
bun run format        # Prettier
bun run check-types   # TypeScript type checking

# Database operations
bun run db:generate   # Generate Drizzle migrations from schema
bun run db:migrate    # Run database migrations

# Docker (PostgreSQL for local dev)
bun run compose:up    # Start PostgreSQL container
bun run compose:down  # Stop PostgreSQL container
```

## Architecture

This is a Turborepo monorepo with the following structure:

### Apps
- **apps/web**: Next.js 16 frontend with React 19, using the App Router

### Packages
- **packages/database**: Drizzle ORM with PostgreSQL - contains schema definitions and database client
- **packages/eslint-config**: Shared ESLint configurations (base, next, react-internal)
- **packages/typescript-config**: Shared TypeScript configurations

### Key Files
- `turbo.json`: Turborepo task configuration
- `packages/database/src/schema.ts`: Database schema definitions
- `packages/database/drizzle.config.ts`: Drizzle ORM configuration
- `apps/web/components/ui/`: Shadcn-style component library with Windows 95 theme
- `docs/MVP.md`: Comprehensive project specification

## Tech Stack

- **Runtime**: Bun 1.3.3, Node.js >=18
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Base UI, Radix UI
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: better-auth
- **Build**: Turborepo

## Database

Schema uses Drizzle ORM with PostgreSQL. Current tables: user, session, account, verification (better-auth tables).

Environment variable required: `DATABASE_URL`

## UI Components

Components in `apps/web/components/ui/` follow a Windows 95 aesthetic with:
- 3D beveled buttons
- Sunken text inputs
- Window-style cards with title bars
- Class Variance Authority (CVA) for variant composition

## Project Notes

* After any notable changes to the code, run `bun format` `bun lint` and `bun check-types` to ensure code quality.