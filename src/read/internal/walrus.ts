// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "@mysten/sui/bcs";
import { toBase64 } from "@mysten/sui/utils";

const u256 = bcs.u256();

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/=*$/, "").replaceAll("+", "-").replaceAll("/", "_");
}

export function u256ToB64Url(value: bigint | string): string {
  return toBase64Url(u256.serialize(BigInt(value)).toBytes());
}

/** Build Walrus's 37-byte quilt-patch id. All fields use BCS little-endian. */
export function quiltPatchId(
  quiltId: bigint | string,
  version: number,
  startIndex: number,
  endIndex: number,
): string {
  const bytes = new Uint8Array(37);
  bytes.set(u256.serialize(BigInt(quiltId)).toBytes(), 0);
  bytes[32] = version;
  bytes[33] = startIndex & 0xff;
  bytes[34] = (startIndex >> 8) & 0xff;
  bytes[35] = endIndex & 0xff;
  bytes[36] = (endIndex >> 8) & 0xff;
  return toBase64Url(bytes);
}
