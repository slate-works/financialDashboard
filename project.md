# Personal Finance Dashboard — Project Guide (Node.js + TypeScript)

## Overview

This project is a **self-hosted Personal Finance Dashboard** built with:

- **Backend:** Node.js + TypeScript (REST API)
- **Database:** SQLite
- **ORM:** Prisma or Drizzle ORM (use Prisma unless otherwise specified)
- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Charts:** Recharts or Chart.js

The app runs on my **home server** (Linux) via **Docker Compose**. I will export data from my **Money Manager** app (CSV), upload those CSV files to this app, and get a clean dashboard with tables, charts, and summaries of my transactions.

This document defines the architecture, conventions, and roadmap. **GitHub Copilot should follow this document when generating code** for this project.

---

## High-Level Goals

1. Build a clean, stable full-stack application in **TypeScript** (backend + frontend).
2. Allow CSV uploads from Money Manager and store transactions in SQLite.
3. Provide useful analytics:
   - Monthly totals
   - Category breakdowns
   - Income vs expenses
4. Make it simple to run on a home server via **Docker Compose**.
5. Keep the codebase modular, readable, and easy to extend later (budgets, tags, etc.).

---

## Technology Stack

### Backend

- **Runtime:** Node.js (LTS)
- **Language:** TypeScript
- **Framework:** Express or Fastify (default: **Express**)
- **Database:** SQLite
- **ORM:** Prisma ORM
- **Validation:** Zod or class-validator (default: **Zod**)
- **CSV Parsing:** `papaparse` or `csv-parse` on the backend (default: `csv-parse`)
- **Build:** `ts-node` for dev, `tsc` for prod build
- **Testing (optional):** Jest or Vitest

### Frontend

- **Framework:** React
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **Charts:** Recharts (preferred) or Chart.js
- **HTTP Client:** Axios or fetch wrapper (default: Axios)

### Infrastructure / Tooling

- **Editor:** VS Code
- **Assistant:** GitHub Copilot
- **Version Control:** Git + GitHub
- **Deployment:** Docker + Docker Compose

---

## System Architecture

### Backend Responsibilities

- Expose a REST API for:
  - Uploading CSV exports
  - Listing and filtering transactions
  - Fetching summary analytics (total spent, by month, by category)
- Parse uploaded CSV files into a **unified transaction schema**.
- Persist all transactions in SQLite via Prisma.
- Provide derived analytics (group by category, group by month).
- Keep logic modular: routes, controllers/handlers, services, and data access separated.

### Frontend Responsibilities

- Provide a browser-based dashboard for:
  - File upload
  - Browsing transactions
  - Viewing charts and summaries
- Offer filters by category, date range, and search text.
- Present a clean, minimal UI that is easy to read.
- Use responsive design so it works on desktop and tablet.

---

## Data Model

### Unified `Transaction` Entity

All CSV imports should be normalized to this shape.

```ts
type TransactionType = "income" | "expense" | "transfer";

interface Transaction {
  id: number;               // DB primary key
  date: string;             // ISO 8601 date string: YYYY-MM-DD
  description: string;
  category: string;
  amount: number;           // expenses negative, income positive
  type: TransactionType;
  account: string | null;
  note: string | null;      // optional, added later in UI
  createdAt: string;        // ISO timestamp
}
