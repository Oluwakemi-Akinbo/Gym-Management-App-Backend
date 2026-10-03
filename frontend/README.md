# Gym Management Frontend

React + Vite staff dashboard for the Gym Management API. It uses the live API for sign-in, members, plans, trainers, payments, attendance, and admin staff access.

## Run locally

1. Start MongoDB and the backend API (the backend runs at `http://localhost:5000` by default).
2. Open a terminal in this `frontend` folder.
3. Install packages once: `npm install`
4. Copy `.env.example` to `.env` if your API is not at the default address. Set `VITE_API_URL` to the backend API base URL, for example `http://localhost:5000/api/v1`.
5. Start the frontend with `npm run dev` and open the local URL Vite prints (normally `http://localhost:5173`).
6. Sign in with the admin or staff account created through the backend.

The first admin registration is a one-time backend setup. Public registration is intentionally not included in this staff-facing interface because the backend closes it after the first admin is created.

## Frontend stack

- React 18
- Vite
- React Icons via Lucide
- Native Fetch API for backend requests
- Plain CSS with responsive layouts

The backend API reference lives at `../backend/docs/API.md`.
