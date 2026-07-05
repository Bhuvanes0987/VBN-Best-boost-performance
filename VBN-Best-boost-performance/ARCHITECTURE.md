# VBN Boost Performance — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│   Angular 17  ·  PrimeNG  ·  TailwindCSS  ·  Razorpay JS SDK   │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTP / REST  (JSON)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     Flask Backend (Python)                       │
│   Routes  ·  JWT Auth  ·  Flask-Migrate  ·  APScheduler         │
│   Flask-Mail  ·  Razorpay SDK  ·  Audit Logger                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │  SQLAlchemy ORM
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      Database (SQLite / MySQL)                   │
│   users · roles · schools · classes · subjects · questions       │
│   test_results · payments · permissions · custom_table           │
└─────────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
┌─────────────▼──────┐    ┌─────────────▼───────────┐
│  Razorpay Gateway  │    │   SMTP Email Server      │
│  (Payment Orders,  │    │  (Daily/Subject Reports) │
│   Verify, Webhook) │    └─────────────────────────-┘
└────────────────────┘
```

---

## Data Model

```
┌─────────────┐       ┌──────────────┐       ┌────────────────┐
│   schools   │──┐    │    roles     │       │  permissions   │
│─────────────│  │    │──────────────│       │────────────────│
│ id          │  │    │ id           │       │ id             │
│ name        │  │    │ name         │       │ name           │
│ address     │  │    │ description  │       │ page           │
│ phone       │  │    │ school_id    │       └───────┬────────┘
│ status      │  │    │ role_type    │               │
└──────┬──────┘  │    │ requires_    │       ┌───────▼────────┐
       │         │    │   payment ◄──┼──NEW  │ role_permissions│
       │         │    │ status       │       │────────────────│
       │         │    └──────┬───────┘       │ role_id        │
       │         │           │               │ permission_id  │
┌──────▼──────┐  │    ┌──────▼───────┐       └────────────────┘
│    users    │◄─┘    │  user_roles  │
│─────────────│       │──────────────│
│ id          │       │ id           │
│ name        │       │ user_id      │
│ email       │       │ role_id      │
│ password_   │       └──────────────┘
│   hash      │
│ phone       │
│ position    │──── 1=Admin, 2=Student, 3=Teacher, 4=Principal
│ student_    │
│   class     │──► classes.id
│ school_id   │──► schools.id
│ status      │
│ profile_pic │
│ selected_   │
│   subjects  │
│─── NEW ─────│
│ payment_    │
│   status    │──── 'paid' | 'unpaid'
│ login_count │──── incremented each unique login day (trial tracker)
│ last_login_ │
│   date      │──── date of last login (for daily count)
└──────┬──────┘
       │
       ├──────────────────────────────────────────────┐
       │                                              │
┌──────▼──────────┐              ┌───────────────────▼─┐
│    payments     │              │     test_results    │
│─────────────────│              │─────────────────────│
│ id              │              │ id                  │
│ user_id         │              │ user_id             │
│ razorpay_order_ │              │ class_id            │
│   id            │              │ subject_id          │
│ razorpay_pmt_id │              │ score               │
│ amount          │              │ total_questions     │
│ currency        │              │ quiz_type           │
│ status          │              │ created_at          │
│ payment_method  │              └─────────────────────┘
│ created_at      │
└─────────────────┘

┌────────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│  classes   │    │ subjects │    │   units   │    │questions │
│────────────│    │──────────│    │───────────│    │──────────│
│ id         │◄───│class_id  │◄───│subject_id │◄───│unit_id   │
│ name       │    │name      │    │name       │    │type      │
│ school_id  │    │school_id │    │school_id  │    │text      │
│ status     │    │timer     │    │status     │    │options   │
└────────────┘    │status    │    └───────────┘    │answer    │
                  └──────────┘                     │marks     │
                                                   └──────────┘
```

---

## Authentication & Authorization Flow

```
User enters credentials
        │
        ▼
POST /api/login
        │
        ├── Validate email + password hash
        ├── Check today vs last_login_date
        │     ├── New day → login_count++ , last_login_date = today
        │     └── Same day → no change
        ├── Generate JWT (exp: 8h)
        └── Return: { token, user { id, name, position, payment_status,
                       login_count, requires_payment, ... } }
                         │
                         ▼
              Store in sessionStorage
              (token, user, position)
                         │
                         ▼
              Navigate to /home
                         │
                         ▼
              authGuard checks:
              ┌──────────────────────────────┐
              │ token valid?   NO → /login   │
              │       ↓                      │
              │ requires_payment AND         │
              │ login_count >= 30 AND        │
              │ payment_status != 'paid'?    │
              │       YES → /payments        │
              │       NO  → allow access     │
              └──────────────────────────────┘
```

---

## Payment Flow (Razorpay)

```
User on /payments page
        │
        ▼
Select payment method
(UPI / GPay / PhonePe / Paytm UPI, Debit Card, Credit Card,
 Wallet: Paytm / Amazon Pay / Mobikwik / Freecharge)
        │
        ▼
POST /api/payment/create-order
  { amount, description, payment_method, user_id }
        │
        ▼
Backend creates Razorpay Order
Returns { order_id, amount, currency, key }
        │
        ▼
Frontend opens Razorpay Checkout (JS SDK)
User completes payment on Razorpay's hosted UI
        │
        ├── SUCCESS
        │       ▼
        │   POST /api/payment/verify
        │   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        │       ▼
        │   Backend verifies HMAC-SHA256 signature
        │       ▼
        │   user.payment_status = 'paid'   ← written to DB
        │   sessionStorage user updated    ← frontend reflects change
        │       ▼
        │   Show success screen ✅
        │
        └── FAILURE
                ▼
            POST /api/payment/failed
            { razorpay_order_id, error_code, error_description }
                ▼
            Show error with retry option ❌
```

---

## Admin Payments Dashboard Architecture

```
/admin-payments  (AdminPaymentsDashboard component)
        │
        ├── GET /api/admin/payments/dashboard
        │   → totalRevenue, totalPaidUsers, totalUnpaidUsers, monthlyRevenue[]
        │   (Admins excluded from user counts)
        │
        ├── GET /api/admin/payments/roles
        │   → Role[] { id, name, requiresPayment }
        │   PUT /api/admin/payments/roles/:id
        │   → Update requiresPayment flag for role
        │
        └── GET /api/admin/payments/users?search=&payment_status=
            → User[] (non-admins only, with school, loginCount, paymentStatus)
            PUT /api/admin/payments/users/:id/status
            → Toggle paid ↔ unpaid
            PUT /api/admin/payments/users/:id/reset-trial
            → Set login_count = 0, last_login_date = null
```

---

## Frontend Component Architecture

```
AppComponent (app.html)
├── Navbar  (sticky top bar, orange gradient)
│   ├── Logo → /home
│   ├── Gear icon → opens sidebar drawer (showSettings())
│   └── Avatar → logout confirm
│
├── Sidebar Drawer (PrimeNG p-drawer, right side)
│   ├── My Profile          → /profile
│   ├── [Admin only]
│   │   ├── Manage Schools  → /schools
│   │   ├── Manage Roles    → /roles
│   │   ├── Manage Users    → /user
│   │   └── 💳 Payments Management  → /admin-payments  ← NEW
│   ├── [Admin + permitted]
│   │   ├── Manage Classes  → /classes
│   │   ├── Manage Subjects → /subjects
│   │   ├── Question Bank   → /questions
│   │   ├── Import Q's      → /import
│   │   └── Units           → /units
│   └── Payments            → /payments
│
└── <router-outlet> (main content)
    ├── HomeComponent
    │   ├── T&C Dialog (on first session visit)  ← NEW
    │   ├── Stats cards
    │   ├── Daily Quiz launch
    │   ├── Subject Quiz launch
    │   ├── Leaderboard
    │   └── Custom configurable table
    │
    ├── PaymentsComponent
    │   ├── Order summary
    │   ├── UPI (QR + timer)
    │   ├── Wallet grid (Paytm, Amazon Pay, Mobikwik, Freecharge)  ← NEW instructions
    │   ├── Debit / Credit card (3D flip card)
    │   └── Success overlay
    │
    └── AdminPaymentsDashboard  ← NEW
        ├── Dashboard cards (Revenue, Paid, Unpaid)
        ├── Role Payment Config (toggle switches)
        └── Users Audit Table
            ├── Search + Status filter
            ├── Login progress bar (x/30)
            ├── Mark Paid / Unpaid button
            ├── Reset Trial button  ← NEW
            └── Export PDF / Excel
```

---

## Terms & Conditions Dialog Flow

```
User logs in → navigates to /home
        │
        ▼
HomeComponent.ngOnInit()
        │
        ├── Check sessionStorage["terms_accepted_<userId>"]
        │       EXISTS → skip dialog, load content normally
        │       MISSING ↓
        ▼
Show p-dialog (modal, no close button)
  Sections: Trial Policy · Daily Quiz Rules · Timing Rules · General Rules
        │
        ▼
User ticks checkbox → "Accept & Continue" button activates
        │
        ▼
sessionStorage["terms_accepted_<userId>"] = "true"
Dialog closes → normal home page
```

---

## Scheduled Jobs

```
APScheduler (BackgroundScheduler, Asia/Kolkata timezone)
│
├── daily_quiz_report   → 21:00 IST daily
│   Queries today's quiz results, formats HTML email, sends via Flask-Mail
│
└── subject_quiz_report → 21:00 IST daily
    Queries subject-wise scores, formats HTML email, sends via Flask-Mail

Guard: Only starts if WERKZEUG_RUN_MAIN == "true"
       (prevents double-start in Flask debug reloader)
```

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| JWT expiry | 8-hour token, validated on every route |
| Sensitive logs | Password, token, auth fields redacted in logs |
| Payment verification | HMAC-SHA256 signature checked server-side |
| Admin routes | `adminGuard` on all admin frontend routes |
| Payment bypass | Trial check also enforced server-side on login response |
| Account sharing | T&C explicitly prohibits sharing; tracked by user ID |
| SQL injection | SQLAlchemy ORM parameterized queries |
