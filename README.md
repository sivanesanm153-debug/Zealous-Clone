# Vertex XR Agency Platform

A premium, interactive agency platform for **Vertex XR** (3D design, AR/VR solutions, and real-time digital twins). Built with a lightweight Node.js/Express backend, embedded leads database, and a responsive frontend featuring 3D visualizations, an interactive project estimator, and a secure leads administration dashboard.

---

## 🚀 Quick Start

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v16+ recommended).

### 2. Installation
Clone or extract the repository, and run the following command in the root folder to install dependencies:
```bash
npm install
```

### 3. Run Locally
To run the server in development mode (with auto-restart on file changes):
```bash
npm run dev
```

To run the server in production mode:
```bash
npm start
```

Once started, access the project at:
* **Website**: `http://localhost:3000`
* **Admin Dashboard**: `http://localhost:3000/admin`
* **Default Admin Token**: `vertexXR-admin-2026`

---

## 🔒 Production Security

The administration dashboard is protected via Bearer authentication using an admin token.

To change the token in production, set the environment variable:
```bash
ADMIN_TOKEN=your-secure-secret-token-here
```
The application will automatically detect this environment variable and require it for dashboard access and CSV exports.

---

## ☁️ Deployment

This project is fully ready for deployment using two primary options:

### Option A: Persistent Servers (Recommended for NeDB)
*Platforms like **Render**, **Railway**, **Heroku**, or **DigitalOcean**.*
* Since this app uses a lightweight embedded file-based database (`db/leads.db`), running on a persistent server ensures all submitted contact leads are saved permanently to the server's disk.

### Option B: Serverless (e.g., Vercel)
* This project includes a pre-configured `vercel.json` file.
* **Important Note**: Serverless functions have temporary/ephemeral filesystems. Leads saved will be deleted whenever the function instance spins down. If deploying to Vercel, it is recommended to replace the NeDB storage in `server.js` with an external database (e.g., MongoDB Atlas) or a webhook to email leads directly to your client.

---

## 📂 Project Structure

* `server.js` - Main backend server containing API endpoints for lead intake, CSV exports, status updates, and page routing.
* `index.html` & `style.css` - Responsive landing page containing interactive 3D assets, project estimator, and contact form.
* `app.js` - Homepage interactivity and client-side form submission handling.
* `admin.html` & `admin.js` - Secure administration panel for reviewing intake pipelines, updating lead status, and exporting leads as CSV.
* `services/` - Subpages, custom styles, and scripts for specific agency offerings.
* `api/` - Vercel serverless function entrypoint.
* `db/` - Storage location for the database.
