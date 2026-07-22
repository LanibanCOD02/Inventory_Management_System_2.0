# MSC Trust Inventory Management System

A monolithic, full-stack web application for managing stock, inventory movements, branches, and donations for M.S. Chellamuthu Trust & Research Foundation.

## Features
- Real-time inventory tracking
- Stock transfers between branches and blocks
- Image uploads for products and bills
- Detailed reporting and Excel exports
- Secure authentication

## Local Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy `.env.example` to `.env` and adjust the variables.
   ```bash
   cp .env.example .env
   ```

3. **Start the Server**
   ```bash
   npm start
   ```
   The application will run locally at `http://localhost:3000`. By default, the SQLite database and all uploads will be stored inside the `./data` directory, which is automatically created on startup.

## Production Deployment (Northflank)

This application is designed to be deployed as a **Single Service** on Northflank, serving both the frontend API and backend simultaneously.

### Northflank Configuration

- **Service Type**: Combined Service
- **Runtime**: Node.js (v20)
- **Install Command**: `npm ci --omit=dev`
- **Build Command**: (Leave empty, no build required)
- **Start Command**: `node server.js`
- **Working Directory**: `/` (root)

### Persistent Volumes
Because this application uses SQLite and local file uploads, you **must** configure a Persistent Volume in Northflank so data is not lost when the container restarts.

- **Mount Path**: `/data`
- **Size**: 1GB (or as needed)

### Environment Variables
Configure the following Environment Variables in your Northflank Service:
- `PORT`: `3000`
- `NODE_ENV`: `production`
- `DATA_DIR`: `/data`
- `JWT_SECRET`: A secure random string (used for authentication tokens).

## Backup and Restore Strategy

**Backup:**
The application includes a built-in zip backup endpoint (`/api/reports/backup-zip`). You can also manually download the `database.db` and `uploads` folders directly from your Northflank Volume using their UI or CLI.

**Restore:**
To restore a backup, upload the `database.db` file and the `uploads` directory back into your mounted `/data` volume on Northflank and restart the service.
