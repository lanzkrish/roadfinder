# Carpe Terra — Express Backend

This is the standalone Node.js/Express backend for Carpe Terra. It mirrors the exact same API routes provided by the Next.js frontend, allowing you to split your architecture and host the API independently (e.g., on Render) while hosting the Next.js frontend separately (e.g., on Netlify/Vercel).

## Tech Stack
- **Express.js** + TypeScript
- **Mongoose / MongoDB** (Database)
- **Nodemailer** (SMTP Email Verification)
- **AES-256-GCM** (Email Encryption)
- **bcrypt + JWT** (Authentication)
- **express-rate-limit** (Rate limiting & Security protection)

## Setup Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables. Rename `.env.example` (or create a new `.env` file) and fill it in:
   ```env
   # Ensure these values match your Next.js environment so tokens & encryption work cross-platform
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your_jwt_secret
   ENCRYPTION_KEY=your_64_char_hex_key
   OVERPASS_API_URL=https://overpass-api.de/api/interpreter

   # SMTP Setup (e.g., Gmail App Password)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   SMTP_FROM="Carpe Terra <your_email@gmail.com>"

   FRONTEND_URL=http://localhost:3000
   PORT=8080
   NODE_ENV=development
   ```

3. Run the development server (uses `ts-node-dev` for auto-restart):
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:8080`.

## Available Routes

### Auth (`/api/auth`)
- `POST /register`: Register a new user and send an SMTP 6-digit verification code.
- `POST /verify-otp`: Verify the code and issue an HTTP-only JWT cookie.
- `POST /login`: Log in to an existing, verified account.
- `POST /logout`: Clear the HTTP-only JWT cookie.
- `GET /me`: Get current authenticated user details.

### Locations (`/api`)
- `GET /generate-location?lat=X&lng=Y&radius=Z`: Scrape Overpass API, rate limited to 10/min.
- `POST /save-location`: Save a discovered route to the database.

### User (`/api/user`)
- `GET /locations?limit=20&page=1`: Fetch a user's logged routes (paginated).

## Deployment (Render)

A `render.yaml` file is provided in the root repository. To deploy this standalone backend to Render:

1. Connect your GitHub repository to Render as a **Web Service**.
2. Point the **Root Directory** to `server`.
3. Render will automatically use the `package.json` build and start scripts.
4. Set your production environment variables inside the Render dashboard (ensure `FRONTEND_URL` is set to your actual Netlify/Vercel URL for CORS).

## Build Commands

When deploying or preparing for production, here is how you build both parts of the application:

### 1. Build the Express Server (Backend)
Run this inside the `server/` directory:
```bash
cd server
npm install
npm run build
npm start
```

### 2. Build the Next.js App (Frontend)
Run this from the root directory (`/roadfinder`):
```bash
# Go back to the root if you are inside server/
cd ..
npm install
npm run build
npm start
```
