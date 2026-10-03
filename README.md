# BUILDION – Raise 2 Resolve

**BUILDION – Raise 2 Resolve** is a full-stack civic issues resolution hackathon prototype. It enables citizens to report local infrastructure issues (potholes, streetlights, drainage, waste management) with photo evidence while using an automated priority calculation algorithm and duplicate detection engine to streamline municipal authority resolution.

---

## 🚀 Key Features

### 👤 Citizen Features
- **Account Registration & Login**: Hashed passwords (`bcryptjs`) & JWT authentication (`jsonwebtoken`).
- **Report Issue Form**: Category, Severity (`low`, `medium`, `high`, `critical`), Location landmark, and Description.
- **Photo Evidence Upload**: Integrated `Multer` file upload storing images in `/uploads`.
- **Automatic Complaint Code**: Human-friendly tracking IDs generated automatically (e.g. `R2R-2026-0007`).
- **Duplicate Issue Detection**: Real-time detection of nearby similar issues with 1-click **Support Existing** option.
- **My Complaints View**: Filter and view issues reported by the logged-in citizen.
- **Resolution Timeline**: 4-step progress timeline (*Submitted* → *Verified* → *In Progress* → *Resolved*).

### 🏛️ Municipal Authority Features, GIS & Simulated Notifications
- **Statistics Overview**: Real-time counters for Total Issues, Urgent Priority Count, Pending, In Progress, and Resolved.
- **🗺️ GIS Sector Map Visualization**: Interactive geospatial Leaflet / OpenStreetMap visualization mapping tickets by latitude & longitude with category color coding and safe SVG fallback mode.
- **🔔 Simulated Email & SMS Notifications**: Instant generation of simulated Email (To, Subject, Body) and SMS alerts (mobile phone UI bubble preview) triggered automatically upon complaint status updates. Labeled clearly as **SIMULATED DEMO**.
- **1-Click Authority Demo Login**: Instant authority access button for hackathon demonstrations.
- **Search & Multi-Filters**: Filter queue by text search, Category/Sector, Severity, Status, and Priority level.
- **Verify & Flag Actions**: 1-click report verification (Shield Badge) or flagging invalid/duplicate entries.
- **Official Remarks & Status Change**: Record municipal progress notes, workforce dispatch details, and status updates directly in SQLite.
- **📊 Export CSV & 📄 Export PDF**: 1-click report exports respecting active filter selections.

### ⚡ Algorithmic Intelligence
- **Automatic Priority Score**: Calculates priority scores (0 - 100) based on severity, category impact, community upvotes, and age urgency.
- **Priority Reasons**: Human-readable explanation strings detailing score factors.

---

## 🛠️ Stack & Architecture

- **Frontend**: React (v18), Vite, JavaScript, CSS3 (BUILDION Blue/White theme), React Router (v6), Lucide Icons, Leaflet, jsPDF, jsPDF-AutoTable
- **Backend**: Node.js, Express.js
- **Database**: SQLite3 (`database.sqlite`)
- **Libraries**: JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`), File Uploads (`multer`), `cors`, `dotenv`

---

## 🗄️ Database Tables (SQLite)

1. **`users`**: `id`, `name`, `email`, `password`, `role` ('citizen' | 'authority'), `created_at`
2. **`complaints`**: `id`, `complaint_code`, `title`, `description`, `category`, `severity`, `location`, `latitude`, `longitude`, `status`, `image_url`, `user_id`, `priority_score`, `priority_reason`, `is_verified`, `is_flagged`, `flag_reason`, `created_at`
3. **`complaint_support`**: `id`, `complaint_id`, `user_id`, `created_at`
4. **`authority_updates`**: `id`, `complaint_id`, `official_id`, `update_text`, `status_change`, `action_type`, `created_at`

---

## 🔑 Demo Credentials

| Role | Email | Password | Quick Login |
| --- | --- | --- | --- |
| **Authority** | `authority@buildion.gov` | `authority123` | Click **"Demo Authority"** in Navbar |
| **Citizen** | `citizen@buildion.org` | `citizen123` | Form login or register new account |

---

## 🏃 How to Run

### 1. Install Dependencies
```bash
cmd /c "cd backend && npm install"
cmd /c "cd frontend && npm install --legacy-peer-deps"
```

### 2. Start Project
```bash
# Terminal 1: Backend Server (Port 5000)
cmd /c "cd backend && npm run dev"

# Terminal 2: Frontend Server (Port 5173)
cmd /c "cd frontend && npm run dev"
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
