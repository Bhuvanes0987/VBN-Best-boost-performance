# VBN Boost Performance — Technical README

> **VBN Boost Performance** is a full-stack educational platform built for students, teachers, and principals to practice MCQ and fill-in-the-blank questions for board exams, track results, and manage school-wide content.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [Database Migrations](#database-migrations)
- [Backend API Overview](#backend-api-overview)
- [Frontend Routes](#frontend-routes)
- [Payment & Trial System](#payment--trial-system)
- [Admin Payments Dashboard](#admin-payments-dashboard)
- [Role-Based Access Control](#role-based-access-control)
- [Audit Logging](#audit-logging)
- [Email & Scheduled Reports](#email--scheduled-reports)

---

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | Angular 17+ (Standalone components), PrimeNG, TailwindCSS |
| Backend   | Python 3.x, Flask, Flask-SQLAlchemy, Flask-Migrate |
| Database  | SQLite (dev) / MySQL or PostgreSQL (prod)     |
| Payments  | Razorpay (Orders, Webhooks, Verify)           |
| Email     | Flask-Mail (SMTP)                             |
| Scheduler | APScheduler (Background cron jobs)            |
| Auth      | JWT (JSON Web Tokens) via sessionStorage      |

---

## Project Structure

```
VBN-Best-boost-performance/
├── backend/
│   ├── app.py                    # Flask app factory, blueprint registration, scheduler
│   ├── config.py                 # App configuration (DB URI, Razorpay keys, SMTP)
│   ├── extension.py              # SQLAlchemy, Migrate, Mail instances
│   ├── logger.py                 # Structured audit logger
│   ├── requirements.txt          # Python dependencies
│   ├── .env                      # Environment variables (not committed)
│   ├── models/
│   │   ├── user_model.py         # User, payment_status, login_count, last_login_date
│   │   ├── role_model.py         # Role, requires_payment flag
│   │   ├── school_model.py       # School
│   │   ├── class_model.py        # Class
│   │   ├── subject_model.py      # Subject
│   │   ├── unit_model.py         # Unit
│   │   ├── question_model.py     # Question (MCQ / Fill-up)
│   │   ├── test_result_model.py  # Quiz attempt results
│   │   ├── payment_model.py      # Razorpay payment records
│   │   ├── permission_model.py   # Page-level permissions
│   │   ├── role_permission_model.py
│   │   ├── user_role_model.py
│   │   └── custom_table_model.py # Configurable home page table
│   └── routes/
│       ├── signup_routes.py      # Login, signup, forgot/reset password. Tracks login_count.
│       ├── user_routes.py        # User CRUD
│       ├── role_routes.py        # Role CRUD
│       ├── school_routes.py      # School CRUD
│       ├── class_routes.py       # Class CRUD
│       ├── subject_routes.py     # Subject CRUD
│       ├── question_routes.py    # Question CRUD + bulk import
│       ├── result_routes.py      # Quiz results, leaderboard, stats
│       ├── payment_routes.py     # Razorpay create-order, verify, record-failure
│       ├── admin_payment_routes.py  # Admin: dashboard, audit table, role config, reset trial
│       ├── profile_routes.py     # User profile update
│       ├── user_role_routes.py   # User ↔ Role assignments
│       ├── custom_table_routes.py
│       ├── daily_quiz_report.py  # Scheduled email: daily quiz report
│       └── subject_quiz_report.py # Scheduled email: subject quiz report
│
└── frontend/
    ├── src/app/
    │   ├── app.routes.ts         # All routes with guards
    │   ├── app.html              # Root layout: navbar + sidebar navigation
    │   ├── app.ts                # Root component
    │   ├── Environment/
    │   │   └── Environment.ts    # API base URL
    │   └── shared/
    │       ├── services/
    │       │   ├── auth-guard.ts          # Blocks unauthenticated + trial-expired users
    │       │   ├── admin-guard.ts         # Blocks non-admins
    │       │   ├── permission-guard.ts    # Page-level permission check
    │       │   ├── no-auth-guard.ts       # Redirects logged-in users
    │       │   ├── payments.service.ts    # Razorpay API wrapper
    │       │   └── question.service.ts
    │       └── components/
    │           ├── login/                 # Login page with T&C notice
    │           ├── signup/                # Registration page
    │           ├── home/                  # Dashboard + T&C dialog on first login
    │           ├── payments/              # Razorpay checkout UI (UPI, Card, Wallet)
    │           ├── admin-payments-dashboard/  # Admin: metrics, role config, audit table
    │           ├── quiz/                  # Quiz engine
    │           ├── results/               # Quiz history
    │           ├── question-bank/         # Question CRUD
    │           ├── subjects/              # Subject management
    │           ├── class/                 # Class management
    │           ├── school/                # School management
    │           ├── user/                  # User management
    │           ├── role/                  # Role & permissions management
    │           ├── profile/               # User profile
    │           └── student-result/        # Student result view
```

---

## Environment Setup

### Backend `.env`

```env
SECRET_KEY=your_flask_secret_key
DATABASE_URL=sqlite:///vbn.db          # or mysql+pymysql://...

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret

MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@email.com
MAIL_PASSWORD=your_app_password
MAIL_DEFAULT_SENDER=your@email.com
```

### Frontend `Environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000'
};
```

---

## Running the Application

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Server runs at **http://localhost:5000**

### Frontend

```bash
cd frontend
npm install
npx ng s
```

App runs at **http://localhost:4200**

---

## Database Migrations

The project uses **Flask-Migrate** (Alembic under the hood).

```bash
# First-time setup
flask db init
flask db migrate -m "initial tables"
flask db upgrade

# After model changes
flask db migrate -m "describe change"
flask db upgrade
```

> **Note:** For SQLite dev environments, new columns can also be added using the helper script:
> ```bash
> python check_and_migrate.py
> ```

---

## Backend API Overview

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Login. Tracks `login_count` and `last_login_date`. Returns payment status. |
| POST | `/api/signup` | Register new user |
| POST | `/api/forgot-password` | Send password reset email |
| POST | `/api/reset-password` | Reset password with token |

### Payments (`/api/payment`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/create-order` | Creates a Razorpay order |
| POST | `/api/payment/verify` | Verifies signature; marks user as `paid` |
| POST | `/api/payment/failed` | Records a failed payment attempt |
| GET  | `/api/payment/status/<order_id>` | Gets order status |

### Admin Payments (`/api/admin/payments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/payments/dashboard` | Revenue totals, paid/unpaid counts, monthly chart data |
| GET | `/api/admin/payments/users` | All non-admin users with payment status (filterable) |
| PUT | `/api/admin/payments/users/<id>/status` | Toggle user payment status (paid ↔ unpaid) |
| PUT | `/api/admin/payments/users/<id>/reset-trial` | Reset user's `login_count` to 0 |
| GET | `/api/admin/payments/roles` | Get all roles with `requires_payment` flag |
| PUT | `/api/admin/payments/roles/<id>` | Update `requires_payment` for a role |

### Other Routes
| Prefix | Description |
|--------|-------------|
| `/api/users` | User CRUD |
| `/api/roles` | Role CRUD and permissions |
| `/api/schools` | School CRUD |
| `/api/classes` | Class CRUD |
| `/api/subjects` | Subject CRUD |
| `/api/questions` | Question CRUD, bulk import |
| `/results` | Quiz results, leaderboard, stats |
| `/api/profile` | Profile picture, name update |

---

## Frontend Routes

| Path | Component | Guards | Description |
|------|-----------|--------|-------------|
| `/login` | Login | noAuthGuard | Login page |
| `/signup` | Signup | noAuthGuard | Registration |
| `/home` | Home | authGuard | Dashboard with T&C dialog on first visit |
| `/payments` | Payments | authGuard | Razorpay checkout (UPI / Card / Wallet) |
| `/admin-payments` | AdminPaymentsDashboard | authGuard + adminGuard | Admin payments management page |
| `/quiz/:classId/:subjectId` | Quiz | authGuard | Quiz engine |
| `/results` | Results | authGuard | Quiz history |
| `/schools` | School | authGuard + adminGuard | School management |
| `/user` | User | authGuard + adminGuard | User management |
| `/roles` | Role | authGuard + adminGuard | Role & permissions |
| `/classes` | Class | authGuard + permissionGuard | Class management |
| `/subjects` | Subjects | authGuard + permissionGuard | Subject management |
| `/questions` | QuestionBank | authGuard + permissionGuard | Question management |
| `/profile` | Profile | authGuard | User profile |

---

## Payment & Trial System

### 30-Day Free Trial Flow

1. On every login, `signup_routes.py` checks `last_login_date` against today.
2. If it's a new day, `login_count` is incremented by 1 and `last_login_date` is updated.
3. The login API response includes: `login_count`, `payment_status`, `requires_payment`.
4. The frontend stores these in `sessionStorage` as part of the `user` object.

### Trial Enforcement (`auth-guard.ts`)

```
if (role requires_payment)
  AND (login_count >= 30)
  AND (payment_status !== 'paid')
→ Redirect to /payments
```

- Admins are **never** blocked.
- Teachers and Principals can be configured by Admin to be exempt via the **Role Payment Configuration** panel.

### Payment Verification

On successful Razorpay payment:
- The backend verifies the HMAC-SHA256 signature.
- If valid, `user.payment_status` is set to `'paid'` in the database.
- The user's session data is updated to reflect the new paid status.

### Admin Overrides

Admins can from the **Payments Management** page:
- **Mark as Paid / Unpaid** — Manually toggle payment status for any user.
- **Reset Trial** — Set `login_count = 0` to give the user a fresh 30-day trial.

---

## Admin Payments Dashboard

**URL:** `/admin-payments` (Admin only)

**Accessible via:** Sidebar → *Payments Management* (💳 icon, Admin-only)

### Dashboard Metrics
- Total Revenue Collected (from verified Razorpay payments)
- Total Paid Users
- Total Unpaid Users
- Monthly revenue breakdown (current year)

### Role Payment Configuration
- Toggle whether each role (Student, Teacher, Principal) requires payment after the trial.
- Changes are saved instantly to the database.

### Users Audit Table
- Lists all **non-admin** users with name, email, school, login count (trial progress bar), and payment status badge.
- **Search** by name or email.
- **Filter** by payment status (Paid / Unpaid / All).
- **Actions per user:**
  - Mark as Paid / Mark as Unpaid
  - Reset Trial (sets login count to 0)
- **Export:** PDF (jsPDF + autoTable) and Excel (SheetJS/XLSX).

---

## Role-Based Access Control

| Position | Role | Notes |
|----------|------|-------|
| 1 | Admin | Full access. No payment required. Manages all users. |
| 2 | Student | Requires payment after 30 login days (if configured). |
| 3 | Teacher | Payment optional, configurable by Admin. |
| 4+ | Principal | Payment optional, configurable by Admin. |

### Guards
- **`authGuard`** — Validates JWT token expiry. Enforces trial/payment check.
- **`adminGuard`** — Verifies `position === 1`.
- **`permissionGuard`** — Checks role-level page permissions from the backend.
- **`noAuthGuard`** — Prevents logged-in users from accessing login/signup.

---

## Audit Logging

- All HTTP requests and responses are logged to `backend/logs/app.log` at DEBUG level.
- Sensitive fields (`password`, `token`, `authorization`) are **redacted** before logging.
- Result save operations log: user ID, school, class, subject, score.
- Email send failures are captured without blocking core functionality.

Log format:
```
2026-07-05 18:00:00 DEBUG [vbn_backend] POST /api/login - 200 OK
```

---

## Email & Scheduled Reports

APScheduler runs two cron jobs daily at **9:00 PM IST**:

| Job | Description |
|-----|-------------|
| `daily_quiz_report` | Emails a summary of daily quiz scores to configured recipients |
| `subject_quiz_report` | Emails subject-wise performance breakdown |

Jobs are initialized only in the main process (`WERKZEUG_RUN_MAIN === true`) to prevent double-scheduling in Flask's reloader.

---

## Terms & Conditions Dialog

On the **first visit** to the Home page after each login session, all users see a modal dialog covering:
- 30-Day Free Trial Policy
- Daily Quiz Rules (once per day, midnight reset)
- Question & Test Timing rules
- General Usage Policy

The dialog uses `sessionStorage` keyed by user ID (`terms_accepted_<userId>`). It cannot be closed without ticking the checkbox and clicking **Accept & Continue**.