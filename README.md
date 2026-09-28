# 🚀 QueueLess — Smart Digital Queue & Token Management System

> **Eliminate Physical Lines. Forever.**
> Built with HTML, CSS, JavaScript → Node.js, Express → MongoDB.
> Featuring the vibrant **Bounce Terracotta / Burnt Orange & Obsidian** design language.

---

## 🎨 Design Aesthetic ("Bounce" Style)
Inspired by the sports event UI in the reference:
- **Primary Color:** Vibrant Terracotta / Burnt Orange (`#E85025`)
- **Accent & Dark:** Deep Obsidian Charcoal (`#121316` / `#1B1C22`)
- **Background:** Warm Sandstone & Ivory Canvas (`#FAF8F5`)
- **Card Surfaces:** Crisp White (`#FFFFFF`) with subtle warm borders and elevation shadows
- **Buttons:** Rounded full pills with circular arrow badges (`→`)
- **Interactive Ticket:** High-impact digital pass with perforation notches, real-time position counter, estimated wait duration, and audio chimes

---

## 🏗️ Architecture & Modules (Phases 1 — 18)

| Phase | Module | Implementation |
|---|---|---|
| **Phase 1** | Project Setup | Clean modular structure (`models`, `routes`, `controllers`, `public`, `views`) |
| **Phase 2** | MongoDB Database | Collections: `Users`, `Services`, `Counters`, `Tokens`, `History` |
| **Phase 3** | Backend Setup | Node.js + Express + Mongoose + JWT + Embedded Mongo Fallback |
| **Phase 4** | Authentication | Password hashing (Bcrypt), JWT Auth, Admin & User roles |
| **Phase 5** | User Dashboard | Real-time ticket pass, position tracking, queue ladder, history |
| **Phase 6** | Service Selection | College Office (A), Laboratory (B), Clinic (C), Certificate Section (D) |
| **Phase 7** | Token Generation ⭐ | Atomic sequence numbers, strict department prefixes (A001, A002...), zero collisions |
| **Phase 8** | Queue Position | Dynamic recalculation (`waitingAhead + 1`) as lines move |
| **Phase 9** | Wait Estimation | Formula: `Waiting People Before You × Avg Turnaround Time` |
| **Phase 10** | Admin Dashboard ⭐ | Command center with stats, dispatch controls, CRUD modals |
| **Phase 11** | Call Next Token ⭐ | Automatically completes previous token and summons next in line |
| **Phase 12** | Skip / Cancel | Dedicated state transitions (`SKIPPED`, `CANCELLED`) |
| **Phase 13** | Queue Monitoring | Live counters: Total Waiting, Now Serving, Completed, Skipped, Cancelled |
| **Phase 14** | Queue History | Full user and administrative service-record logs |
| **Phase 15** | Full CRUD | Complete Create, Read, Update, Delete for Services & Counters |
| **Phase 16** | UI Design | High-contrast Bounce terracotta theme with pill badges and modern typography |
| **Phase 17** | Testing | Comprehensive endpoint testing across all routes |
| **Phase 18** | Final Integration | Fully integrated live system with Hall Display screen |

---

## ⚡ Quick Demo Accounts

Pre-seeded for instant 1-click testing:

| Role | Email | Password | Access |
|---|---|---|---|
| **Administrator** | `admin@queueless.com` | `admin123` | Full Admin Command Center |
| **Student User** | `athul@example.com` | `user123` | User Dashboard & Token Generation |

*(One-click quick login buttons are also built directly into the login screen!)*

---

## 🌐 URLs & Pages

- **Landing Page:** [http://localhost:5000/](http://localhost:5000/)
- **User Dashboard:** [http://localhost:5000/user-dashboard](http://localhost:5000/user-dashboard)
- **Admin Dashboard:** [http://localhost:5000/admin-dashboard](http://localhost:5000/admin-dashboard)
- **Public TV / Hall Board:** [http://localhost:5000/display](http://localhost:5000/display)
- **Login:** [http://localhost:5000/login](http://localhost:5000/login)
- **Register:** [http://localhost:5000/register](http://localhost:5000/register)

---

## 🚀 How to Run

1. Open terminal in `queueless/`:
   ```bash
   cd queueless
   npm install
   npm start
   ```
2. Open [http://localhost:5000](http://localhost:5000) in your browser!
