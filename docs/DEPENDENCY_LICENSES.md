# Dependency licence inventory ? F02/F03 seed

Inspected on 14 November 2026 on Windows x64. Sources: installed package metadata and licence files, root and web `pnpm licenses list --json`, `pnpm-lock.yaml` and `backend/uv.lock`. Direct and transitive packages installed for this platform are listed below, including test tools. Package metadata is evidence for this seed; it is not a full redistribution notice bundle or the final AC-34 audit.

The licence identifiers below are present in the [SPDX licence list](https://spdx.org/licenses/) as OSI-approved. BlueOak-1.0.0 is also listed by the [Open Source Initiative](https://opensource.org/license). Legacy Python MIT/BSD labels were checked against their installed licence files; colorama uses BSD-3-Clause (full conditions checked). Recheck modified dependencies and other platforms in F06/R06. No application licence is selected by this inventory.

## Python environment

| Package | Version | Licence |
| --- | --- | --- |
| annotated-doc | 0.0.6 | MIT |
| annotated-types | 0.8.0 | MIT |
| anyio | 4.16.0 | MIT |
| ast_serialize | 0.13.1 | MIT |
| certifi | 2026.10.23 | MPL-2.0 |
| click | 8.5.1 | BSD-3-Clause |
| colorama | 0.4.6 | BSD-3-Clause |
| fastapi | 0.162.7 | MIT |
| h11 | 0.16.0 | MIT |
| httpcore | 1.0.9 | BSD-3-Clause |
| httpx | 0.28.1 | BSD-3-Clause |
| idna | 3.20 | BSD-3-Clause |
| iniconfig | 2.3.1 | MIT |
| librt | 0.16.0 | MIT |
| mypy | 2.4.1 | MIT |
| mypy_extensions | 1.2.0 | MIT |
| opentelemetry-api | 1.45.2 | Apache-2.0 |
| packaging | 26.3 | Apache-2.0 OR BSD-2-Clause |
| pathspec | 1.1.1 | MPL-2.0 |
| pluggy | 1.7.0 | MIT |
| pydantic | 2.14.3 | MIT |
| pydantic_core | 2.50.4 | MIT |
| Pygments | 2.21.0 | BSD-2-Clause |
| pytest | 9.2.0 | MIT |
| ruff | 0.17.5 | MIT |
| starlette | 1.10.0 | BSD-3-Clause |
| typing-inspection | 0.4.5 | MIT |
| typing_extensions | 4.16.0 | PSF-2.0 |
| uvicorn | 0.54.0 | BSD-3-Clause |

## Frontend, contract generation and Node test packages

| Package | Version | Licence |
| --- | --- | --- |
| @adobe/css-tools | 4.5.0 | MIT |
| @babel/code-frame | 7.29.7 | MIT |
| @babel/helper-validator-identifier | 7.29.7 | MIT |
| @babel/runtime | 7.29.14 | MIT |
| @exodus/bytes | 1.16.0 | MIT |
| @jridgewell/resolve-uri | 3.1.2 | MIT |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT |
| @jridgewell/trace-mapping | 0.3.31 | MIT |
| @oxc-project/types | 0.156.0 | MIT |
| @playwright/test | 1.65.0 | Apache-2.0 |
| @redocly/ajv | 8.11.2 | MIT |
| @redocly/config | 0.22.0 | MIT |
| @redocly/openapi-core | 1.34.24 | MIT |
| @rolldown/binding-win32-x64-msvc | 1.2.19 | MIT |
| @rolldown/pluginutils | 1.1.0 | MIT |
| @testing-library/dom | 10.4.1 | MIT |
| @testing-library/jest-dom | 7.0.1 | MIT |
| @testing-library/react | 16.3.3 | MIT |
| @types/aria-query | 5.0.4 | MIT |
| @types/chai | 5.2.3 | MIT |
| @types/deep-eql | 4.0.2 | MIT |
| @types/estree | 1.0.10 | MIT |
| @types/node | 24.19.0 | MIT |
| @types/react | 19.3.0 | MIT |
| @types/react-dom | 19.3.0 | MIT |
| @typescript/typescript-win32-x64 | 7.0.2 | Apache-2.0 |
| @vitest/mocker | 5.1.0 | MIT |
| @vitest/spy | 5.1.0 | MIT |
| agent-base | 7.1.4 | MIT |
| ansi-colors | 4.1.3 | MIT |
| ansi-regex | 5.0.1 | MIT |
| ansi-styles | 5.2.0 | MIT |
| argparse | 2.0.1 | Python-2.0 |
| aria-query | 5.3.0 | Apache-2.0 |
| aria-query | 5.3.2 | Apache-2.0 |
| assertion-error | 2.0.1 | MIT |
| balanced-match | 1.0.2 | MIT |
| bcp-47 | 2.1.2 | MIT |
| bcp-47-match | 2.0.3 | MIT |
| brace-expansion | 2.1.8 | MIT |
| chai | 6.3.0 | MIT |
| change-case | 5.4.4 | MIT |
| colorette | 1.4.0 | MIT |
| css.escape | 1.5.1 | MIT |
| csstype | 3.2.3 | MIT |
| data-urls | 8.0.0 | MIT |
| debug | 4.4.3 | MIT |
| decimal.js | 10.6.0 | MIT |
| dequal | 2.0.3 | MIT |
| detect-libc | 2.1.2 | Apache-2.0 |
| dom-accessibility-api | 0.5.16 | MIT |
| dom-accessibility-api | 0.6.3 | MIT |
| entities | 9.0.0 | BSD-2-Clause |
| es-module-lexer | 2.3.2 | MIT |
| estree-walker | 3.0.3 | MIT |
| expect-type | 1.4.0 | Apache-2.0 |
| fast-deep-equal | 3.1.3 | MIT |
| fdir | 6.5.0 | MIT |
| html-encoding-sniffer | 7.0.0 | MIT |
| https-proxy-agent | 7.0.6 | MIT |
| indent-string | 4.0.0 | MIT |
| index-to-position | 1.2.0 | MIT |
| is-alphabetical | 2.0.1 | MIT |
| is-alphanumerical | 2.0.1 | MIT |
| is-decimal | 2.0.1 | MIT |
| is-potential-custom-element-name | 1.0.1 | MIT |
| js-levenshtein | 1.1.6 | MIT |
| js-tokens | 4.0.0 | MIT |
| js-yaml | 4.3.2 | MIT |
| jsdom | 31.0.0 | MIT |
| json-schema-traverse | 1.0.0 | MIT |
| lightningcss | 1.33.0 | MPL-2.0 |
| lightningcss-win32-x64-msvc | 1.33.0 | MPL-2.0 |
| lru-cache | 11.5.3 | BlueOak-1.0.0 |
| lz-string | 1.5.0 | MIT |
| magic-string | 1.4.5 | MIT |
| min-indent | 1.0.1 | MIT |
| minimatch | 5.1.9 | ISC |
| ms | 2.1.3 | MIT |
| nanoid | 3.3.20 | MIT |
| obug | 3.0.0 | MIT |
| openapi-typescript | 7.13.0 | MIT |
| parse-json | 8.3.0 | MIT |
| parse5 | 8.1.1 | MIT |
| parse5-parser-stream | 8.1.1 | MIT |
| picocolors | 1.1.1 | ISC |
| picomatch | 4.0.7 | MIT |
| playwright | 1.65.0 | Apache-2.0 |
| playwright-core | 1.65.0 | Apache-2.0 |
| pluralize | 8.0.0 | MIT |
| postcss | 8.5.32 | MIT |
| pretty-format | 27.5.1 | MIT |
| punycode | 2.3.1 | MIT |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| react-is | 17.0.2 | MIT |
| redent | 3.0.0 | MIT |
| require-from-string | 2.0.2 | MIT |
| rolldown | 1.2.19 | MIT |
| saxes | 6.0.0 | ISC |
| scheduler | 0.28.0 | MIT |
| source-map-js | 1.2.2 | BSD-3-Clause |
| std-env | 4.3.0 | MIT |
| strip-indent | 3.0.0 | MIT |
| supports-color | 10.2.2 | MIT |
| tinybench | 6.2.3 | MIT |
| tinyexec | 1.3.1 | MIT |
| tinyglobby | 0.2.17 | MIT |
| tldts | 7.5.1 | MIT |
| tldts-core | 7.5.1 | MIT |
| tough-cookie | 6.1.0 | BSD-3-Clause |
| tr46 | 7.0.0 | MIT |
| type-fest | 4.41.0 | MIT selected from (MIT OR CC0-1.0) |
| typescript | 5.9.3 | Apache-2.0 |
| typescript | 7.0.2 | Apache-2.0 |
| undici | 8.12.4 | MIT |
| undici-types | 7.24.6 | MIT |
| uri-js-replace | 1.0.2 | MIT |
| vite | 8.3.8 | MIT |
| vitest | 5.1.0 | MIT |
| w3c-xmlserializer | 6.0.0 | MIT |
| webidl-conversions | 8.0.1 | BSD-2-Clause |
| whatwg-mimetype | 5.0.0 | MIT |
| whatwg-url | 17.3.0 | MIT |
| why-is-node-running | 3.2.1 | MIT |
| xml-name-validator | 5.0.0 | Apache-2.0 |
| xmlchars | 2.2.0 | MIT |
| yaml-ast-parser | 0.0.43 | Apache-2.0 |
| yargs-parser | 21.1.1 | ISC |

## Build/runtime tools and scope

- Python 3.13.15: PSF-2.0; Node 24.19.0: MIT with bundled third-party notices; uv 0.12.9: MIT OR Apache-2.0; pnpm 12.18.0: MIT. Retain upstream notices when distributing runtimes.
- Python build backend: hatchling 1.33.0 (MIT). Its isolated build dependencies are not part of the installed application inventory above; F06 must capture the complete build-tool environment and notices before release.
- The downloaded Chromium/FFmpeg browser-test artifacts are external verification tools, not application assets. Their upstream third-party notices and any redistribution obligations must be reviewed if those binaries are ever packaged.
- This seed covers the current installed Windows packages. Uninstalled optional platform packages and future NASA/scientific/UI libraries require review when added. It does not claim AC-34 completion.

Installed package counts: 29 Python dependencies and 129 Node package/version entries. No NASA dataset or imagery is bundled in F02.

F03 adds MIT-licensed `openapi-typescript` 7.13.0 and its transitive dependencies. The generator uses TypeScript 5.9.3 (Apache-2.0) at the workspace root to satisfy its declared peer range; the web application keeps TypeScript 7.0.2. Generation tools are development dependencies, not runtime application features. Python dependencies are unchanged.

## U01 workspace integration additions

Inspected installed package metadata and available licence files on 14 November 2026.
React Router 7.18.5 provides client-side routing; Radix Dialog 1.3.1 provides the
approved accessible modal primitive. Exact direct versions and transitive resolution
are locked. All 28 new packages declare MIT. Packages without a distributed full
licence file are marked below: retrieve/check their upstream copyright notices
before release redistribution in F06/R06. This extends the seed inventory, not final
AC-34 certification. No Next.js, MapLibre, AI SDK or scientific dependency is added.

| Package | Version | Licence | Evidence |
| --- | --- | --- | --- |
| @radix-ui/primitive | 1.2.0 | MIT | Metadata + licence file |
| @radix-ui/react-compose-refs | 1.1.5 | MIT | Metadata + licence file |
| @radix-ui/react-context | 1.3.0 | MIT | Metadata + licence file |
| @radix-ui/react-dialog | 1.3.1 | MIT | Metadata + licence file |
| @radix-ui/react-dismissable-layer | 1.2.1 | MIT | Metadata + licence file |
| @radix-ui/react-focus-guards | 1.2.0 | MIT | Metadata + licence file |
| @radix-ui/react-focus-scope | 1.3.1 | MIT | Metadata + licence file |
| @radix-ui/react-id | 1.1.4 | MIT | Metadata + licence file |
| @radix-ui/react-portal | 1.2.0 | MIT | Metadata + licence file |
| @radix-ui/react-presence | 1.1.11 | MIT | Metadata + licence file |
| @radix-ui/react-primitive | 2.2.0 | MIT | Metadata + licence file |
| @radix-ui/react-slot | 1.5.0 | MIT | Metadata + licence file |
| @radix-ui/react-use-callback-ref | 1.1.5 | MIT | Metadata + licence file |
| @radix-ui/react-use-controllable-state | 1.3.0 | MIT | Metadata + licence file |
| @radix-ui/react-use-effect-event | 0.0.5 | MIT | Metadata + licence file |
| @radix-ui/react-use-layout-effect | 1.1.4 | MIT | Metadata + licence file |
| aria-hidden | 1.2.6 | MIT | Metadata + licence file |
| cookie | 1.1.1 | MIT | Metadata + licence file |
| detect-node-es | 1.1.0 | MIT | Metadata + licence file |
| get-nonce | 1.0.1 | MIT | Metadata + licence file |
| react-remove-scroll | 2.7.2 | MIT | Metadata + licence file |
| react-remove-scroll-bar | 2.3.8 | MIT | Metadata; full notice pending |
| react-router | 7.18.5 | MIT | Metadata + licence file |
| react-router-dom | 7.18.5 | MIT | Metadata + licence file |
| react-style-singleton | 2.2.3 | MIT | Metadata + licence file |
| set-cookie-parser | 2.7.3 | MIT | Metadata + licence file |
| use-callback-ref | 1.3.3 | MIT | Metadata + licence file |
| use-sidecar | 1.1.3 | MIT | Metadata + licence file |
