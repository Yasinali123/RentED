# Deployment Guide for RentEd

This guide contains step-by-step instructions for deploying the **RentEd** platform. Since the application is split into a frontend client (React + Vite) and a backend API server (Express + Node + Socket.io), the recommended deployment strategy is:
1. **Frontend (Client)**: Deployed on **Vercel** (optimised for static assets & SPA routing).
2. **Backend (Server)**: Deployed on **Render** (as a persistent Web Service to support persistent Socket.io connections & API requests).

---

## 1. Deploying the Backend on Render

Render will host the Node.js API server. Because RentEd uses Socket.io, you should choose a **Web Service** in Render.

### Steps:
1. Log in to the [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
2. Connect your Git repository.
3. Configure the following service settings:
   - **Name**: `rented-backend` (or your choice)
   - **Environment**: `Node`
   - **Plan**: `Free` (or higher)
   
   > [!NOTE]
   > You can configure the **Root Directory** in two ways. **Option A** is the simplest and doesn't require editing advanced fields:
   >
   > **Option A (Default - Root Directory is blank/empty)**
   > - **Root Directory**: *(leave completely blank / default)*
   > - **Build Command**: `npm run build`
   > - **Start Command**: `npm start`
   >
   > **Option B (Isolated server folder)**
   > - **Root Directory**: `server`
   > - **Build Command**: `npm install`
   > - **Start Command**: `npm start`

### Environment Variables on Render
Click on **Advanced** and add the following Environment Variables:

| Variable | Description | Example / Note |
| :--- | :--- | :--- |
| `NODE_ENV` | Mode of the server | `production` |
| `PORT` | Port number | `5000` *(Render sets this automatically, but good to define)* |
| `MONGODB_URI` | MongoDB Atlas Connection string | `mongodb+srv://<user>:<password>@cluster.mongodb.net/rented` |
| `JWT_SECRET` | Secret key for access token signing | *A long, randomly generated secure string* |
| `JWT_REFRESH_SECRET` | Secret key for refresh token signing | *A separate randomly generated secure string* |
| `CLIENT_URL` | URL of your deployed Vercel frontend | `https://rented-client.vercel.app` *(Must match Vercel URL exactly without a trailing slash)* |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary name for image uploads | *Your Cloudinary cloud name* |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | *Your Cloudinary API key* |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | *Your Cloudinary API secret* |
| `EMAIL_USER` | Gmail address for sending OTP emails | `your-email@gmail.com` |
| `EMAIL_PASS` | Gmail App Password | *16-character password generated from Google Account App Passwords* |
| `RAZORPAY_KEY_ID` | Razorpay payment gateway key | `rzp_test_...` (for test mode) or `rzp_live_...` |
| `RAZORPAY_KEY_SECRET`| Razorpay payment secret key | *Your Razorpay secret key* |
| `FIREBASE_SERVICE_ACCOUNT`| Firebase Admin SDK Credentials | Paste the single-line JSON string representing your Firebase Admin service account key |

> [!TIP]
> **Firebase Service Account Configuration**
> To get the `FIREBASE_SERVICE_ACCOUNT` value:
> 1. Go to Firebase Console > Project Settings > Service Accounts.
> 2. Click **Generate New Private Key** to download a `.json` file.
> 3. Compress the contents of that JSON file into a single line (remove line breaks) and paste it into the Render variable.
> 4. If this variable is missing, the server will run in a mock notification logging mode without throwing errors.

---

## 2. Deploying the Frontend on Vercel

Vercel will host the frontend React SPA. It has been pre-configured with SPA URL rewrites via `client/vercel.json`.

### Steps:
1. Log in to the [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
2. Import your Git repository.
3. Configure the following project settings:
   - **Framework Preset**: `Vite` (Vercel will auto-detect Vite)
   - **Root Directory**: `client` *(Important: Click "Edit" and choose the `client` directory)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add the API connection details:

| Variable | Description | Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Endpoint of your Render API backend | `https://rented-backend.onrender.com/api` *(Make sure to add `/api` at the end and do not put a trailing slash)* |

5. Click **Deploy**. Vercel will build the React SPA and give you a live production URL (e.g., `https://rented-client.vercel.app`).

---

## 3. Important Verification Steps After Deployment

Once both services are successfully deployed, perform the following validation checks:

1. **Update the Backend's `CLIENT_URL`:**
   After Vercel generates your live URL, make sure to copy it and update the `CLIENT_URL` environment variable on your Render Web Service. If they don't match, CORS will block all requests. After changing the Render variable, trigger a redeploy of the Render service.

2. **Verify Cookie-based Authentication:**
   Open the browser's Developer Tools (F12) -> Application -> Cookies.
   Log in to RentEd. You should see `accessToken` and `refreshToken` cookies saved on the `.onrender.com` domain with:
   - `HTTPOnly: True`
   - `Secure: True`
   - `SameSite: None`

3. **Verify Socket.io connection:**
   Open the Chat page. Click on any active chat and inspect the Web Console. If the socket connects successfully, real-time message indicators, typing statuses, and instant message delivery will function without issues. If there are authorization errors, check that the `rented_token` key is populated in the browser's `localStorage`.
