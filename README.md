# IsThatSlop.com

A community-driven database for identifying and evaluating whether content sources are AI-generated or human-created. Users submit **claims** of AI usage they discover, and sources are scored algorithmically based on aggregated evidence.

## About

IsThatSlop.com addresses the growing need for transparency in AI-generated content across the internet. Inspired by [ProtonDB's](https://www.protondb.com/) community scoring model, the platform enables users to collaboratively verify content authenticity.

Unlike traditional rating systems where users vote on a score directly, IsThatSlop uses a **claims-based model**: users act as investigators reporting evidence of AI usage, not judges giving verdicts. Each claim includes an impact level (how much the AI affects the content) and confidence level (how certain the user is). The platform then calculates a tier algorithmically from all claims.

The site features a nostalgic Windows 95 aesthetic that celebrates the human-driven internet era.

**This project is being built in public.** We believe in practicing the transparency we preach, our code, decisions, and development process are all open for anyone to follow and scrutinize.

## How It Works

### Claims-Based Scoring

Instead of voting on tiers directly, users submit **claims** when they find AI usage:

1. **Description**: What AI usage was found (100-2000 characters)
2. **Impact** (1-5): How much the AI affects the content
   - 1 = Cosmetic (cover images, decorative elements)
   - 5 = Pervasive (core content fundamentally compromised)
3. **Confidence** (1-5): How certain you are it's AI
   - 1 = Speculative (gut feeling)
   - 5 = Confirmed (watermark, admission, definitive proof)
4. **Evidence** (optional): Screenshots, links, tool results

### The 5-Tier Scale

Tiers are calculated from aggregated claims, not voted directly:

| Tier | Name         | Description                                  |
| ---- | ------------ | -------------------------------------------- |
| 0    | Artisanal    | No credible claims, or all claims dismissed  |
| 1    | Mostly Human | Minor cosmetic AI usage or low-impact claims |
| 2    | Questionable | Significant claims with moderate confidence  |
| 3    | Compromised  | Strong evidence of substantial AI usage      |
| 4    | Slop         | Pervasive AI usage with high confidence      |

### Hierarchical Sources

Sources are organized hierarchically (up to 5 levels deep):

```
Website (e.g., Medium)
└── Publication (e.g., Better Marketing)
    └── Author (e.g., @writer123)
        └── Article (specific post)
```

Child scores influence parent scores, so a platform's tier reflects its overall content.

## Tech Stack

- **Runtime**: Bun 1.3.3
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: better-auth
- **Build**: Turborepo
- **UI**: Windows 95 aesthetic with Base UI and Radix UI

## Project Structure

```
apps/
  web/          # Next.js web application (App Router)
  extension/    # Browser extension (planned)
packages/
  database/     # Drizzle ORM schema and client
  eslint-config/
  typescript-config/
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3.3
- [Docker](https://www.docker.com/) (for local PostgreSQL)

### Setup

```bash
# Install dependencies
bun install

# Start PostgreSQL
bun run compose:up

# Run database migrations
bun run db:migrate

# Start development server
bun run dev
```

### Commands

```bash
bun run dev           # Start development server
bun run build         # Build all apps and packages
bun run lint          # Run ESLint
bun run format        # Run Prettier
bun run check-types   # TypeScript type checking
bun run db:generate   # Generate Drizzle migrations
bun run db:migrate    # Run database migrations
```

## Contributing

We're building this project in the open and welcome feedback, ideas, and suggestions. If you have thoughts on the scoring system, feature requests, or ways to improve the platform, we'd love to hear from you.

For bug reports and feature requests, check [existing issues](https://github.com/carlesonielfa/isthatslop/issues) first, then open a new one if needed. Pull requests for bug fixes and improvements are welcome.

For questions and discussions, use [GitHub Discussions](https://github.com/carlesonielfa/isthatslop/discussions).

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).

This means:

- You can use, modify, and distribute this software
- If you run a modified version as a network service, you must make your source code available
- Any derivative work must also be licensed under AGPL-3.0

## Acknowledgments

- Inspired by [ProtonDB](https://www.protondb.com/) for the community-driven rating model
- Windows 95 aesthetic pays homage to a more human internet era
