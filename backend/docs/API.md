# Gym Management API reference

Base URL: `http://localhost:5000/api/v1`

Protected endpoints require `Authorization: Bearer <token>`. The first administrator is created through setup, then signs in and can create staff accounts. Roles are `admin` and `staff`.

## Common responses

Success responses use this envelope:

```json
{ "success": true, "message": "Members retrieved successfully.", "data": {} }
```

List responses put records in `data.items` and paging details in `data.pagination`:

```json
{
  "success": true,
  "message": "Members retrieved successfully.",
  "data": {
    "items": [],
    "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 }
  }
}
```

Errors use `{ "success": false, "message": "...", "data": null }`. Common status codes are `400` for invalid input, `401` for missing/expired login, `403` for insufficient permission or invalid membership, `404` for a missing record, `409` for duplicates or invalid state transitions, and `500` for unexpected server errors.

## Authentication and staff accounts

| Method and path | Access | Purpose |

| `GET /health` | Public | API and database readiness (`503` if MongoDB is disconnected) |
| `POST /auth/register` | Public, first account only | Create the first admin |
| `POST /auth/login` | Public | Sign in |
| `GET /auth/me` | Any signed-in user | Read own account |
| `POST /auth/staff` | Admin | Create staff |
| `GET /users?page=1&limit=20&search=...&active=true` | Admin | List users |
| `GET /users/:id` | Admin | Get user |
| `PATCH /users/:id/active` | Admin | Change staff access |

First admin request:

```json
{ "name": "Gym Admin", "email": "admin@example.com", "password": "at-least-8-characters" }
```

Login and staff creation use `email` and `password`; staff creation also requires `name`. Login returns `{ "data": { "user": {}, "token": "..." } }`. `/auth/me` returns the signed-in public user. Passwords are never included in responses. Public registration closes after the first account is created.

Deactivate or reactivate staff with `{ "active": false }` or `{ "active": true }`. Admins cannot deactivate themselves or another admin through this route.

## Members

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /members?page=1&limit=20&search=...&status=active` | Signed-in | List/search members |
| `POST /members` | Staff/admin | Create member |
| `GET /members/:id` | Signed-in | Read member, populated plan/trainer |
| `PATCH /members/:id` | Staff/admin | Update provided fields |
| `DELETE /members/:id` | Admin | Archive (sets member inactive) |

Create member body (required: `firstName`, `lastName`, `email`):

```json
{
  "firstName": "Amina",
  "lastName": "Bello",
  "email": "amina@example.com",
  "phone": "+2348000000000",
  "dateOfBirth": "1998-05-15T00:00:00.000Z",
  "plan": "<plan id>",
  "trainer": "<trainer id>",
  "membershipStart": "2026-10-03T00:00:00.000Z",
  "membershipEnd": "2026-11-02T00:00:00.000Z",
  "status": "active",
  "notes": "Optional notes"
}
```

Plan, trainer, and dates are optional. If dates are manually supplied, end must be after start. Date of birth cannot be in the future. `status` is `active`, `inactive`, or `suspended`. `membershipCurrent` is calculated on member responses.

## Membership plans

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /plans?page=1&limit=20&search=...&status=active` | Signed-in | List/search plans |
| `POST /plans` | Admin | Create plan |
| `GET /plans/:id` | Signed-in | Read plan |
| `PATCH /plans/:id` | Admin | Update provided fields |
| `DELETE /plans/:id` | Admin | Archive plan (sets `active=false`) |

Create plan body:

```json
{ "name": "Monthly", "description": "Gym access", "durationDays": 30, "price": 12000, "active": true }
```

`name`, `durationDays` (positive integer), and `price` (non-negative number) are required. Archived plans cannot be assigned to new members or purchased, but existing payment/member history remains.

## Trainers

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /trainers?page=1&limit=20&search=...&status=active` | Signed-in | List/search trainers |
| `POST /trainers` | Staff/admin | Create trainer |
| `GET /trainers/:id` | Signed-in | Read trainer |
| `PATCH /trainers/:id` | Staff/admin | Update provided fields |
| `DELETE /trainers/:id` | Admin | Archive trainer (sets `active=false`) |

Create trainer body (required: `firstName`, `lastName`, `email`):

```json
{
  "firstName": "Chidi",
  "lastName": "Okafor",
  "email": "chidi@example.com",
  "phone": "+2348000000001",
  "specialties": ["Strength", "Mobility"],
  "active": true,
  "notes": "Optional notes"
}
```

## Payments

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /payments?page=1&limit=20&member=<id>&status=paid&from=<date>&to=<date>` | Signed-in | Search payment history |
| `POST /payments` | Staff/admin | Record paid or pending payment |
| `GET /payments/:id` | Signed-in | Read payment |
| `PATCH /payments/:id/mark-paid` | Admin | Set pending payment to paid and apply plan |
| `POST /payments/:id/refund` | Admin | Record refund and reverse membership if safe |

Record payment body (required: `member`, `method`, and either `plan` or `amount`):

```json
{
  "member": "<member id>",
  "plan": "<plan id>",
  "method": "bank_transfer",
  "status": "paid",
  "reference": "BANK-REF-001",
  "notes": "Optional notes"
}
```

`method` is `cash`, `bank_transfer`, `card`, or `other`. If `plan` is present and `amount` is omitted, the plan price is used. `status` defaults to `paid`; `pending` payments do not activate membership. A paid payment with a plan starts a new membership or extends a current membership by the plan's `durationDays`. The API only records the payment; it does not charge a payment method.

Refund is rejected with `409` if a later renewal has changed the member's membership end date. The admin must resolve that membership history manually before retrying.

## Attendance

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /attendance?page=1&limit=20&member=<id>&from=<date>&to=<date>&openOnly=true` | Signed-in | List visits |
| `POST /attendance/check-in` | Staff/admin | Check in member |
| `PATCH /attendance/:id/check-out` | Staff/admin | Close an open visit |
| `GET /attendance/:id` | Signed-in | Read visit |
| `DELETE /attendance/:id` | Admin | Delete visit record |

Check-in body:

```json
{ "member": "<member id>", "checkInAt": "2026-10-03T08:30:00.000Z", "notes": "Optional" }
```

Only active members with a valid membership at the check-in time may enter. A member cannot have more than one open visit. Check-out time is recorded by the API when the checkout request is received.

## Validation and pagination

Unknown fields in member, plan, and trainer create/update bodies are rejected. All record IDs must be valid MongoDB ObjectIds. List limits range from 1 to 100; defaults are page 1 and limit 20. Search input is treated as literal text rather than a regular expression.
