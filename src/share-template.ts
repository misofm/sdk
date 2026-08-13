// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Embedded share-currency bytecode template: the compiled `share` Move package
// (deps 0x1/0x2, network-agnostic). `patchInitializer` stamps the INITIALIZER
// address into a fresh copy before publish. Kept as a typed const rather than a
// JSON asset so the SDK is self-contained — no file read, no path resolution, and
// it bundles cleanly. Regenerate from the compiled package if the share module
// changes.

import type { PackageBytecode } from "./transactions.ts";

export const SHARE_TEMPLATE: PackageBytecode = {
  "modules": [
    "oRzrCwYAAAAKAQAOAg4gAy4gBE4EBVJHB5kB1QEI7gJgBs4DNwqFBAYMiwQ4ABEBEgIHAggCCQIPAhMAAggAAQMHAAMEDAEAAQQACAAEAQABAAEFBgQABgUCAAANAAEAARQFBgACCwUEAAQKCgIBAAQOCAkBCAYQAwQABAcDBwUIAQgBCAEHCAMHCAYBCwIBCAAAAQYIBgEFAQoCAQgBAQgABwcIAwIIAQgBCAEIAQcIBgILBAEJAAsCAQkAAgsEAQkABwgGDENvaW5SZWdpc3RyeRNDdXJyZW5jeUluaXRpYWxpemVyBVNoYXJlBlN0cmluZwtUcmVhc3VyeUNhcAlUeENvbnRleHQDVUlEB2FkZHJlc3MEY29pbg1jb2luX3JlZ2lzdHJ5IGZpbmFsaXplX2FuZF9kZWxldGVfbWV0YWRhdGFfY2FwCmZyb21fYnl0ZXMCaWQKaW5pdGlhbGl6ZQxuZXdfY3VycmVuY3kGb2JqZWN0BnNlbmRlcgVzaGFyZQZzdHJpbmcKdHhfY29udGV4dAR1dGY4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCgIhIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwgAAAAAAAAAAAoCBgVTSEFSRQACAQwIBQABAAABHAoELhEFBwARAiEECAUOCwQBCwMBBwEnCwMxBgcCEQELAAsBCwIKBDgADAULBDgBCwUCAA=="
  ],
  "dependencies": [
    "0x0000000000000000000000000000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000000000000000000000000000002"
  ],
  "digest": [
    191,
    44,
    36,
    112,
    72,
    10,
    163,
    173,
    88,
    79,
    123,
    99,
    33,
    92,
    255,
    215,
    122,
    199,
    22,
    101,
    247,
    141,
    222,
    237,
    187,
    42,
    28,
    13,
    201,
    193,
    173,
    204
  ]
};
