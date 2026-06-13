# VBN-Best-boost-performance
This is an education application used to study MCQs and fillups for board exams.

## Backend audit logging

- The backend now maintains complete debug-level logs for audit and troubleshooting.
- Log output is written to `backend/logs/app.log` and also streamed to the terminal.
- Incoming HTTP requests and outgoing responses are logged, with sensitive fields redacted.
- Result save operations are logged with user, school, class, subject, and score details.
- Email send failures are captured and logged without blocking result storage.

## Run the backend

flask db migrate

flask db upgrade


<!-- migrate -->
flask db init
flask db migrate -m "initial tables"
flask db upgrade