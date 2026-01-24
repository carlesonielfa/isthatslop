# IsThatSlop.com

A community-driven database for identifying and evaluating whether content sources are AI-generated or human-created. Rate sources on a 7-tier scale from "Pure Artisanal" to "Pure AI Slop."

## About

IsThatSlop.com addresses the growing need for transparency in AI-generated content across the internet. Inspired by [ProtonDB's](https://www.protondb.com/) community scoring model, the platform enables users to collaboratively verify content authenticity.

The site features a nostalgic Windows 95 aesthetic that celebrates the human-driven internet era.

**This project is being built in public.** Follow along as we develop a community-driven platform for content authenticity.

## The 7-Tier Scale

| Tier | Name                        | Description                                                   |
| ---- | --------------------------- | ------------------------------------------------------------- |
| 0    | Pure Artisanal              | Purely human-crafted, no AI involvement                       |
| 1    | Human (AI-Inspired)         | Human creates the work, AI provided initial inspiration       |
| 2    | Human (AI-Polished)         | Human-created with AI used only for polish/refinement         |
| 3    | Co-Created                  | Genuine collaboration with significant contribution from both |
| 4    | AI-Generated (Human-Guided) | AI creates with substantial human direction and curation      |
| 5    | AI-Generated (Light Edit)   | AI generates core content with minor human corrections        |
| 6    | Pure AI Slop                | Fully AI-generated with no human oversight                    |

## Tech Stack

- **Runtime**: Bun
- **Frontend**: Next.js, React 19, Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: better-auth
- **Build**: Turborepo

## Project Structure

```
apps/
  web/          # Next.js web application
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

This is an early-stage project being built in public. While we're not actively seeking contributions at this time, bug fixes and small improvements are welcome.

If you find an issue:

1. Check [existing issues](https://github.com/carlesonielfa/isthatslop/issues) first
2. Open a new issue describing the bug
3. If you'd like to fix it yourself, submit a PR referencing the issue

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
