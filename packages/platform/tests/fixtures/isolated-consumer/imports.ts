// Proves the published `.d.ts` for @misofm/platform and @misofm/protocol are
// self-contained when installed as real tarballs (see ../../../../scripts or
// the isolated-consumer check driving this fixture). Every subpath below is
// used for both a value and a type so tsc cannot elide the import — if any
// packaged declaration file is missing, malformed, or has a broken relative
// path, this file fails to typecheck with `skipLibCheck: false`.

import { MisoClient as PlatformRootClient, type MisoOptions as PlatformRootOptions } from "@misofm/platform";
import { MisoPlatformClient, type MisoPlatformConfig } from "@misofm/platform/client";
import { derivePressingId, type OpenPressingParams } from "@misofm/platform/pressing";
import { directAdminCap, type AdminCapAuthority } from "@misofm/platform/vault";
import { misoConfig, type MisoConfig } from "@misofm/platform/read";
import { attachCompositionCredit, type CompositionRole } from "@misofm/platform/credits";

import { MisoClient as ProtocolRootClient, type MisoOptions as ProtocolRootOptions } from "@misofm/protocol";
import { MisoProtocolClient, type MisoProtocolClientOptions } from "@misofm/protocol/client";
import { PartyProtocolClient, type Party } from "@misofm/protocol/party";
import { isNotFound, type BcsParser } from "@misofm/protocol/queries";
import { party as contractsParty } from "@misofm/protocol/contracts";

// The raw wildcard subpath (`./contracts/*`): a deep module and a nested
// `deps/*` module, neither of which is exposed through the curated barrel.
import { Record as MisoRecordStruct } from "@misofm/protocol/contracts/miso_record/record";
import { LanguageCode as LanguageCodeTuple } from "@misofm/protocol/contracts/recording_language/deps/language_code/language_code";

// Type-position uses of every imported type. Each is either a directly
// exported interface/type alias, or (for the curated `contracts` barrel and
// the raw BCS codecs, which expose no standalone type export) derived from
// the value itself so it still proves the underlying declaration resolves.
type _PlatformRootOptions = PlatformRootOptions;
type _PlatformClientConfig = MisoPlatformConfig;
type _PlatformPressingParams = OpenPressingParams;
type _PlatformVaultAuthority = AdminCapAuthority;
type _PlatformReadConfig = MisoConfig;
type _PlatformCreditRole = CompositionRole;

type _ProtocolRootOptions = ProtocolRootOptions;
type _ProtocolClientOptions = MisoProtocolClientOptions;
type _ProtocolParty = Party;
type _ProtocolBcsParser = BcsParser<string>;
type _ProtocolContractsPartyNewOptions = Parameters<typeof contractsParty._new>[0];

type _MisoRecord = ReturnType<typeof MisoRecordStruct.parse>;
type _LanguageCode = ReturnType<typeof LanguageCodeTuple.parse>;

// Value-position uses of every imported value.
void ([
  PlatformRootClient,
  MisoPlatformClient,
  derivePressingId,
  directAdminCap,
  misoConfig,
  attachCompositionCredit,
  ProtocolRootClient,
  MisoProtocolClient,
  PartyProtocolClient,
  isNotFound,
  contractsParty,
  MisoRecordStruct,
  LanguageCodeTuple,
] satisfies unknown[]);

// Referenced so the otherwise-unused type aliases above cannot be reported as
// dead code by a stricter consumer tsconfig than this fixture's own.
export type IsolatedConsumerTypeProbe = [
  _PlatformRootOptions,
  _PlatformClientConfig,
  _PlatformPressingParams,
  _PlatformVaultAuthority,
  _PlatformReadConfig,
  _PlatformCreditRole,
  _ProtocolRootOptions,
  _ProtocolClientOptions,
  _ProtocolParty,
  _ProtocolBcsParser,
  _ProtocolContractsPartyNewOptions,
  _MisoRecord,
  _LanguageCode,
];
