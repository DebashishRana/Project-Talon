# SentinelTrail ER diagrams — Database v1.0

Database v1.0 was validated on **MySQL Server 8.0.45** after execution of migrations 001–005.

- [Full finalized schema (Mermaid)](erd-full.mmd)
- [SIH judge view (Mermaid)](erd-judge-view.mmd)

The full diagram shows every final table and foreign-key relationship. The judge view presents the evidence-first path: case intake → document/live media → analysis → explainable risk → officer decision, with access, audit, hold, retention, and verified purge controls.

Original document images, PDFs, crops, and live media are stored in self-hosted MinIO rather than MySQL because object storage is more cost-efficient for large immutable media, supports controlled encrypted object lifecycle, and keeps MySQL focused on relational metadata, integrity hashes, decisions, and MinIO object references. Direct MinIO URLs are never stored in QR codes or exposed as authorization.

These visual Mermaid diagrams were generated only after real migration execution validation on MySQL 8.0.45. They are the visual source for this finalized schema; no SVG is included unless a local Mermaid renderer is already available.
