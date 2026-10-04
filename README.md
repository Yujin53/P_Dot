# P_Dot — Tuguegarao-Native Ride-Hailing & Local Transport Platform

[![Node.js](https://img.shields.io/badge/Node.js-v24.21.0-339933?logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21.2-000000?logo=express)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-9.0-47A248?logo=mongodb)](https://www.mongodb.com)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Location](https://img.shields.io/badge/Location-Tuguegarao%20City-teal)](https://en.wikipedia.org/wiki/Tuguegarao)

**P_Dot** is an original, full-stack, browser-based ride-hailing and local transport management web application built specifically for **Tuguegarao City, Cagayan Valley (Region II), Philippines**.

It addresses the lack of modern, locally focused ride-hailing services in Tuguegarao (such as Grab or JoyRide) by providing a unified web platform where local passengers can request rides with upfront fare estimates and verified local drivers (tricycles, sedans, vans, and motorcycles) can receive, manage, and complete bookings under administrative oversight.

---

## Table of Contents
1. [Product Overview & Local Context](#product-overview--local-context)
2. [Key Features](#key-features)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Technology Stack](#technology-stack)
5. [Project Architecture & File Tree](#project-architecture--file-tree)
6. [Database Schema & Models](#database-schema--models)
7. [Ride Lifecycle & State Machine](#ride-lifecycle--state-machine)
8. [Installation & Getting Started](#installation--getting-started)
9. [Pre-Seeded Demo Accounts](#pre-seeded-demo-accounts)
10. [REST API Documentation](#rest-api-documentation)
11. [Security Architecture](#security-architecture)
12. [Local MVP Scope & Future Roadmap](#local-mvp-scope--future-roadmap)
13. [Feature Verification Checklist](#feature-verification-checklist)

---

## 1. Product Overview & Local Context

Tuguegarao City is the premier regional center of Cagayan Valley, featuring busy transportation corridors connecting:
- **Major Hubs**: Tuguegarao City Hall, Robinsons Place Tuguegarao, SM Center Tuguegarao, Tuguegarao Airport (Pengue-Ruyu), Cagayan Valley Medical Center (Carig), St. Paul University Philippines, Buntun Bridge.
- **Key Barangays**: Centro (1–12), Carig Sur/Norte, Caggay, Buntun, Capatan, Pengue-Ruyu, San Gabriel, Ugac Sur/Norte, Balzain, Cataggaman, Linao.

P_Dot provides:
- **Local-first fare estimation**: Built-in Haversine distance engine referencing actual Tuguegarao landmarks and barangays.
- **Multi-modal transport**: Support for local motorized tricycles, passenger sedans, group vans, and delivery/express motorcycles.
- **Original Branding & Design**: Modern teal and amber design system with accessible contrast, responsive desktop sidebars, and mobile bottom navigation.
- **Transparent Local MVP**: Operates cleanly on `http://localhost:5000` with no external paid Google Maps API dependencies required for the core experience.

---

## 2. Key Features

### Passenger Portal
- **Interactive Booking Flow**: Select pickup and destination from Tuguegarao landmarks or custom addresses.
- **Live Fare Calculator**: Real-time upfront quote with transparent distance, base fare, and booking fee breakdown.
- **Active Ride Tracking**: Responsive 6-step progress tracker with auto-refresh polling, driver avatar, vehicle license plate, and quick cancellation dialog.
- **Trip History & Digital Receipt**: Paginated history with printable receipts and timestamps.
- **Saved Places**: CRUD for frequent destinations (e.g., Home, Work, University, Mall).
- **Post-Ride Driver Ratings**: 1-to-5 star rating and comment modal (only available after successful ride completion).

### Driver Portal
- **Quick Onboarding & Document Upload**: Upload Driver's License, OR/CR, and vehicle photos via Multer with MIME verification.
- **Online/Offline Switcher**: Prevents unapproved drivers or drivers with active trips from toggling online.
- **Real-Time Request Queue**: Polls for available rides in Tuguegarao and displays pickup/destination distance.
- **Interactive Trip Execution**: Step-by-step state machine: `Arriving` &rarr; `Arrived` &rarr; `Start Trip` &rarr; `Complete & Collect Cash/Payment`.
- **Earnings & Trip Ledger**: Daily and cumulative earnings breakdown in Philippine Pesos (PHP).

### Administrator Portal
- **Live Operational Dashboard**: Real-time counters for users, active drivers, rides today, completed rides, and total revenue.
- **Driver Verification Center**: Inspect uploaded licenses and OR/CR documents; approve, reject with reason, or suspend accounts.
- **User & Fleet Management**: View and update account statuses across passengers, drivers, and vehicles.
- **All Rides & Dispatch Override**: Live ride monitoring with emergency reassignment or cancellation authority.
- **Configurable Fare Rules**: Dynamic base fares, per-km rates, per-minute rates, minimum fares, and peak-hour multipliers stored in MongoDB.
- **Tuguegarao Landmark Directory**: Add and manage local landmarks, aliases, and barangays.
- **System Announcements**: Broadcast operational notices to all users or specific roles.
- **Permanent Audit Trail**: All administrative overrides, approvals, and status changes are permanently logged with IP and actor IDs.

---

## 3. User Roles & Permissions

| Role | Access Scope |
| :--- | :--- |
| `passenger` | Can request rides, cancel eligible bookings, view active ride status, save places, rate drivers, and submit support tickets. |
| `driver` | Can manage vehicle details, upload verification documents, toggle online/offline, accept dispatch requests, advance trip states, view earnings, and review passenger ratings. |
| `admin` | Full operational control over Tuguegarao drivers, vehicles, users, fare rules, service locations, and support tickets. |
| `superadmin` | Unrestricted authority including administrator role assignments. The primary superadmin cannot be deleted or disabled. |

---

## 4. Technology Stack

- **Backend Runtime**: Node.js (v24.x)
- **Web Framework**: Express.js (v4.21.x)
- **Database**: MongoDB 9.0 via Mongoose ODM (v8.9.x)
- **Authentication**: Stateless JSON Web Tokens (JWT) + bcryptjs (10 salt rounds)
- **Security**: Helmet HTTP headers, CORS, express-rate-limit, input sanitization
- **File Uploads**: Multer with strict image and document MIME-type checks
- **Frontend**: Semantic HTML5, CSS3 Custom Properties (Modern CSS Variables), Vanilla JavaScript (ES6+ Fetch API, no external framework dependencies)

---

## 5. Project Architecture & File Tree

```
P_Dot/
├── backend/
│   ├── config/
│   │   └── db.js                      # MongoDB connection handler
│   ├── controllers/
│   │   ├── adminController.js         # Operations, dashboard, reports, broadcasts
│   │   ├── authController.js          # Register, login, password change, JWT
│   │   ├── driverController.js        # Onboarding, documents, earnings, availability
│   │   ├── fareController.js          # Fare quotes, public locations, rules
│   │   ├── notificationController.js  # In-app alerts, read receipts
│   │   ├── ratingController.js        # Trip reviews & driver aggregates
│   │   ├── rideController.js          # Dispatch, state machine, atomic acceptance
│   │   ├── supportController.js       # User support tickets & attachments
│   │   ├── userController.js          # Profile CRUD, saved places
│   │   └── vehicleController.js       # Fleet & vehicle registration
│   ├── middleware/
│   │   ├── adminMiddleware.js         # Superadmin / admin role guard
│   │   ├── authMiddleware.js          # Bearer JWT verification
│   │   ├── driverMiddleware.js        # Driver verification & approval validation
│   │   ├── errorMiddleware.js         # Centralized error & 404 handler
│   │   ├── roleMiddleware.js          # Role-based route guard
│   │   ├── uploadMiddleware.js        # Multer disk storage & file filters
│   │   └── validationMiddleware.js    # PH mobile number & email sanitization
│   ├── models/
│   │   ├── AuditLog.js                # System audit trail
│   │   ├── DriverProfile.js           # Verification, license, availability
│   │   ├── FareRule.js                # Configurable pricing formulas
│   │   ├── Location.js                # Tuguegarao landmarks & barangays
│   │   ├── Notification.js            # In-app message inbox
│   │   ├── Rating.js                  # 1-to-5 star ratings & comments
│   │   ├── Ride.js                    # Dispatch lifecycle & trip details
│   │   ├── SupportTicket.js           # Helpdesk records & resolutions
│   │   ├── User.js                    # Core user credentials & role
│   │   └── Vehicle.js                 # Driver vehicles & license plates
│   ├── routes/                        # Express API route bindings
│   ├── services/
│   │   ├── auditService.js            # Audit logger helper
│   │   ├── fareService.js             # Haversine distance & peak fare engine
│   │   ├── notificationService.js     # Dispatch alert generator
│   │   └── rideMatchingService.js     # Driver distance matcher
│   ├── uploads/                       # Safe local disk file storage
│   ├── seed.js                        # Master database seeder
│   └── server.js                      # Main Express application entrypoint
├── frontend/
│   ├── index.html                     # Public landing page with live fare preview
│   ├── login.html                     # Unified role login with 1-click demo buttons
│   ├── register.html                  # Passenger registration form
│   ├── driver-register.html           # Driver registration & onboarding form
│   ├── about.html                     # About P_Dot Tuguegarao
│   ├── help.html                      # Emergency contacts & Tuguegarao hotline
│   ├── passenger/                     # Passenger Web Portal
│   │   ├── dashboard.html             # Overview, active ride widget, recent rides
│   │   ├── request-ride.html          # Interactive booking form & landmark chips
│   │   ├── active-ride.html           # Live status timeline & driver details
│   │   ├── ride-details.html          # Printable trip receipt
│   │   ├── ride-history.html          # Paginated booking log
│   │   ├── saved-places.html          # Saved locations CRUD
│   │   ├── ratings.html               # Reviews submitted
│   │   └── profile.html               # Passenger profile & password
│   ├── driver/                        # Driver Web Portal
│   │   ├── dashboard.html             # Online toggle, live dispatch queue
│   │   ├── onboarding.html            # Step-by-step onboarding guide
│   │   ├── verification.html          # Document uploads & review status
│   │   ├── vehicle.html               # Vehicle management
│   │   ├── available-rides.html       # Queue of available rides
│   │   ├── active-trip.html           # Turn-by-turn trip state machine
│   │   ├── trip-history.html          # Completed trip log
│   │   ├── earnings.html              # Daily & weekly earnings summary
│   │   └── profile.html               # Driver information & location
│   ├── admin/                         # Administrator Web Portal
│   │   ├── dashboard.html             # Operational metrics & recent audits
│   │   ├── users.html                 # Passenger & driver account status
│   │   ├── drivers.html               # Document review & application approvals
│   │   ├── rides.html                 # Fleet dispatch overview & reassign
│   │   ├── vehicles.html              # Vehicle registry
│   │   ├── fares.html                 # Dynamic fare rules manager
│   │   ├── locations.html             # Tuguegarao landmarks manager
│   │   ├── reports.html               # 7-day analytics & top barangays
│   │   ├── support.html               # Support tickets resolution
│   │   ├── notifications.html         # Broadcast announcements
│   │   ├── audit-logs.html            # Tamper-evident operational audit logs
│   │   └── settings.html              # Dispatch & service parameters
│   ├── css/                           # Pure CSS design system
│   └── js/                            # Modular JavaScript utilities
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## 6. Database Schema & Models

All models are defined with Mongoose schemas and strict validation:
1. **User**: Name, unique email, unique username, password hash (hidden from queries via `select: false`), Philippine phone (`+639XXXXXXXXX`), profile photo, role (`passenger`, `driver`, `admin`, `superadmin`), account status.
2. **DriverProfile**: Foreign key to `User`, license reference, government ID reference, home barangay, emergency contact, verification status (`pending`, `under_review`, `approved`, `rejected`, `suspended`), `isOnline` boolean, last known coordinates.
3. **Vehicle**: Unique plate number, make, model, year, color, service type (`tricycle`, `sedan`, `van`, `motorcycle`), passenger capacity, verification status.
4. **Ride**: Passenger ID, Driver ID, Vehicle ID, pickup/drop-off objects (label, barangay, landmark, coordinates), estimated distance (km), duration (mins), estimated fare, final fare, payment method (`cash`, `recorded_digital_payment`), status timestamps.
5. **FareRule**: Base fare, base distance (km), per-km rate, per-minute rate, minimum fare, booking fee, peak multiplier, active peak hours (`07:00-09:00`, `17:00-19:00`).
6. **Location**: Tuguegarao location name, category (`landmark`, `barangay`, `hospital`, `mall`, `school`, `terminal`, `government_office`), coordinates, search aliases.
7. **Rating**: 1-to-5 numeric score, text comment, unique compound index per completed ride.
8. **Notification**: Recipient reference, title, message, type, read receipt.
9. **SupportTicket**: Ticket category, subject, description, status (`open`, `in_review`, `resolved`, `closed`), attachments.
10. **AuditLog**: Admin actor ID, action name, target document, IP address, timestamp.

---

## 7. Ride Lifecycle & State Machine

P_Dot implements a strict, server-enforced state machine to prevent illegal transitions:

```
[ requested ] ───> [ searching ] ───> [ accepted ]
                           │                │
                           │                ├───> [ driver_arriving ]
                           │                │            │
                           │                │            ▼
                           │                │     [ driver_arrived ]
                           │                │            │
                           │                │            ▼
                           │                │     [ trip_started ]
                           │                │            │
                           │                │            ▼
                           │                │     [ completed ] ──> (Rating Enabled)
                           │                │
                           ▼                ▼
                [ no_driver_available ]  [ cancelled_by_* ]
```

### Race-Condition Protection
When a driver accepts a ride, the backend uses atomic MongoDB operations:
```javascript
const ride = await Ride.findOneAndUpdate(
  { _id: rideId, status: { $in: ['requested', 'searching'] } },
  { $set: { driver: driverId, status: 'accepted', acceptedAt: new Date() } },
  { new: true }
);
```
If two drivers click "Accept" simultaneously, only the first request succeeds; the second receives an explicit `409 Conflict` error.

---

## 8. Installation & Getting Started

### Prerequisites
- **Node.js**: v18.x, v20.x, or v24.x installed
- **MongoDB**: MongoDB Community Server 7.0, 8.0, or 9.0 running locally on default port `27017`

### 1. Clone & Install Dependencies
Open PowerShell or your preferred terminal in the project directory:
```bash
cd c:\Users\david\OneDrive\Desktop\P_Dot
npm install
```

### 2. Configure Environment Variables
Create or verify `.env` in the project root:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/p_dot
JWT_SECRET=p_dot_tuguegarao_secure_jwt_secret_key_2026
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@pdot.ph
ADMIN_PASSWORD=AdminPdot2026!
DEFAULT_CURRENCY=PHP
DEFAULT_CITY=Tuguegarao City
```

### 3. Seed Master Data & Test Accounts
Run the automated seed script to populate Tuguegarao landmarks, official fare rules, and verified test accounts:
```bash
npm run seed
```

### 4. Resetting the Database (Clean Slate)
To completely wipe all test bookings, ratings, and driver records, and restore the database to a pristine seed state:
```bash
npm run reset
```

### 5. Running Automated Smoke Tests
To run an automated end-to-end API test that verifies server reachability, public endpoints, authentication, RBAC boundaries, and complete ride lifecycle (request -> accept -> arrive -> start -> complete -> rate):
```bash
# Make sure the server is running first (npm run dev), then in another terminal:
npm run smoke
```

### 6. Start the Application
Start the server in development mode (with auto-restart via nodemon) or standard production mode:
```bash
# Development mode
npm run dev

# Or standard production mode
npm start
```

### 7. Access the Web Application
Open your browser and navigate to:
```
http://localhost:5000/
```

---

## 9. Pre-Seeded Demo Accounts

The seed script creates ready-to-test accounts across all roles:

| Role | Email | Password | Pre-Configured State |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | `admin@pdot.ph` | `AdminPdot2026!` | Full administrator & dispatch privileges |
| **Verified Driver** | `driver@demo.pdot` | `Password123!` | Approved driver profile, Tricycle `TUG-4091`, ready to toggle online |
| **Passenger** | `passenger@demo.pdot` | `Password123!` | Active passenger with saved places in Tuguegarao |

*Tip: The login page at `http://localhost:5000/login.html` features 1-click demo fill buttons to immediately populate credentials.*

---

## 10. REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new passenger
- `POST /api/auth/register-driver` — Register driver with document uploads
- `POST /api/auth/login` — Login with username/email and password
- `POST /api/auth/logout` — Invalidate session
- `GET  /api/auth/me` — Retrieve current authenticated user
- `PUT  /api/auth/change-password` — Change password

### Passenger & User Services (`/api/users`)
- `GET    /api/users/profile` — Get profile details
- `PUT    /api/users/profile` — Update name, phone, or avatar
- `GET    /api/users/saved-places` — List passenger's saved Tuguegarao places
- `POST   /api/users/saved-places` — Add saved place
- `DELETE /api/users/saved-places/:id` — Delete saved place

### Driver Operations (`/api/drivers`)
- `GET /api/drivers/profile` — Driver profile and vehicle details
- `GET /api/drivers/verification-status` — Document status & review feedback
- `PUT /api/drivers/availability` — Toggle online/offline status with current coordinates
- `GET /api/drivers/ride-requests` — Poll incoming ride requests
- `GET /api/drivers/earnings` — Earnings summary (today, this week, all-time)
- `POST /api/drivers/documents` — Upload license/ID verification documents

### Vehicle Management (`/api/vehicles`)
- `GET    /api/vehicles/my` — Get driver's registered vehicles
- `POST   /api/vehicles` — Register a new vehicle
- `PUT    /api/vehicles/:id` — Update vehicle details
- `DELETE /api/vehicles/:id` — Remove vehicle

### Ride Dispatch & Lifecycle (`/api/rides`)
- `POST /api/rides/estimate` — Calculate upfront fare estimate
- `POST /api/rides` — Create new ride request
- `GET  /api/rides` — List rides (filtered by role and status)
- `GET  /api/rides/:id` — Get full ride details
- `PUT  /api/rides/:id/accept` — Driver accepts ride (atomic lock)
- `PUT  /api/rides/:id/status` — Advance state (`driver_arriving`, `trip_started`, `completed`)
- `PUT  /api/rides/:id/cancel` — Cancel ride with required reason
- `GET  /api/rides/:id/summary` — Digital trip receipt

### Pricing & Landmarks (`/api`)
- `GET /api/fare-rules` — List active service fare rules
- `GET /api/fares/estimate` — Calculate dynamic fare
- `GET /api/locations` — Tuguegarao landmarks and pickup points
- `GET /api/service-areas` — Verified operational service boundaries

### Ratings & Feedback (`/api/ratings`)
- `POST /api/ratings` — Submit 1-to-5 star rating for completed trip
- `GET  /api/ratings/my` — View ratings submitted by passenger
- `GET  /api/ratings/driver/:driverId` — Aggregate score and feedback for driver

### Admin Control (`/api/admin`)
- `GET  /api/admin/dashboard` — Platform operational statistics
- `GET  /api/admin/users` — Paginated user directory
- `PUT  /api/admin/users/:id/status` — Suspend or activate user
- `GET  /api/admin/drivers` — Review driver applications
- `PUT  /api/admin/drivers/:id/approve` — Approve driver
- `PUT  /api/admin/drivers/:id/reject` — Reject driver with feedback
- `PUT  /api/admin/drivers/:id/suspend` — Suspend driver
- `GET  /api/admin/rides` — Complete ride logs
- `PUT  /api/admin/rides/:id/cancel` — Admin ride cancellation override
- `PUT  /api/admin/rides/:id/reassign` — Reassign ride to another driver
- `POST /api/admin/broadcast` — Broadcast announcement to users
- `GET  /api/admin/reports` — Analytics on popular barangays & weekly trends
- `GET  /api/admin/audit-logs` — Tamper-evident system audit trail

---

## 11. Security Architecture

1. **Password Hashing**: Bcrypt with 10 salt rounds; plaintext passwords are never stored.
2. **JWT Authorization**: Signed bearer tokens with expiry checking and role claims.
3. **Password Masking**: The `password` field in `User.js` has `select: false` so it is never accidentally serialized into API responses.
4. **Rate Limiting**: `express-rate-limit` protects authentication endpoints from brute force.
5. **Driver Document Isolation**: License and registration files are validated via Multer for mime types and kept in protected directories.
6. **Immutable Audit Trails**: Every admin decision (approvals, rejections, fare updates, overrides) writes an entry to `AuditLog`.

---

## 12. Local MVP Scope & Future Roadmap

### Intentional Local MVP Choices
- **Map Visualizer**: Uses an interactive SVG/canvas landmark visualizer grounded in real Tuguegarao coordinates rather than requiring a paid Google Maps or Mapbox API key.
- **Payment Method**: Supports `cash` and `recorded_digital_payment` (e.g., GCash / Maya reference recording) without storing credit card numbers or requiring paid gateway merchants.
- **Trip Status Sync**: Uses reliable client-side polling with configurable intervals (4s active ride, 6s driver queue, 8s notifications) ensuring compatibility across all modern web browsers.

### Roadmap for Production Deployment
1. **Live GPS WebSocket Integration**: Connect Socket.io or WebSockets for real-time driver coordinates on Leaflet/OpenStreetMap.
2. **SMS Gateway Integration**: Twilio or PhilSMS for automated passenger booking alerts.
3. **Automated Payment Gateway**: PayMongo or GCash direct merchant webhook integration.
4. **PWA Offline Service Worker**: Cache static shell assets for low-connectivity rural barangays.

---

## 13. Feature Verification Checklist

- [x] **Full-Stack Web App**: Served natively from Express at `http://localhost:5000/`.
- [x] **Tuguegarao Context**: Landmarks, barangays, and coordinates centered around Tuguegarao City.
- [x] **Philippine Conventions**: PHP (`₱`) currency, `+639` phone validation, local date formatting.
- [x] **Role Separation**: Passenger, Driver, Admin, and SuperAdmin dashboards.
- [x] **Driver Verification**: Document review, license inspection, and approval workflow.
- [x] **Atomic Dispatch**: Double-acceptance race condition prevention via MongoDB findOneAndUpdate.
- [x] **Trip State Machine**: Complete 6-step lifecycle with server-side validation.
- [x] **Configurable Fares**: Database-driven pricing rules with peak hour support.
- [x] **Post-Trip Ratings**: Restricted to completed trips, updating driver aggregate rating.
- [x] **Permanent Audit Trail**: All operational admin actions recorded with actor ID and IP.
- [x] **Responsive Mobile-First Design**: Adapts cleanly from smartphone screens to desktop workstations.

---

*Developed for Tuguegarao City local transportation management.*
