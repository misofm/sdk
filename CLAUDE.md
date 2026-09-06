# misofm/sdks Agent Guide

## Sui Development Skills

Install community-maintained skills for Sui development:

```sh
npx skills https://github.com/MystenLabs/skills
```

## Sui SDK Reference

Every `@mysten/*` package ships LLM documentation in its `docs/` directory. When working with
these packages, find the relevant docs by looking for `docs/llms-index.md` files inside
`node_modules/@mysten/*/`. Read the index first to find the page you need, then read that page
for details.

## Official Resources

When unsure about Move patterns or Sui APIs, consult these sources. Do not guess or
extrapolate from other blockchains.

- Move Book: https://move-book.com (use https://move-book.com/llms.txt)
- Sui Docs: https://docs.sui.io (use https://docs.sui.io/llms.txt)
- Sui Move examples: https://github.com/MystenLabs/sui/tree/main/examples/move

## Project Structure

- `src/` — public TypeScript SDK, transaction builders, reads, and generated bindings
- `src/contracts/` — generated bindings; regenerate with `bun run codegen`
- `tests/` — Bun unit and transaction-shape tests
- `sui-codegen.config.ts` — sibling Move package inputs for binding generation

## Project Rules

- Use `@mysten/sui` v2 APIs and gRPC/Core client patterns; do not add JSON-RPC.
- Do not hand-edit generated files under `src/contracts/`.
- Keep PTB helpers composable: accept a `Transaction`, return results when useful, and do not execute.
- Run `bun run typecheck`, `bun test`, `bun run build`, and `bun run codegen:check` before handoff.
