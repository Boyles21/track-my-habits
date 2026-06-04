# TrackMySIWES

A modern SIWES (Student Industrial Work Experience Scheme) management platform designed to digitize internship tracking, logbook submissions, document management, compliance monitoring, and supervisor approvals.

## Overview

TrackMySIWES helps students, supervisors, and institutions manage SIWES activities efficiently through a centralized web platform.

The platform eliminates manual paperwork by providing real-time progress tracking, digital logbooks, document uploads, compliance monitoring, and approval workflows.

## Features

### Student Dashboard

* Real-time SIWES progress tracking
* Hours completed monitoring
* Days completed monitoring
* Approval status overview
* Compliance and violation alerts
* Weekly analytics and progress visualization
* Recent activity tracking
* Personalized action recommendations

### Digital Logbook

* Daily internship activity submissions
* Work hour tracking
* Activity descriptions and summaries
* Supervisor review workflow
* Entry approval and revision requests

### Document Management

* Upload internship-related documents
* Secure document storage
* Organized file management
* Easy access to submitted files

### Final Report Submission

* Digital final report uploads
* Submission tracking
* Supervisor review process
* Approval workflow

### Compliance Monitoring

* Minimum weekly hour validation
* Progress compliance checks
* Automated violation detection
* Corrective action recommendations

### Supervisor Workflow

* Review student submissions
* Approve or reject logbook entries
* Request revisions
* Monitor student progress
* Track compliance status

## Technology Stack

### Frontend

* React
* TypeScript
* Tailwind CSS
* Framer Motion
* Recharts

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL / MySQL (depending on deployment)

### Authentication

* JWT Authentication
* Role-Based Access Control (RBAC)

## User Roles

### Student

Students can:

* Submit daily logbook entries
* Track internship progress
* Upload required documents
* View supervisor feedback
* Submit final reports

### Supervisor

Supervisors can:

* Review student entries
* Approve submissions
* Request revisions
* Monitor compliance
* Track student performance

### Administrator

Administrators can:

* Manage users
* Monitor platform activities
* Configure SIWES requirements
* Generate reports
* Oversee institution-wide progress

## Dashboard Analytics

The dashboard provides:

* Total hours completed
* Days completed
* Approval rate
* Compliance status
* Weekly performance trends
* Progress projections
* Outstanding actions

## Project Goals

* Digitize SIWES management processes
* Improve transparency between students and supervisors
* Reduce paperwork and administrative overhead
* Enable real-time progress monitoring
* Improve compliance tracking
* Enhance reporting and documentation

## Installation

```bash
git clone https://github.com/yourusername/trackmysiwes.git

cd trackmysiwes

npm install

npm run dev
```

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=
JWT_SECRET=
PORT=
```

## Running the Project

Development:

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

## Future Enhancements

* Mobile application
* Push notifications
* Email reminders
* AI-powered report assistance
* Attendance verification
* Industry supervisor portal
* Analytics dashboard for institutions
* Exportable SIWES reports

## Contributing

Contributions are welcome. Please create a feature branch, submit a pull request, and follow the project's coding standards.

## License

This project is licensed under the MIT License.

## Author

Built to modernize and simplify SIWES management for students, supervisors, and educational institutions.
