# F05 validation-only dependency inventory

Observed on the reference Windows machine, Python 3.13.15. Direct pins and all
resolved artifacts are in `pyproject.toml` and `uv.lock`. Neither application
lockfile nor the F04 environment was modified. This is a package metadata
inventory, not final CMP-1/AC-34 certification or a redistribution approval.

| Installed package | Version | Declared distribution expression | Use |
| --- | --- | --- | --- |
| h5py | 3.15.1 | BSD-3-Clause | Read bounded authentic HDF5/NetCDF headers/subsets |
| numcodecs | 0.16.3 | MIT | Decode the actual POWER compressor/filter |
| numpy | 2.5.4 | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 | Array inspection and independent sample arithmetic |
| pillow | 13.0.0 | MIT-CMU | Read-only TIFF tags/data and tiny synthetic format tests |
| typing_extensions | 4.16.0 | PSF-2.0 | Resolved numcodecs dependency |

The NumPy bundled CC0 component remains the explicit validation-only review issue
already recorded under F04. h5py/numcodecs/Pillow wheels also carry bundled-library
notices; audit the exact platform wheel and required notices before runtime or
release reuse. Do not claim that the wrapper's declared licence audits every
bundled component. Keep this environment outside product bundles and record the
release review under F06/R06. No app dependency was added or licence gate waived.

The public probe and transport tests use the Python standard library. NASA source
data/service citation requirements are separate from software-library licences;
source/subset/output artifacts remain outside Git. The application/repository
licence remains a team decision, not inferred from dependency licences.
