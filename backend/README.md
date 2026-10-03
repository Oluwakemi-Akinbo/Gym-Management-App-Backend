# Gym Management API

This is the backend MVP for the Gym Management App. It is built with Node.js, Express, MongoDB, and Mongoose. The API supports staff authentication and role checks, members, membership plans, trainers, payments, and attendance.

## What the API does

- Creates the first administrator and lets the administrator create/deactivate staff accounts.
- Creates and manages members, trainer profiles, and membership plans.
- Records paid or pending payments. A paid payment linked to a plan starts or extends that member's membership. Marking a pending payment paid applies the plan.
- Records refunds and safely reverses the related membership change when no later renewal has changed the member's membership end date.
- Allows check-in only when the member is active and their membership is current. Prevents a second open visit until the member is checked out.
- Validates request data, hashes passwords, uses bearer JWTs and admin/staff permissions, paginates lists, applies rate limiting, and uses a consistent JSON response format.

Payments are records for the gym's staff to manage. This project does not charge cards or connect to a real payment gateway.

## Requirements

- Node.js 20 or newer (npm is included with Node.js)
- A MongoDB database, either local MongoDB or MongoDB Atlas

## Dependencies

All JavaScript packages are declared in `package.json`; run `npm install` rather than downloading them individually.

- Runtime: `express`, `mongoose`, `dotenv`, `cors`, `helmet`, `express-rate-limit`, `bcryptjs`, `jsonwebtoken`, `zod`
- Development: `nodemon`
- External service: MongoDB (local or Atlas)

## Install and run

1. Extract this ZIP and open a terminal in the `backend` directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`.
4. Set `MONGODB_URI` to the URI for your database. Keep the provided local URI to use a MongoDB server running on your computer.
5. Replace `JWT_SECRET` with a private random string of at least 32 characters. Never share or commit `.env`.
6. Start the development server:

   ```bash
   npm run dev
   ```

For a normal start, use `npm start`. By default, the API is at `http://localhost:5000`, with routes under `http://localhost:5000/api/v1`.

## First-run account setup

Create the first administrator once. Public setup closes as soon as an account exists.

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "Gym Admin",
  "email": "admin@example.com",
  "password": "choose-a-password-at-least-8-chars"
}
```

The response contains a JWT. For protected requests, send `Authorization: Bearer <token>`. Then create staff accounts through `POST /api/v1/auth/staff`. Passwords are hashed and never returned.

## API routes

All list routes support `page` and `limit` (1-100). Member, plan, and trainer lists also support `search` and status filters. Payment and attendance list routes support date and member filters. Detailed request/response examples are in [`docs/API.md`](docs/API.md); an OpenAPI outline is in [`docs/gymappts.yaml`](docs/gymappta.yaml).

| Method | Path | Purpose | Permissions |
| --- | --- | --- | --- |
| GET | `/` | API welcome response | Public |
| GET | `/api/v1/health` | API and database readiness | Public |
| POST | `/api/v1/auth/register` | First administrator setup | Public until first account |
| POST | `/api/v1/auth/login` | Sign in | Public |
| GET | `/api/v1/auth/me` | Current account | Authenticated |
| POST | `/api/v1/auth/staff` | Create staff account | Admin |
| GET | `/api/v1/users` | List staff and admin accounts | Admin |
| GET | `/api/v1/users/:id` | Get account | Admin |
| PATCH | `/api/v1/users/:id/active` | Activate/deactivate a staff account | Admin |
| GET, POST | `/api/v1/members` | List/create members | Authenticated / staff or admin |
| GET, PATCH, DELETE | `/api/v1/members/:id` | Get/update/archive a member | Authenticated / staff or admin |
| GET, POST | `/api/v1/plans` | List/create membership plans | Authenticated / admin |
| GET, PATCH, DELETE | `/api/v1/plans/:id` | Get/update/archive a plan | Authenticated / admin |
| GET, POST | `/api/v1/trainers` | List/create trainer records | Authenticated / staff or admin |
| GET, PATCH, DELETE | `/api/v1/trainers/:id` | Get/update/archive a trainer | Authenticated / staff or admin |
| GET, POST | `/api/v1/payments` | List/record payment | Authenticated / staff or admin |
| GET | `/api/v1/payments/:id` | Get payment | Authenticated |
| PATCH | `/api/v1/payments/:id/mark-paid` | Mark pending payment paid and apply its plan | Admin |
| POST | `/api/v1/payments/:id/refund` | Refund and safely reverse a membership | Admin |
| GET | `/api/v1/attendance` | List attendance, optionally `openOnly=true` | Authenticated |
| POST | `/api/v1/attendance/check-in` | Check in member with current membership | Staff or admin |
| PATCH | `/api/v1/attendance/:id/check-out` | Check out member | Staff or admin |
| GET, DELETE | `/api/v1/attendance/:id` | Get/delete attendance record | Authenticated / admin |

Deleting a member, plan, or trainer archives it rather than erasing history. Archived members become inactive; archived plans and trainers become inactive. The attendance DELETE route removes a record.

## Example workflow

1. Register the first admin and log in.
2. Create a membership plan and trainer.
3. Create a member, optionally assigning the trainer.
4. Record a payment for a plan. A `paid` payment activates/extends membership dates; a `pending` payment waits for admin review.
5. Check the member in. The API rejects inactive members, expired memberships, and duplicate open visits.
6. Check the member out to close the attendance visit.

## Response format

Success:

```json
{ "success": true, "message": "Member created successfully.", "data": { "id": "..." } }
```

Error:

```json
{ "success": false, "message": "Member not found.", "data": null }
```

## Backend structure

```text
backend/
├── docs/openapi.yaml
├── src/
│   ├── config/        # Environment and MongoDB setup
│   ├── controllers/   # HTTP request/response handlers
│   ├── middleware/    # Authentication, roles, validation, error handling
│   ├── models/        # Mongoose schemas and indexes
│   ├── routes/        # Versioned Express routes
│   ├── services/      # Domain and database operations
│   ├── utils/         # Async wrapper, validation, shared CRUD helpers
│   ├── app.js         # Express app and route registration
│   └── server.js      # Database connection and server lifecycle
├── .env.example
├── .gitignore
└── package.json
```

## Security and limitations

- Use HTTPS and a strong private JWT secret for deployment.
- `.env` and `node_modules` are excluded by `.gitignore`.
- Staff accounts are created by an administrator; public account creation is closed after initial setup.
- JWT sessions expire based on `JWT_EXPIRES_IN` (default one day). Deactivated accounts lose access immediately on their next request.
- Automatic refund reversal is blocked when a later membership renewal has changed the member's membership end date, to avoid removing the wrong entitlement.
- Use a managed MongoDB deployment with backups for production. This project is an educational MVP and should be reviewed before handling real customer/payment data.
