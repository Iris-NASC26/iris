# F04 validation-only dependency inventory

The user explicitly approved a separate validation environment. These packages are not application/runtime dependencies; neither shared application lockfile changes. Metadata inspected in the installed Windows x64 Python 3.13.15 environment on 14 November 2026:

| Package | Version | Installed licence declaration / evidence |
| --- | --- | --- |
| NumPy | 2.5.4 | `BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0` (installed License-Expression) |
| SciPy | 1.18.1 | BSD; project BSD-3-Clause plus bundled third-party notices in the wheel |
| pyMannKendall | 1.4.3 | MIT (installed OSI classifier/licence file) |
| pytest | 9.2.0 | MIT |
| colorama | 0.4.6 | BSD-3-Clause; same version/file evidence as application inventory |
| iniconfig | 2.3.1 | MIT |
| packaging | 26.3 | Apache-2.0 OR BSD-2-Clause |
| pluggy | 1.7.0 | MIT |
| Pygments | 2.21.0 | BSD-2-Clause |

Retain upstream notices. NumPy explicitly declares a CC0 component; do not conceal it, call it OSI-approved, or silently carry these binaries into a release claiming CMP-1/AC-34 acceptance. H1/H6 must review bundled-code declarations and the strict SRS licence criterion before any runtime/release reuse; this validation inventory is not that sign-off. SciPy wheel notices also require the final bundled-code audit. No application licence is selected or changed here.

The exact dependency artifacts/hashes are pinned in `uv.lock`. Existing Ruff 0.17.5 and mypy 2.4.1 are invoked from the application development environment only for optional reference lint/type checks. Existing system PyMuPDF 1.28.2 was used solely to inspect downloaded papers; it is not installed in either project or shipped as an asset.
