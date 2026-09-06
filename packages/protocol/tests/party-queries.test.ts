import { describe, expect, it, mock } from "bun:test";
import type { ClientWithCoreApi } from "@mysten/sui/client";

import { Party as PartyBcs } from "../src/contracts/miso_party/party.ts";
import { getPartiesByIds } from "../src/party/queries.ts";

const id = (digit: string) => `0x${digit.repeat(64)}`;

describe("getPartiesByIds", () => {
  it("fetches every party through one Core batch and skips per-object errors", async () => {
    const soloId = id("1");
    const groupId = id("2");
    const getObjects = mock(async () => ({
      objects: [
        {
          objectId: soloId,
          content: PartyBcs.serialize({
            id: soloId,
            kind: { Individual: true },
            name: "Solo",
            created_at_ms: 1n,
          }).toBytes(),
        },
        new Error("pruned"),
        {
          objectId: groupId,
          content: PartyBcs.serialize({
            id: groupId,
            kind: { Group: { contents: [soloId] } },
            name: "Group",
            created_at_ms: 2n,
          }).toBytes(),
        },
      ],
    }));
    const client = { core: { getObjects } } as unknown as ClientWithCoreApi;

    const parties = await getPartiesByIds(client, [soloId, groupId, soloId]);

    expect(getObjects).toHaveBeenCalledTimes(1);
    expect(getObjects).toHaveBeenCalledWith({
      objectIds: [soloId, groupId],
      include: { content: true },
    });
    expect(parties[soloId]).toMatchObject({
      id: soloId,
      kind: "individual",
      name: "Solo",
    });
    expect(parties[groupId]).toMatchObject({
      id: groupId,
      kind: "group",
      name: "Group",
      members: [soloId],
    });
  });

  it("does not call the client for an empty id list", async () => {
    const getObjects = mock();
    const client = { core: { getObjects } } as unknown as ClientWithCoreApi;

    await expect(getPartiesByIds(client, [])).resolves.toEqual({});
    expect(getObjects).not.toHaveBeenCalled();
  });
});
