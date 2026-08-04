# 🎓 Folder-Centric MOU Lifecycle & Document Management System

An enterprise-grade **Folder-Centric MOU Management System** built for universities, colleges, and higher education institutions. Inspired by **Google Drive**, **Microsoft OneDrive**, and **Dropbox**, the system organizes every MOU inside an organizational folder rather than separate MOU cards.

---

## 🌟 Key Architectural Highlights

### 📂 1. Folder-Centric Workflow (Google Drive / OneDrive Style)
- **Folder Repository**: Navigated using Google Drive style list views or grid views with status pills (`Active`, `Pending Verification`, `Draft`, `Expired`, `Renewed`).
- **Organization Folders**: Every MOU exists inside an organizational folder (*e.g. MOU Repository ➔ Engineering ➔ CSE ➔ ABC Technologies*).
- **Folder Details Page**: Opening any folder loads the complete MOU metadata, summary, purpose, beneficiaries/opportunities checkboxes, attached original & signed documents, vertical activity timeline, and approval/renewal controls.

### 📄 2. MOU Lifecycle & Expiry Calculator
- **Complete Status Progression**: `Draft` ➔ `Shared` ➔ `Signed` ➔ `Pending Verification` ➔ `Active` ➔ `Expiring Soon` ➔ `Expired / Renewed`.
- **Smart Expiry Calculation**: Computes $\text{Expiry Date} = \text{Signed Date} + \text{Duration (Months)}$. Always calculated from the actual **Signed Date**, never upload timestamp.
- **One-Click Renewal**: Clones prior folder data into a new version while preserving version history links.

### ⏰ 3. Daily Automated Expiry Reminders
- Background engine fires alerts at **30, 15, 7, and 1 day(s)** prior to expiration, plus **Expiry Day** notifications sent to admins and department coordinators.

### 📊 4. KPI Dashboards & Recharts Analytics
- **KPI Statistic Cards**: Total MOUs, Active, Pending Verification, Expiring Soon, Expired.
- **Folder Tables & Repositories**: Displaying recent organizational folders, department distribution donut chart, and growth trends.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Material-UI (MUI v9), Recharts, Lucide & MUI Icons, Custom Animation CSS |
| **Backend** | Python Django REST Framework (DRF), SQLite / PostgreSQL |
| **Authentication** | JWT Auth + Custom Role-Based Access Control (RBAC) |
| **Design Palette** | Primary Brand Indigo ➔ Violet Gradient (`#4F46E5` ➔ `#7C3AED`) + Department Signature Colors |

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python seed.py
python manage.py runserver
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```


## 📝 License
Distributed under the MIT License. Developed for higher education institutions.
