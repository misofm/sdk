# @misofm/protocol

Typed bindings, queries, event decoders, and PTB builders for the Miso
protocol and Party package set on Sui.

## Exports

| Subpath                  | Purpose                                              |
| ------------------------ | ----------------------------------------------------- |
| `@misofm/protocol`         | Root entrypoint                                        |
| `@misofm/protocol/client`      | Client construction                                    |
| `@misofm/protocol/deployments` | Deployed package/object IDs by network                |
| `@misofm/protocol/queries`     | Read queries over protocol and Party objects           |
| `@misofm/protocol/transactions`| PTB command builders                                   |
| `@misofm/protocol/execute`     | Transaction execution helpers                          |
| `@misofm/protocol/view`        | `devInspect`-backed view helpers                        |
| `@misofm/protocol/types`       | Shared TypeScript types                                 |
| `@misofm/protocol/parsers`     | Event parsers                                           |
| `@misofm/protocol/events`      | Event decoders                                          |
| `@misofm/protocol/packages`    | Module→package bindings                                 |
| `@misofm/protocol/party`       | Party identity bindings                                 |
| `@misofm/protocol/contracts`   | Generated ABI-bound bindings (BCS structs + Move calls)  |

## Install

```sh
bun add @misofm/protocol
```

Peer dependency: `@mysten/sui@2.29.0` (exact).

## License

Apache-2.0
