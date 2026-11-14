# Synthetic contract fixtures — never scientific observations

Every JSON file in `valid/` is wrapped with `fixture_kind: synthetic_contract` and a disclosure. These are independently readable wire-shape examples, with invented numbers, IDs, hashes, artifacts and validation-report references. The numbers are **not calculated from the example series**. Different files demonstrate different shapes, not a connected scientific workflow. They are not NASA data, reference calculations, scientifically accepted forecasts or evidence that an SRS acceptance criterion has passed.

Coverage includes completed analyses, scientific unavailability, raw/reference branches, standalone versus scan FDR, gaps and true zeros, explicit baselines outside the window, dateline shapes, excluded scan rows, pending/failed/cancelled jobs, local readiness, snapshot-only capabilities, Outlook parts, paired comparison metadata, layer encodings and provenance. Synthetic method and source markers must not authenticate scientific results.

`invalid.json` defines invalid specimens as field replacements in named valid fixtures, with expected Pydantic error types/message fragments. Tests also exercise numerical boundaries, JSON NaN/Infinity, array alignment, CI/branch/FDR identities, geometry limits and response-status contradictions. Test fixture changes require the same contract-owner review as model changes.

These files live outside the frontend/application source and must not be bundled as data or prepared cases. Models validate structure and internal consistency; they do not establish source authenticity, hash correctness, topology, forecast skill, statistical calibration or method validity. Those gates remain F04/F05 and subsequent tasks.
