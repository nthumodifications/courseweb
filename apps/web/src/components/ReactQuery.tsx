import { QueryClient } from "@tanstack/react-query";
import {
  PersistQueryClientProvider,
  persistQueryClientSave,
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

const persister = createIDBPersister("nthumods_queries");

const shouldPersistQuery = (query: { queryKey: readonly unknown[] }) =>
  query.queryKey[0] !== "issues" && query.queryKey[0] !== "issue-report";

const persistOptions = {
  persister,
  dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
};

const handleRestore = async () => {
  queryClient.removeQueries({ queryKey: ["issues"] });
  queryClient.removeQueries({ queryKey: ["issue-report"] });
  await persistQueryClientSave({ queryClient, ...persistOptions });
};

const ReactQuery = ({ children }: PropsWithChildren) => {
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
