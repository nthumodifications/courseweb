import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { dehydrate, QueryClient, useQueryClient } from "@tanstack/react-query";
import { describe, expect, mock, test } from "bun:test";

const seedClient = new QueryClient();
seedClient.setQueryData(["issues"], { privateBody: "legacy report" });
seedClient.setQueryData(["issue-report", "known"], [{ id: 1 }]);
seedClient.setQueryData(["courses"], [{ id: "MATH101" }]);

const persistedClients = [
  {
    timestamp: Date.now(),
    buster: "",
    clientState: dehydrate(seedClient),
  },
];
const persistClient = mock(
  async (client: (typeof persistedClients)[number]) => {
    persistedClients.push(client);
  },
);

mock.module("@/lib/idb_persister", () => ({
  createIDBPersister: () => ({
    persistClient,
    restoreClient: async () => persistedClients[0],
    removeClient: async () => {},
  }),
}));

const { default: ReactQuery, shouldPersistQuery } = await import(
  "./ReactQuery"
);

const waitFor = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (condition()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
};

describe("React Query persistence", () => {
  test("does not persist pending queries, which IndexedDB cannot clone", () => {
    const client = new QueryClient();
    client.setQueryData(["courses"], [{ id: "MATH101" }]);
    void client.prefetchQuery({
      queryKey: ["pending"],
      queryFn: () => new Promise(() => {}),
    });

    const state = dehydrate(client, {
      shouldDehydrateQuery: shouldPersistQuery,
    });

    expect(state.queries.map((query) => query.queryKey)).toEqual([["courses"]]);
    expect(() => structuredClone(state)).not.toThrow();
    client.clear();
  });

  test("removes restored issue reports and rewrites the filtered snapshot", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      HTMLElement: dom.window.HTMLElement,
      MutationObserver: dom.window.MutationObserver,
      Node: dom.window.Node,
    });

    let queryClient: QueryClient | undefined;
    const Probe = () => {
      queryClient = useQueryClient();
      return null;
    };
    const container = dom.window.document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(ReactQuery, null, createElement(Probe)));
    });
    await waitFor(() => persistClient.mock.calls.length > 0);

    expect(queryClient?.getQueryData(["issues"])).toBeUndefined();
    expect(
      queryClient?.getQueryData(["issue-report", "known"]),
    ).toBeUndefined();
    expect(persistClient).toHaveBeenCalled();
    const rewritten = persistedClients.at(-1);
    expect(
      rewritten?.clientState.queries.map((query) => query.queryKey),
    ).toEqual([["courses"]]);

    await act(async () => root.unmount());
  });
});
