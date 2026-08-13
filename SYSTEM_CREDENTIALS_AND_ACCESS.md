# Event Ticketing System - Credentials & Access Guide

This document contains all login credentials, access PINs, local URLs, and API header keys for the **ROCKSTAR Movie Night** ticketing and gate scanner system.

---

## 🌐 Local Host URLs

- **Guest Ticket Portal**: [http://localhost:3000](http://localhost:3000)
- **Staff & Admin Login**: [http://localhost:3000/staff/login](http://localhost:3000/staff/login)
- **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Attendee Directory**: [http://localhost:3000/admin/attendees](http://localhost:3000/admin/attendees)
- **Gate Scanner Dashboard**: [http://localhost:3000/staff/dashboard](http://localhost:3000/staff/dashboard)

---

## 🔑 Login Credentials & Access PINs

| Role | Username | Password / Access PIN | Target Dashboard |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin` *(or `admin`)* | `admin098` / `admin8824` / `admin123` | `/admin` |
| **Manager (Ankur Bishnoi)** | `ankur` | `ankur1234` | `/admin` |
| **Manager (Angad Bishnoi)** | `angad` | `angad1234` | `/admin` |
| **Gate Security Staff** | `staff` *(or `gate`)* | `staf1234` / `gate123` | `/staff/dashboard` |

> [!TIP]
> On the login page ([http://localhost:3000/staff/login](http://localhost:3000/staff/login)), entering **just the access code** without typing a username will automatically detect your role and log you in!

---

## 🛡️ API Credentials & System Headers

- **Branding Admin Header**: `Authorization: admin098` or `Authorization: admin8824` (Used for updating event settings via POST `/api/event/settings`)
- **Admin API Secret**: `x-admin-key` header (Configured via `ADMIN_API_SECRET` in `.env.local`)

---

## 🍿 Current Event Configuration

- **Event**: `ROCKSTAR` - *A Bollywood Themed Movie Experience*
- **Date**: `16 AUG 2026 (SUNDAY)`
- **Time**: `8:00 PM ONWARDS` *(Gates open 7:30 PM)*
- **Venue**: `Tastora Cafe` *(Gali No. 9, Opp. AIIMS Resident Gate, Jodhpur)*
- **Organizers**: `House of Chaos`
- **Pass Details**: `Phase 1 Pass ₹399 Only (Includes ₹300 Cover Credit)`
- **Theme Color**: `Red`
