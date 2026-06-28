# GlamBook API

Backend for the GlamBook beauty salon booking platform.
Built with **NestJS**, **PostgreSQL**, and **Prisma ORM**.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | NestJS (Node.js) |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | JWT + Refresh Tokens |
| Validation | class-validator + Zod |
| Docs | Swagger / OpenAPI |
| Container | Docker + Docker Compose |

---

## Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- Git

### 1. Clone and install

```bash
git clone <your-repo>
cd glambook-api
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values — defaults work for local Docker setup
```

### 3. Start PostgreSQL (Docker)

```bash
docker-compose up postgres -d
```

### 4. Run database migrations + seed

```bash
npm run db:push       # Push schema to DB
npm run db:seed       # Seed with test data
```

### 5. Start the API

```bash
npm run start:dev
```

API is running at: `http://localhost:3000/api/v1`
Swagger docs at: `http://localhost:3000/docs`

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register new customer |
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/refresh | Refresh access token |
| POST | /api/v1/auth/logout | Logout |
| GET | /api/v1/auth/me | Get current user |

### Salons
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/salons | Browse salons (with filters) |
| GET | /api/v1/salons/:slug | Get salon detail |
| POST | /api/v1/salons | Create salon (owner) |
| PUT | /api/v1/salons/:id | Update salon (owner) |
| GET | /api/v1/salons/owner/my-salons | Owner's salons |
| GET | /api/v1/salons/:id/dashboard | Dashboard stats (owner) |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/appointments/slots | Get available time slots |
| POST | /api/v1/appointments | Book appointment |
| GET | /api/v1/appointments/my | My appointments (customer) |
| PUT | /api/v1/appointments/:id/cancel | Cancel appointment |
| GET | /api/v1/appointments/salon/:id | Salon calendar (owner) |
| PUT | /api/v1/appointments/:id/status | Update status (owner) |

---

## Test Accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@glambook.ba | Admin123! |
| Salon Owner | owner@lumiere.ba | Owner123! |
| Customer | ndm1337@gmail.com | Customer123! |

---

## Database Schema

Key models:
- **User** — customers, owners, staff, admins (role-based)
- **Salon** — multi-tenant, each with own services/staff/hours
- **Service** — with categories, duration, price, color
- **StaffMember** — linked to User, with schedule and assigned services
- **Appointment** — core booking record with conflict prevention
- **WorkingHours / StaffSchedule** — per-day availability
- **Review** — linked to completed appointments

---

## Full Docker Stack

```bash
docker-compose up -d
# Runs: PostgreSQL + Redis + NestJS API
```

---

## Next Steps

- [ ] Connect frontend (React/Expo) to these endpoints
- [ ] Add Google OAuth (`passport-google-oauth20`)
- [ ] Add email notifications (Nodemailer / Resend)
- [ ] Add file upload for salon images (S3/MinIO)
- [ ] Deploy to DigitalOcean / AWS
