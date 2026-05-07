# Campus Placement Management System

A Production-Ready Full-Stack application for managing college placements.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Recharts, Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express, SQLite (SQL), JWT, Bcrypt.
- **Architecture**: Layered (Controller -> Service -> Model) with OOP implementation.

## Features
- **Admin**: Dashboard with Recharts analytics, manage all entities.
- **Student**: View jobs, eligibility checks, one-click apply, notification center.
- **Company**: Post jobs, view applicant skills/CGPA, set criteria.
- **Security**: Password hashing, JWT Auth, Role-Based Access Control.

## Credentials
### Admin
- **Email**: `admin@placement.edu`
- **Password**: `admin123`

### Student
- **Email**: `student@placement.edu`
- **Password**: `student123`

### Company
- **Email**: `hr@techcorp.com`
- **Password**: `company123`

## OOP Implementation Details
- **Person (Abstract Class)**: Base for Auth entities.
- **Student (Class)**: Implements `Eligible` interface, extends `Person`.
- **JobRole (Base)**: Inherited by `TechnicalRole` and `NonTechnicalRole`.
- **Exceptions**: `IneligibleStudentException`, `DuplicateRegistrationException`.
- **Multithreading**: Simulated using asynchronous notification dispatching.

## Setup
1. `npm install`
2. `npm run dev` (Runs both frontend and backend on port 3000)
