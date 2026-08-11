// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Shared read plumbing for the platform reads.

/**
 * Whether an error means "that object isn't there" rather than "the read failed".
 *
 * A missing object is an ANSWER — no pressing has been opened for this release yet,
 * this currency was never listed — so the readers turn it into `null` rather than a
 * throw. A transport failure is not an answer and must propagate: every message
 * pattern below requires object-ish context ("object" / "dynamic field"), so a
 * gRPC "peer not found" or a JSON-RPC "Method not found" is never mistaken for an
 * absent object.
 */
export function isNotFound(e: unknown): boolean {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code: unknown }).code;
    if (
      code === "notExists" ||
      code === "deleted" ||
      code === "dynamicFieldNotFound" ||
      code === "notFound"
    ) {
      return true;
    }
  }
  const msg = e instanceof Error ? e.message : String(e);
  return (
    /\bobject\b[\s\S]*\b(?:not\s?found|does not exist|has been deleted)\b/i.test(msg) ||
    /\bdynamic field\b[\s\S]*\bnot\s?found\b/i.test(msg) ||
    /\bno object\b/i.test(msg)
  );
}
