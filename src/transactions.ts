// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Transaction builders follow the Sui SDK thunk pattern: a builder returns a
// `(tx: Transaction) => …` thunk that adds commands to a caller-owned
// `Transaction`, so a platform call composes with protocol calls and anything
// else in the same PTB.

import type { Transaction } from "@mysten/sui/transactions";

/** A thunk that adds commands to a transaction. May be async (resolves at build time). */
export type TxThunk = (tx: Transaction) => void | Promise<void>;
