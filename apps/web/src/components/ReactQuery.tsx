import {
  QueryClient,
  defaultShouldDehydrateQuery,
  type Query,
} from "@tanstack/react-query";
import {
  PersistQueryClientProvider,
  persistQueryClientSave,
  type Persister,
} from "@tanstack/react-query-persist-client";
import { PropsWithChildren } from "react";
import { createIDBPersister } from "@/lib/idb_persister";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

// Keep the default rule (successful queries only): a pending query carries a
// Promise, which IndexedDB cannot clone, so the whole snapshot would fail.
export const shouldPersistQuery = (query: Query) =>
  defaultShouldDehydrateQuery(query) &&
  query.queryKey[0] !== "issues" &&
  query.queryKey[0] !== "issue-report";

type ReactQueryProps = PropsWithChildren<{ persister?: Persister }>;

const ReactQuery = ({
  children,
  persister = createIDBPersister("nthumods_queries"),
}: ReactQueryProps) => {
  const persistOptions = {
    persister,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
  };
  const handleRestore = async () => {
    queryClient.removeQueries({ queryKey: ["issues"] });
    queryClient.removeQueries({ queryKey: ["issue-report"] });
    await persistQueryClientSave({ queryClient, ...persistOptions });
  };

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={handleRestore}
    >
      {children}
    </PersistQueryClientProvider>
  );
};

export default ReactQuery;
