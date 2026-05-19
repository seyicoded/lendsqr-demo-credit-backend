# DemoCredit API

A production-grade fintech backend API for managing digital wallets, user authentication, and financial transactions. Built for the Lendsqr Assessment platform (MVP).

## Overview

DemoCredit provides a secure, scalable API for:

- **User Management**: Registration, authentication
- **Wallet Operations**: Fund wallets via Paystack, check balances and transaction history
- **Money Transfers**: Send money to other users or external bank accounts
- **Payment Processing**: Webhook integration with Paystack for real-time payment verification
- **Race Condition Prevention**: Redis-based distributed locks to prevent duplicate transaction processing
- **Audit Logging**: Complete transaction and action audit trail for compliance

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Web Framework**: Express.js
- **Database**: MySQL with Knex query builder
- **Authentication**: JWT + bcrypt password hashing
- **Concurrency Control**: Redis distributed locks
- **Payment Gateway**: Paystack API integration
- **Validation**: Zod for request schema validation
- **Testing**: Jest with unit tests covering all service methods
- **HTTP Utilities**: Morgan logging, CORS, status codes

## Architecture

The project follows a **layered service architecture** pattern:

```
controllers/     → HTTP request handlers
  ↓
services/        → Business logic (user, wallet, webhook, auth)
  ↓
repositories/    → Data access (user, wallet, transaction, audit)
  ↓
database/        → MySQL via Knex
```

**Key Design Patterns:**

- **Transaction Manager**: Atomic operations with automatic rollback
- **Repository Pattern**: Abstracted data access with query builders
- **Zod Validation**: Schema-driven input validation at controller layer
- **Custom Error Handling**: Centralized AppError with HTTP status codes
- **Async Middleware**: Automatic try-catch wrapping for all handlers

## Project Structure

```text
db/
  ├── migrations/              # Knex database migrations
  ├── seeds/                   # Database seed files
  ├── knex-config.ts
  └── knex.ts
models/
  ├── user.model.ts           # User interface + toUser transformer
  ├── wallet.model.ts         # Wallet interface + toWallet transformer
  ├── wallet-transaction.ts   # Transaction interface + transformer
  └── audit.model.ts          # Audit log interface
src/
  ├── controllers/            # HTTP request handlers
  ├── services/               # Business logic (UserService, WalletService, WebhookService, AuthService)
  ├── repositories/           # Data access layer
  ├── routes/                 # API route definitions
  ├── validators/             # Zod request schemas
  ├── middleware/             # Auth guards, error handler, 404 handler
  ├── utils/                  # AppError, async wrapper, API response formatter
  ├── types/                  # TypeScript interfaces (audit, database, HTTP)
  ├── connector/              # External service connectors (Redis, Paystack)
  └── config/                 # Environment configuration
tests/
  └── unit/                   # Service layer unit tests (test cases)
```

## Core Features

### 1. **User Authentication**

- User registration with password hashing (bcrypt)
- BVN blacklist verification against Lendsqr external API
- JWT token generation for session management
- Email uniqueness and format validation
- Atomic user creation with wallet provisioning and audit log

### 2. **Wallet Management**

- One wallet per user with available balance tracking
- Card funding via Paystack payment gateway
- Fund wallet with automatic transaction recording (webhook/listener)
- Wallet overview with full transaction history

### 3. **Internal Transfers**

- Send money between registered users
- Recipient validation by username
- Atomic dual-transaction (sender withdrawal + recipient deposit)
- Automatic balance updates for both parties
- Full audit trail

### 4. **External Transfers**

- Withdraw to Nigerian bank accounts
- Paystack bank list integration
- Account number validation via Paystack
- Support for special bank codes (e.g., Test Bank "001")
- Transaction recording with recipient details

### 5. **Race Condition Prevention**

- Redis-based distributed locks on wallet operations
- Per-reference locks for Paystack webhook processing
- Per-user locks for concurrent transfers
- Automatic lock release in finally block (guaranteed cleanup)
- 90-second expiry with lock value verification

### 6. **Webhook Processing**

- Paystack webhook signature validation
- Idempotent transaction verification
- Automatic lock acquisition to prevent duplicate processing
- Real-time balance updates on payment confirmation
- Atomic transaction status update within database transaction

### 7. **Audit Logging**

- Polymorphic audit trail (entity_type + entity_id)
- Actions: USER_REGISTERED, FUND_WALLET_LINK, INTERNAL_TRANSFER, EXTERNAL_TRANSFER
- User-scoped query support
- Metadata storage for rich context

## API Endpoints

### Authentication

```
POST   /api/v1/users/register           - Register new user
POST   /api/v1/users/login              - Login user
```

### User Management

```
GET    /api/v1/users                    - List all users
GET    /api/v1/users/:id                - Get user by ID
GET    /api/health                      - Health check
```

### Wallet Operations

```
GET    /api/v1/wallets/overview         - Get wallet overview + transactions
GET    /api/v1/wallets/transfer/bank-list - Get Paystack bank list
POST   /api/v1/wallets/funds/cards      - Initiate card funding (Paystack)
POST   /api/v1/wallets/transfer/internal - Send to another user
POST   /api/v1/wallets/transfer/external - Withdraw to bank account
```

### Webhooks

```
POST   /api/v1/webhooks/paystack-webhook - Paystack payment webhook
```

## Testing

**Current Coverage: 44+ unit tests across 4 service files**

Run tests:

```bash
npm run test                # Run all tests once
npm run test:watch         # Run tests in watch mode
```

**Test Files:**

- `tests/unit/user.service.spec.ts` (12 tests) - Registration, login, user retrieval
- `tests/unit/auth.service.spec.ts` (8 tests) - Password hashing, JWT, validation
- `tests/unit/wallet.service.spec.ts` (15 tests) - Wallet ops, transfers, Redis locks
- `tests/unit/webhook.service.spec.ts` (7 tests) - Webhook processing, idempotency

All tests mock external dependencies (Paystack, Lendsqr, Redis, databases).

## Database Schema

**Tables:**

- `users` - User accounts with BVN, username, max loan threshold
- `wallets` - One per user with available balance
- `wallet_transactions` - Complete transaction log (deposits, withdrawals, transfers)
- `audit_logs` - Polymorphic action trail with entity tracking

**Key Features:**

- CASCADE DELETE for referential integrity
- Enum constraints at schema level (status, type, via)
- JSONB fields for flexible metadata (sender_info, receiver_info)
- Indexed queries on entity_type + entity_id
- Timestamps on all tables (created_at, updated_at)

## Setup

### Prerequisites

- Node.js LTS version
- MySQL
- Redis
- Paystack test credentials
- Lendsqr karma credentials

### Installation

1. **Clone and install:**

   ```bash
   git clone <repo>
   cd demoCredit
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   ```

   Update `.env` with:
   - MySQL host, port, user, password, database
   - Redis host, port, password
   - JWT secret and expiry
   - Paystack API keys
   - Lendsqr API keys (for Karma blacklist verification)

3. **Initialize database:**

   ```bash
   npm run knex:migrate    # Run all migrations
   ```

4. **Start development server:**
   ```bash
   npm run dev             # Runs on http://localhost:3000
   ```

## Scripts

```bash
npm run dev               # Start API in watch mode (tsx)
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled code
npm run typecheck        # Type-check without emitting
npm run test             # Run unit tests once
npm run test:watch       # Run tests in watch mode
npm run knex:migrate     # Run pending migrations
npm run knex:rollback    # Rollback last migration batch
npm run knex:seed        # Run seed files
npm run knex:make        # Create new migration
```

## Key Implementation Details

### Atomic Operations

All multi-step operations (user creation, transfers) use database transactions to ensure consistency. If any step fails, the entire transaction rolls back.

### Password Security

- Passwords hashed with bcrypt (salt rounds: 10)
- Never stored or transmitted in plain text
- Comparison uses timing-safe bcrypt.compare()

### Request Validation

- Zod schemas define all request payloads
- Validation happens at controller layer
- Type-safe payload objects in services

### Error Handling

- Custom AppError class with statusCode + details
- Centralized error middleware catches all errors
- 500 for unexpected errors, specific codes for known cases

### Concurrency Control

- **Paystack webhooks**: Locked by `reference` to prevent duplicate processing
- **Wallet transfers**: Locked by `user_id` to prevent concurrent transfers
- **Lock cleanup**: Always happens in `finally` block, even on errors
- **Lock verification**: Uses random token to prevent deleting another process's lock

## Future Plans

- **KYC/AML**: User identity verification integration
- **Loan Products**: Lending decision engine with risk scoring
- **Interest Calculations**: Accrual and compound interest for loans
- **Mobile OTP**: Two-factor authentication for transfers
- **Rate Limiting**: Request throttling per user/IP
- **Analytics Dashboard**: Transaction volume and user metrics
- **Notification Service**: Email/SMS for transaction alerts
- **Dispute Resolution**: Chargeback and refund workflow
- **Multi-currency**: Support for USD, GBP, EUR wallets

## Database Design Approach

**Normalized relational schema** with:

- Strong referential integrity (foreign keys + CASCADE)
- Audit-first design (polymorphic audit log)
- Enum constraints at schema level (state machines)
- JSONB for semi-structured data (flexible metadata)
- Timestamps on all tables for temporal queries

## E-R Diagram

![ERDIAGRAM](./DemoCredit.drawio.png)

## API Documentation

https://documenter.getpostman.com/view/19608010/2sBXqRjcjy

## Video Demo

[Watch the demo](https://www.loom.com/share/4d6d3accf890494894b0195d77530f3a)

## PAYSTACK WEBHOOK FORMAT

https://s3b00ckq-8000.usw3.devtunnels.ms/api/v1/webhooks/paystack-webhook
