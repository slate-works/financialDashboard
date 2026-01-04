# Personal Finance Dashboard

A self-hosted, offline-first personal finance dashboard with research-driven analytics. Part of the Slate Works organization.

## Status

**This project is under active development and is not ready for general use or production deployment.** The codebase is evolving, APIs are unstable, and documentation is incomplete. Installation, setup, and deployment instructions are not yet available.

## Goals and Non-Goals

### Goals

- Provide a privacy-first personal finance dashboard that runs entirely on local infrastructure
- Offer research-backed financial analytics beyond simple expense tracking
- Enable users to import transaction data via CSV exports from existing financial tools
- Generate actionable insights from historical spending patterns without external data aggregation services
- Support self-hosted deployment with Docker Compose

### Non-Goals

- Cloud-based SaaS offering with multi-tenant infrastructure
- Bank data aggregation via Plaid or similar paid services
- Real-time transaction sync from financial institutions
- Mobile-native applications (web-first design)
- Financial product recommendations or affiliate marketing
- Investment brokerage integration or trade execution

## Design Philosophy

### Offline-First

All computation occurs locally. No external API calls are made for analytics, and historical data remains on your infrastructure. Optional cloud backup may be implemented as a user-controlled feature, but the core system operates independently of internet connectivity after initial setup.

### Data Ownership

Transaction data, budgets, goals, and analytical results are stored in a local SQLite database. Users maintain complete control over their financial information. No telemetry, analytics, or usage data is transmitted to external services.

### Transparency and Auditability

Financial calculations follow explicit formulas documented in the specification. All algorithms are deterministic, unit-testable, and traceable to academic literature or professional standards (CFP Board, industry best practices). The analytics engine is designed as pure functions where possible, making verification straightforward.

### Self-Hosted Architecture

The system is built as a traditional client-server application suitable for deployment on home servers, VPS instances, or private cloud infrastructure. Docker Compose configuration enables straightforward deployment, though deployment documentation is not yet available.

## Analytics Approach

The dashboard implements a research-driven analytics system defined in `docs/finance-analytics-spec.md`. Rather than simple aggregation, the system applies financial planning principles, statistical methods, and time-series analysis to produce actionable insights.

### Methodological Foundation

Analytics are grounded in:

- **CFP Board financial planning standards** for emergency fund sizing, debt-to-income ratios, and savings targets
- **Academic literature** on time-series forecasting (exponential smoothing, ARIMA models) and anomaly detection (z-score analysis, isolation forests)
- **Industry best practices** from reputable open-source finance projects (Firefly III methodology) and budgeting applications (YNAB principles)
- **Statistical methods** for pattern detection (recurring transaction identification), volatility measurement (coefficient of variation), and scenario modeling (Monte Carlo simulation)

### Planned Analytics Features

The specification defines twelve core analytics features:

1. Monthly budget vs. actual tracking with variance analysis
2. Automatic recurring transaction detection (subscriptions, bills, income)
3. Expense forecasting using exponential smoothing with seasonal adjustment
4. Cash flow stability index and volatility measurement
5. Anomaly detection for unusual transactions or spending patterns
6. Financial runway calculator (months until cash depletion)
7. Savings rate calculation and goal progress tracking
8. Debt-to-income analysis and payoff strategy comparison
9. Budget adherence consistency scoring
10. Adaptive budget recommendations based on spending trends
11. Investment portfolio simulation (Monte Carlo projections)
12. Emergency fund adequacy calculator with risk-based recommendations

Each feature includes explicit formulas, edge case handling, and test cases documented in the specification.

## Current Capabilities

The following functionality exists in the codebase, though completeness and stability vary:

### Backend

- **REST API** built with Express and TypeScript
- **Database layer** using Prisma ORM with SQLite
- **Transaction management**: CRUD operations, CSV import, deduplication
- **Subscription management**: Manual entry and tracking of recurring expenses
- **Basic analytics endpoints**: Monthly summaries, category breakdowns, overview statistics
- **File upload handling**: CSV and Excel file parsing for transaction import

### Frontend

- **Next.js application** with React 19 and TypeScript
- **Transaction views**: List, filter, and search functionality
- **Dashboard interface**: Basic charts and summary statistics
- **Import interface**: File upload for CSV transaction data
- **Subscription management**: UI for managing recurring expenses
- **Responsive design**: Works on desktop and tablet viewports

### Architecture

- **Monolithic frontend/backend** with clear separation of concerns
- **Type-safe API communication** between frontend and backend
- **Component-based UI** using Radix UI primitives and Tailwind CSS
- **Charting capabilities** via Recharts for time-series and categorical visualizations

## Planned Work

Near-term development priorities include:

- Completing implementation of the analytics engine features defined in the specification
- Stabilizing API contracts and data models
- Expanding unit test coverage for financial calculations
- Improving error handling and edge case management
- Creating deployment documentation and Docker Compose configuration
- Developing comprehensive user documentation
- Performance optimization for large transaction datasets

## Documentation

### Available Documentation

- **`docs/project.md`**: Project architecture, technology stack, and development conventions (may be partially outdated)
- **`docs/finance-analytics-spec.md`**: Comprehensive specification of the analytics system, including formulas, algorithms, test cases, and data models

### Developer Documentation

Developer setup documentation exists but is evolving. The codebase structure follows standard Node.js and Next.js conventions. Backend services are organized into controllers, routes, and service layers. Frontend components use React patterns with TypeScript for type safety.

## Technology Stack

### Backend

- Runtime: Node.js (LTS)
- Language: TypeScript
- Framework: Express 5
- Database: SQLite
- ORM: Prisma
- Validation: Zod

### Frontend

- Framework: Next.js 16
- UI Library: React 19
- Language: TypeScript
- Styling: Tailwind CSS
- Component Library: Radix UI (shadcn/ui)
- Charts: Recharts

### Infrastructure

- Containerization: Docker (Docker Compose for orchestration)
- Development: TypeScript compilation and hot-reload tooling

## Slate Works

This project is part of Slate Works, an organization focused on building free and open-source software with an emphasis on self-hosted, privacy-respecting solutions. Slate Works projects prioritize user data ownership, local-first architectures, and transparency over convenience features that compromise user control.

All Slate Works projects are released under open-source licenses and welcome community contributions, though contribution guidelines for this project are still being established.

## Contributing

This project may accept contributions in the future, but contribution guidelines, code review processes, and development workflows are still being defined. The project maintainers will establish contribution expectations as the codebase stabilizes.

If you are interested in contributing, please wait for formal contribution guidelines to be published. The codebase structure and API contracts are still subject to significant changes during active development.

## License

License information will be added once licensing decisions are finalized.
