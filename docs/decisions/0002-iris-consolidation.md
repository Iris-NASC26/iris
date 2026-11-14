# ADR-002 - Consolidate into the Iris root application

Status: authorized by the user on 14 November 2026, subject to code review before main-branch merge.

The user selected Navida's root UI as the main experience and approved reserving shared files for integration. Integrate Earth Trend's working backend, typed contracts, actual NASA retrieval, Three.js renderer and validation into `Iris-NASC26/iris`. Remove duplicate application snapshots after verifying destination coverage and preserving source revisions. Root frontend files replace historical `web/*` paths. FastAPI remains the scientific authority, local hosting remains the target, and no scientific scope or method is changed.

Prototype numerical findings, automatic validation badges and silent dataset substitution are not admitted. Preserve useful prototype source behind review-required states for later task-specific integration. Directory placement, compiler/tool compatibility and root dotenv boundary changes are detailed in [the consolidation record](../CONSOLIDATION.md). ADR-001's earlier topology and dotenv statements are superseded by this placement; its Next.js/scientific architecture decision remains.
