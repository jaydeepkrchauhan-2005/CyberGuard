# Merge notes

## Source projects received
1. Ethical Hacking Report Generator: the ZIP included a React + Vite source project with a report editor, findings list, severity overview, Markdown export and browser print/PDF workflow.
2. Penetration Test Findings Dashboard: the ZIP included `README.md`, `PHASES_COMPLETED.md`, `SECURITY.md` and `.gitignore`, but did not include the frontend or backend source files described in the documentation.

## Integration decisions
- Kept the report generator concept and its core workflow: engagement/project metadata, severity-based findings, report preview, Markdown export and Print / Save PDF.
- Rebuilt the documented dashboard modules in the combined app: overview, projects, assets, findings CRUD, search/filter and risk summary.
- Added a small Node.js HTTP API and JSON-file data store so the combined project has a working backend without requiring a database service or extra backend packages.
- Preserved a clear distinction between simulated demo data and verified findings.

## Not included
- No actual vulnerability scanner, exploitation engine, port scanner or target probing was present in the supplied source files, so none is claimed or represented as implemented.
- Authentication and multi-user authorization are not implemented; this is a local college-project workspace, not a production deployment.
