// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Cap-authorized builders for data-only Recording metadata extensions. */

import type { TransactionArgument } from "@mysten/sui/transactions";
import type { TxThunk } from "./transactions.ts";
import { invokeWithAdminCap, type AdminCapAuthority } from "./vault.ts";
import * as advisory from "./contracts/recording_advisory/recording_advisory.ts";
import * as language from "./contracts/recording_language/recording_language.ts";
import * as masterReference from "./contracts/recording_master_reference/recording_master_reference.ts";
import * as preview from "./contracts/recording_preview/recording_preview.ts";

export interface RecordingExtensionTarget {
  readonly recordingId: string;
  readonly authority: AdminCapAuthority;
  readonly recordingShareType: string;
  readonly compositionShareType: string;
}

type Rating = "Explicit" | "NotExplicit" | "Cleaned";
export interface SetRecordingAdvisoryParams extends RecordingExtensionTarget {
  readonly recordingAdvisoryPackageId: string;
  readonly rating: Rating;
}

export function setRecordingAdvisory(p: SetRecordingAdvisoryParams): TxThunk {
  return (tx) => {
    const rating = tx.add(
      p.rating === "Explicit" ? advisory.explicit({ package: p.recordingAdvisoryPackageId })
        : p.rating === "NotExplicit" ? advisory.notExplicit({ package: p.recordingAdvisoryPackageId })
          : advisory.cleaned({ package: p.recordingAdvisoryPackageId }),
    );
    invokeWithAdminCap(tx, p.authority, {
      target: `${p.recordingAdvisoryPackageId}::recording_advisory::set_rating`,
      typeArguments: [p.recordingShareType, p.compositionShareType],
      arguments: [tx.object(p.recordingId), rating],
      adminCapIndex: 1,
    });
  };
}

export interface SetRecordingLanguagesParams extends RecordingExtensionTarget {
  readonly recordingLanguagePackageId: string;
  /** A vector<LanguageCode> built by the language-code package in this PTB. */
  readonly languages: TransactionArgument;
}

export function setRecordingLanguages(p: SetRecordingLanguagesParams): TxThunk {
  return (tx) => {
    invokeWithAdminCap(tx, p.authority, {
      target: `${p.recordingLanguagePackageId}::recording_language::set_languages`,
      typeArguments: [p.recordingShareType, p.compositionShareType],
      arguments: [tx.object(p.recordingId), p.languages],
      adminCapIndex: 1,
    });
  };
}

export function setRecordingInstrumental(p: Omit<SetRecordingLanguagesParams, "languages">): TxThunk {
  return (tx) => {
    invokeWithAdminCap(tx, p.authority, {
      target: `${p.recordingLanguagePackageId}::recording_language::set_instrumental`,
      typeArguments: [p.recordingShareType, p.compositionShareType],
      arguments: [tx.object(p.recordingId)],
      adminCapIndex: 1,
    });
  };
}

interface RecordingWalrusReferenceParams extends RecordingExtensionTarget {
  /** An ori::WalrusData value assembled in the same PTB (must be a standalone blob on chain). */
  readonly reference: TransactionArgument;
}

export interface SetRecordingMasterReferenceParams extends RecordingWalrusReferenceParams {
  readonly recordingMasterReferencePackageId: string;
}
export function setRecordingMasterReference(p: SetRecordingMasterReferenceParams): TxThunk {
  return (tx) => {
    invokeWithAdminCap(tx, p.authority, {
      target: `${p.recordingMasterReferencePackageId}::recording_master_reference::set_master_reference`,
      typeArguments: [p.recordingShareType, p.compositionShareType],
      arguments: [tx.object(p.recordingId), p.reference],
      adminCapIndex: 1,
    });
  };
}

export interface SetRecordingPreviewParams extends RecordingWalrusReferenceParams {
  readonly recordingPreviewPackageId: string;
}
export function setRecordingPreview(p: SetRecordingPreviewParams): TxThunk {
  return (tx) => {
    invokeWithAdminCap(tx, p.authority, {
      target: `${p.recordingPreviewPackageId}::recording_preview::set_preview`,
      typeArguments: [p.recordingShareType, p.compositionShareType],
      arguments: [tx.object(p.recordingId), p.reference],
      adminCapIndex: 1,
    });
  };
}
