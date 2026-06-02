# Changelog

## 1.0.0 - 2026-06-02

Initial public portfolio release of the Aether Clinic demo.

- Public clinic website with booking flow, services, doctors, and contact pages
- Role-based dashboards for admin, doctor, and patient users
- Patient CRM workflows with tags, internal notes, and appointment history
- Scheduling, reminder automation, and safe fallback behavior for AI and notifications
- Docker, deployment, and environment setup documentation for local and hosted demos
- Release hardening for GitHub publication:
  - upgraded frontend lockfile to patched Next.js dependencies
  - added Node.js engine requirements
  - optimized frontend Docker image for standalone Next.js output
  - added Docker build context ignores for frontend and backend
