# @misofm/sdk

Typed reads and transaction builders for the **Miso platform layer** on Sui: the
record production line and the sale of copies off it.

## The split

Miso ships two SDK families, and the npm scope tells you which promise you are
holding:

| Scope | Layer | Owns |
| --- | --- | --- |
| `@misonetwork/*` | **Protocol** | Composition, Recording, Release — the permissionless layer anyone can build on |
| `@misofm/*` | **Platform** | Pressing, Listing, Record — how Miso sells copies of a release |

A release is protocol. Pressing a record off that release and selling it is
platform. Keeping the boundary at the package line is what stops the open protocol
from quietly growing a storefront.

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

Register the extension on any client implementing Sui's Core API
([SDK building guidelines](https://sdk.mystenlabs.com/sui/sdk-building)):

```ts
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { misoPlatform } from "@misofm/sdk";

const client = new SuiGrpcClient({ network: "testnet", baseUrl }).$extend(
  misoPlatform({ packageId: MISO_PRESSING_PACKAGE_ID, settingsId: MISO_RECORD_SETTINGS_ID }),
);

// Read: run + one currency's offer, one round trip, no registry lookup.
const { pressing, listing } = await client.misoPlatform.getSale({
  releaseId,
  currencyType: USD_COIN_TYPE,
});

// Write: a thunk, so it composes with protocol calls in the same PTB.
const tx = new Transaction();
tx.add(
  client.misoPlatform.tx.buyRecord({
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

## Layout

```
src/
  client.ts              the client extension — misoPlatform({ packageId, settingsId })
  pressing.ts            facade: builders, readers, and the id derivations
  queries.ts             shared read plumbing (isNotFound)
  transactions.ts        the TxThunk contract
  contracts/             GENERATED — do not edit by hand
```

## Codegen

Bindings are generated from the live Move source, so the typed layer cannot drift from
the on-chain ABI:

```sh
bun run codegen   # reads sui-codegen.config.ts → src/contracts/
```

`sui-codegen.config.ts` lists **platform packages only**. Protocol packages generate
into `@misonetwork/miso-protocol`; adding one here to save an import is how the split
this package exists to enforce gets undone.
