# @misofm/sdk

The complete client SDK for the **Miso platform layer** on Sui: composed catalog,
artist, wallet, and receipt reads; the record production line and sale of copies;
and vault-custodied business-logic plugins built on `@misonetwork/sdk`'s
protocol and data-extension primitives.

## The split

Miso ships two SDK families, and the npm scope tells you which promise you are
holding:

| Scope | Layer | Owns |
| --- | --- | --- |
| `@misonetwork/*` | **Protocol** | Composition, Recording, Release; metadata/data extensions; utilities; generic royalty-pool and routed-stake primitives |
| `@misofm/*` | **Platform** | Pressing, Listing, Record, and Vault plugins that apply Miso business logic to custodied protocol admin caps |

A release is protocol. Pressing a record off that release and selling it is
platform. So is deciding *what to do* with a freshly-minted work's share
supply — the protocol only knows how to mint one. Keeping the boundary at the
package line is what stops the open protocol from quietly growing a
storefront (or an opinion about tokenomics).

Extensions add data to a work. Plugins provide business logic: a shared
`Vault<AdminCap>` custodies the raw cap, while its owner holds a
`VaultAdminCap<AdminCap>`. A plugin borrows the cap and must return the exact
object in the same PTB. The SDK supports both vault authorities and legacy
address-owned admin caps explicitly; it never silently treats a legacy cap as a
vaulted one.

This package depends on `@misonetwork/sdk` and imports its bare
`createComposition`/`createRecording` primitives, composing them with its own
minato-dispersal and share-currency logic in the same PTB — the
transaction-thunk composition pattern from the
[Sui SDK building guide](https://sdk.mystenlabs.com/sui/sdk-building), just
crossing a package boundary.

## The model

A release has exactly **one** `Pressing`: a single uncapped run whose counter numbers
every copy that release will ever sell. There are no editions, no supply caps, no
sold-out state, and no expiry — a run is `Scheduled → Active → Paused → Active` and
nothing else.

Selling in a currency is a `Listing<Currency>`, one per currency, permanent, edited in
place rather than replaced. A sale needs both switches open: the run active and that
currency's listing enabled.

**Everything is address math.** The pressing's UID derives off its release's, each
listing's off the pressing's. There is no registry and no pointer to follow, so
"where is it" is answered offline — which is why the builders take a RELEASE id and
compute the rest. A caller cannot pair a listing with the wrong pressing, because it
never picks one.

## Usage

Register the client extension on any client implementing Sui's Core API
([SDK building guidelines](https://sdk.mystenlabs.com/sui/sdk-building)):

```ts
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { miso } from "@misofm/sdk";

const client = new SuiGrpcClient({ network: "testnet", baseUrl }).$extend(
  miso({ deployment: verifiedDeployment }),
);

// The permissionless protocol SDK is part of the same facade.
const release = await client.miso.protocol.getReleaseById(releaseId);

// Read: run + one currency's offer, one round trip, no registry lookup.
const { pressing, listing } = await client.miso.getSale({
  releaseId,
  currencyType: USD_COIN_TYPE,
});

// Write: a thunk, so it composes with protocol calls in the same PTB.
const tx = new Transaction();
tx.add(
  client.miso.tx.buyRecord({
    releaseId,
    currencyType: USD_COIN_TYPE,
    amount: listing.price.amount,
    recipient: buyer,
  }),
);
```

Holding the ids yourself? Every builder and reader is exported bare, taking
`misoPressingPackageId` per call:

```ts
import { buyRecord, getSale } from "@misofm/sdk/pressing";
```

No package IDs are bundled until the Ledger-admin deployment records the new
immutable stack. `miso()` therefore fails closed; pass one complete verified
deployment through `miso({ deployment })`. The post-publish update is confined
to `src/deployments.ts`.

### High-level platform reads

`@misofm/sdk/read` turns protocol, pressing, PartyOS, credits, cover, and wallet
objects into the JSON-safe views a client actually renders. It works in browsers,
Workers, and servers. Miso's HTTP API is a thin validated and cached transport over
this same surface, not a separate domain implementation.

```ts
import {
  createMisoClient,
  getDiscoverShelf,
  getReleaseDetail,
  getOwnedRecords,
} from "@misofm/sdk/read";

const miso = createMisoClient({ config: verifiedReadConfig });

const discover = await getDiscoverShelf(miso);
const release = await getReleaseDetail(miso, releaseId);
const library = await getOwnedRecords(miso, walletAddress);
```

The package root also exposes the same functions under the `read` namespace:

```ts
import { read } from "@misofm/sdk";

const miso = read.createMisoClient({ config: verifiedReadConfig });
const artist = await read.getArtistProfile(miso, partyId);
```

### Authenticated platform mutations

`@misofm/sdk/auth` implements Miso's Enoki + Sui personal-message authorization
protocol without owning session state or private credentials. It asks the API
for a short-lived, method/path-bound challenge, validates the response, signs
the exact bytes with the caller's Sui signer, and sends the authenticated
mutation.

```ts
import { authenticatedFetch } from "@misofm/sdk/auth";

await authenticatedFetch(
  "https://api.testnet.miso.fm/platform/usernames/alice",
  {
    method: "PUT",
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json" },
    auth: {
      token: enokiOidcToken,
      address: suiAddress,
      signer: await enokiFlow.getKeypair({ network: "testnet" }),
      network: "testnet",
    },
  },
);
```

The SDK is only a client and shared wire contract. The API remains the security
boundary: it verifies Enoki membership, challenge freshness, the recovered Sui
address, and the exact authorized route on every protected request.

### Payment

`listing::buy` takes a bare `Balance<Currency>`, and `buyRecord` sources it with
`tx.balance()` — which draws from the buyer's **address balance** first and falls back
to coin objects only if it must. When the address balance covers the price, that is a
single `balance::redeem_funds` and **no coin object is minted, touched, or destroyed**,
leaving the sale free of owned-object contention.

Never hand-pick coin objects for a payment. That road shows a buyer their $1,000 and
then refuses to spend a cent of it, because a coin listing cannot see money that lives
in the address balance.

Purchases through Miso are sponsored, so `useGasCoin` defaults to `false`: the gas coin
belongs to the sponsor, and drawing a SUI payment out of it would spend the wrong
wallet's money.

## Publishing (`transactions.ts`, `share.ts`, `release-graph.ts`)

`@misonetwork/sdk`'s `createComposition`/`createRecording` mint a work and hand
back its by-value parts (the object, its admin cap, its freshly-minted share
`Balance`) without dispersing, sharing, or transferring anything. This package
supplies the opinionated finish on top:

```ts
import { miso } from "@misofm/sdk";

const client = new SuiGrpcClient({ network: "testnet", baseUrl }).$extend(
  miso(),
);

// Mints the composition's share supply, disperses it to shareRecipients via
// minato, publishes (shares) the composition, and transfers the
// CompositionAdminCap to adminAddress — createComposition → finalizeComposition
// in one PTB.
const thunk = client.miso.tx.publishComposition({
  title: "Song Title",
  royaltyRateBps: 1000,
  shareType: "0x...::share::Share",
  shareCurrencyId: "0x...",
  shareTreasuryCapId: "0x...",
  shareRecipients: [{ address: ownerAddress, value: 10_000_000_000_000 }],
  adminAddress: ownerAddress,
});
```

`client.miso.tx.publishRecording` and `publishCompositionAndRecording`
follow the same shape (the latter atomically, borrow-before-share, in one PTB —
see `@misonetwork/sdk`'s README for why the ordering is load-bearing).
The protocol, pressing, record-settings, minato, and release-coordinator
addresses all come from the deployment selected by the Sui client's network.
The deprecated `misoPlatform()` constructor still accepts those values manually
for compatibility with existing integrations.

For custom PTBs, the bare primitives (`disperseShares`, `finalizeComposition`,
`finalizeRecording`) and the whole-graph orchestrator are exported standalone:

```ts
import { publishReleaseGraph } from "@misofm/sdk";

// Every composition and recording, optional royalty pools, tracks, and
// the release — with the release id derived ON-CHAIN — in one atomic PTB.
const thunk = publishReleaseGraph({
  compositions: [{ shareType, shareCurrencyId, shareTreasuryCapId, title: "Song", royaltyRateBps: 1000, shareRecipients, adminAddress }],
  recordings: [{ shareType, shareCurrencyId, shareTreasuryCapId, compositionShareType, parentCompositionIndex: 0, shareRecipients, adminAddress }],
  release: {
    title: "Album",
    nonce: "42",
    adminAddress,
    releaseRegistryId: "0x...",
    tracks: [{ recordingIndex: 0, splitBps: 10000 }],
  },
  misoPackageId: "0x...",
  minatoPackageId: "0x...",
});
```

### Share Currency Provisioning (`share.ts`)

Every composition and recording is backed by its own fixed-supply share
currency: an independently published `share` package (bytecode template
embedded as `SHARE_TEMPLATE`, initializer patched via `patchInitializer`).
Publish and initialize are necessarily two transactions:

```ts
// Sequential (one currency, two txs):
const currency = await client.miso.createShareCurrency(signer, {
  name: "Song Shares",
  description: "…",
});
// → { packageId, currencyId, shareType, treasuryCapId, gasUsed }

// Batched (many currencies, via a ParallelTransactionExecutor):
import { publishShareCurrencies, initializeShareCurrencies } from "@misofm/sdk";
const { packageIds } = await publishShareCurrencies(executor, initializerAddress, 10);
const { currencies } = await initializeShareCurrencies(executor, signerAddress, packageIds, (pkg) => ({
  name: "…", description: "…",
}));
```

`executeViaExecutor(executor, ...thunks)` (`execute.ts`) submits a
non-idempotent PTB through a `ParallelTransactionExecutor` exactly once (no
auto-retry) — it's what the batched provisioning above builds on, layered over
`@misonetwork/sdk`'s transport-agnostic `buildTx`/`toExecResult`.

## Extensions

An extension attaches data to a protocol work through that work's cap-gated
`uid_mut` hook. The work stays a protocol object; the opinion hanging off it is
ours.

### Credits (`credits.ts`)

Contributor credits pair a party with a display name and one or more
domain-specific roles, attached to a work as a dynamic field and gated by the
work's admin cap. Three role vocabularies:

- **Composition** (writing, 1–5 roles, no level): `Adapter`, `Arranger`, `Composer`, `Lyricist`, `Songwriter`, `Translator`, or `{ type: "Custom", name }`.
- **Recording** (production/performance, 1–10 roles): 28 leveled roles (`Producer`, `Vocalist`, `Engineer`, …) each with an optional seniority `level` (`Lead`, `Featured`, `Executive`, …), plus `{ type: "Instrumentalist", instrument, level? }`, `{ type: "Custom", name, level? }`, and the unleveled `ArtistsAndRepertoire` / `Copyist`.
- **Release** (top-line billing, exactly one role): `"Primary"` or `"Featured"`.

Writers validate client-side, mirroring the Move aborts: display name
non-empty and ≤200 UTF-8 bytes; role counts within the caps above; no
duplicate roles.

```ts
import {
  attachCompositionCredit, attachRecordingCredit, addReleaseCredit,
  addRecordingPrimaryArtist, addRecordingFeaturedArtist,
  getCompositionCredits, getRecordingCredits, getReleaseCredits,
} from "@misofm/sdk";

const thunk = attachRecordingCredit({
  recordingId: "0x...",
  recordingAdminCapId: "0x...",
  partyId: "0x...",
  displayName: "Jane Doe",
  roles: [{ type: "Vocalist", level: "Lead" }, { type: "Instrumentalist", instrument: "Guitar" }],
  recordingShareType: "0x...::share::Share",
  compositionShareType: "0x...::share::Share",
  recordingCreditsPackageId: "0x...",
  misoCreditPackageId: "0x...",
});

// Designate an already-credited party (same params minus displayName/roles/misoCreditPackageId):
addRecordingPrimaryArtist({ recordingId, recordingAdminCapId, partyId, recordingShareType, compositionShareType, recordingCreditsPackageId });

// Reads return null when no credits field is attached.
const credits = await getCompositionCredits(client, compositionId, compositionCreditsPackageId);
// CreditView[]: { partyId, displayName, roles: string[] } — e.g. "Producer (Lead)", "Instrumentalist: Guitar"
const rc = await getRecordingCredits(client, recordingId, recordingCreditsPackageId);
// { credits: CreditView[], primaryArtistIds: string[], featuredArtistIds: string[] }
```

`attachCompositionCredit` takes `compositionId`/`compositionAdminCapId`/`compositionShareType`/`compositionCreditsPackageId`;
`addReleaseCredit` takes `releaseId`/`releaseAdminCapId` and a single `role`.

A recording is `Recording<RecordingShare, CompositionShare>` — the recording's
OWN share type comes first, its parent composition's second. The recording
writers take both as separate named params for that reason; passing them in the
wrong order still typechecks (both are `string`) and resolves to the wrong
on-chain type.

### Cover art (`cover.ts`)

A release's cover is a Walrus blob referenced on-chain via `ori::WalrusData`,
attached under the `release_cover_art` extension:

```ts
import { setReleaseCover, getReleaseCover } from "@misofm/sdk";

const thunk = setReleaseCover({
  releaseId: "0x...",
  releaseAdminCapId: "0x...",
  stillBlobId: "987654321",   // Walrus blob id as u256 (decimal string or bigint)
  animatedBlobId: null,        // optional animated cover
  coverArtPackageId: "0x...",
  releaseCoverArtPackageId: "0x...",
  oriPackageId: "0x...",
});

const cover = await getReleaseCover(client, releaseId, releaseCoverArtPackageId);
// ReleaseCoverView | null: { still, animated } as normalized Walrus refs
// ({ kind: "blob", blobId } | { kind: "quiltPatch", quiltId, version, startIndex, endIndex })
```

### Vault plugins (`vault.ts`)

`vault.ts` contains composable PTB builders for custody and plugin flows:
`invokeWithAdminCap` safely sequences `borrow_as_admin → Move call → put_back`, and
`custodyNewAdminCap` shares the Vault while transferring only its owner-held
`VaultAdminCap`. Plugin installers construct their witnesses inside their Move
package; callers supply no witness.

It also builds Composition/Recording royalty-pool initialization and cranks,
Release `redeem_and_distribute` / `receive_and_distribute`, and the full
Composition routed-stake lifecycle. Receive flows take coin IDs and construct
the required `vector<Receiving<Coin<Currency>>>` in the PTB.

### Extension types

```ts
import type {
  CreditView, RecordingCreditsView,
  CompositionRole, RecordingRole, RecordingRoleLevel, RecordingLeveledRoleType,
  ReleaseRole,
  ReleaseCoverView, CoverImageRef,
} from "@misofm/sdk";
```

`RecordingLeveledRoleType` is the union of the 28 recording role base names that
carry an optional `RecordingRoleLevel` (`Producer`, `Vocalist`, `Engineer`,
`Conductor`, …) — the leveled arm of `RecordingRole`. The other arms
(`Instrumentalist`, `Custom`, and the unleveled `ArtistsAndRepertoire` /
`Copyist`) are spelled out separately in `RecordingRole`.

## Layout

```
src/
  deployments.ts         fail-closed deployment schema and future address injection point
  client.ts              the full client.miso facade; protocol lives at client.miso.protocol
  pressing.ts            facade: builders, readers, and the id derivations
  queries.ts             shared read plumbing (isNotFound, re-exported from @misonetwork/sdk)
  transactions.ts        the TxThunk contract + the opinionated publish flow (disperse/finalize/publish*)
  release-graph.ts        whole release graph in one PTB (publishReleaseGraph)
  share.ts               share-currency provisioning (createShareCurrency, batched variants)
  share-template.ts      embedded `share` package bytecode
  credits.ts             EXTENSION: contributor credits + the three role vocabularies
  cover.ts               EXTENSION: release cover art (Walrus blob via ori)
  drop.ts                existing launch-drop compatibility surface
  read/                  high-level catalog, artist, wallet, and receipt views
  vault.ts               Vault authority, plugin, event, and receiving-coin builders
  execute.ts              executeViaExecutor, layered on @misonetwork/sdk's buildTx/toExecResult
  internal.ts            private helpers (the 0x1::option moveCall targets) — NOT exported
  contracts.ts           barrel re-exporting the generated bindings as `contracts`
  contracts/             GENERATED — do not edit by hand
```

## Codegen

Bindings are generated from the live Move source, so the typed layer cannot drift from
the on-chain ABI:

```sh
bun run codegen   # reads sui-codegen.config.ts → src/contracts/
```

`sui-codegen.config.ts` lists the platform package (`miso_pressing`), data
extensions, generic `royalty_pool`/`routed_stake`, and the `vault` plus all
vault-plugin packages. The protocol CORE (`miso` —
composition/recording/release/track) generates into
`@misonetwork/sdk` instead, which this package depends on for those bindings —
adding the core here to save an import is how the split this package exists to
enforce gets undone.

Paths resolve against sibling checkouts, so regenerating requires
`~/Documents/GitHub/misofm/{sdk, pressing, vault, vault-plugins}` and
`~/Documents/GitHub/misonetwork/{protocol, protocol-extensions,
royalty-pool, routed-stake, share}`.

## Dependency on `@misonetwork/sdk`

`@misonetwork/sdk` is a `dependencies` entry (not a peer). This package imports
its primitives, deployment configuration, and protocol client directly, then
wraps that client at `client.miso.protocol`; applications do not install or
register a second protocol extension.
`@mysten/sui` itself stays a peer dependency here, same as in
`@misonetwork/sdk`.

`@misonetwork/sdk` is installed from npm like any other dependency — no local
linking, no workspace, no build step on the consumer side. It ships compiled
output plus declarations, so this package resolves it the same way a third
party would.

```bash
bun install
```

If you are changing both packages at once, `bun link` still works for a local
loop — register the protocol SDK with `bun link` in its checkout, then run `bun
link @misonetwork/sdk` here. Keep `@misonetwork/sdk` at its released semver
range (`^0.7.0`) when committing. Note that `file:` does NOT work for this: Bun copies a `file:`
dependency while honouring `.gitignore`, and `@misonetwork/sdk` builds to a
gitignored `dist/`, so the copy arrives empty and nothing resolves.
