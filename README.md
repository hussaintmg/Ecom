# 🛍️ Modern Ecommerce Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

A high-performance, aesthetically pleasing ecommerce solution built with the latest web technologies. Designed for speed, scalability, and a premium user experience.

---

## ✨ Features

- **🚀 Server-Side Rendering (SSR)** – Lightning-fast page loads with Next.js App Router (v16).
- **🎨 Premium UI/UX** – Fluid animations (Framer Motion) and a clean, modern design (Tailwind CSS 4).
- **🔐 Secure Auth System** – Role-based access (Owner, Admin, User) with JWT & Cookie sessions.
- **🛠️ Command Center** – Integrated dashboards for Owners and Admins to manage products, orders, and inquiries.
- **📩 Verification Flow** – Secure password recovery via 6-digit email codes (Nodemailer).
- **🛒 Dynamic Experience** – Instant cart updates with persistent storage and real-time inventory checks.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16 (Turbopack)](https://nextjs.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Database:** [MongoDB (Mongoose)](https://www.mongodb.com/)
- **Auth:** JWT + Bcrypt + Jose (Edge Ready)
- **Mailing:** [Nodemailer](https://nodemailer.com/)

---

## 📂 Project Structure

```text
├── app/              # Next.js App Router (Pages, Layouts, API)
│   ├── (auth)/        # Identity management (Login, Register, Forgot)
│   ├── admin/         # Admin Management Panes
│   ├── owner/         # Absolute Owner Command Center
│   └── api/           # Unified API Services
├── components/       # UI Primitives & Domain-Specific Components
├── models/           # Mongoose Data Schemas
├── utils/            # Helper functions, DB connection, Auth Helpers
└── proxy.ts          # Core Request Interceptor (Legacy Middleware replacement)
```

---

## 🚀 Development

### Prerequisites
- Node.js 18.x or later
- MongoDB Connection String
- Gmail App Password (for Nodemailer)

### Variable Configuration
Ensure `.env.local` contains:
- `MONGODB_URI`
- `JWT_SECRET`
- `EMAIL_USER` / `EMAIL_PASS`
- `ADMIN_CODE` / `OWNER_CODE` (Used as password prefix during signup)

---

<p align="center">Made with ❤️ by Antigravity for a better shopping experience.</p>
