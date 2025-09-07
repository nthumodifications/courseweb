"use client";

import {
  createContext,
  useContext,
  FC,
  PropsWithChildren,
  useEffect,
  useState,
} from "react";
import { useRxCollection } from "rxdb-hooks";
import { replicateRxCollection } from "rxdb/plugins/replication";
import { useAuth } from "react-oidc-context";
import { WithDeleted } from "rxdb";
import {
  FolderDocType,
  ItemDocType,
  PlannerDataDocType,
  SemesterDocType,
} from "./rxdb";
import client from "@/config/api";

// Create context with more detailed initialization state
export const PlannerReplicationContext = createContext<{
  initialized: boolean;
  foldersInitialized: boolean;
  itemsInitialized: boolean;
  plannerdataInitialized: boolean;
  semestersInitialized: boolean;
}>({
  initialized: false,
  foldersInitialized: false,
  itemsInitialized: false,
  plannerdataInitialized: false,
  semestersInitialized: false,
});

// Hook to use the context
export const usePlannerReplication = () =>
  useContext(PlannerReplicationContext);

// Helper function to check if user has planner scope
const hasPlannerScope = (auth: ReturnType<typeof useAuth>): boolean => {
  if (!auth.isAuthenticated || !auth.user) return false;
  const scopes = auth.user.scope?.split(" ") || [];
  return scopes.includes("planner");
};

// Provider component for setting up replication
export const PlannerReplicationProvider: FC<PropsWithChildren> = ({
  children,
}) => {
  const auth = useAuth();
  const foldersCol = useRxCollection<FolderDocType>("folders");
  const itemsCol = useRxCollection<ItemDocType>("items");
  const plannerdataCol = useRxCollection<PlannerDataDocType>("plannerdata");
  const semestersCol = useRxCollection<SemesterDocType>("semesters");

  // State to track initialization status
  const [foldersInitialized, setFoldersInitialized] = useState(false);
  const [itemsInitialized, setItemsInitialized] = useState(false);
  const [plannerdataInitialized, setPlannerdataInitialized] = useState(false);
  const [semestersInitialized, setSemestersInitialized] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Calculate overall initialized state
  const initialized =
    !auth.isAuthenticated ||
    (foldersInitialized &&
      itemsInitialized &&
      plannerdataInitialized &&
      semestersInitialized);

  // Handle authentication and scopes
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    // If we already have the planner scope, no need to do anything
    if (hasPlannerScope(auth)) return;

    // Prevent multiple simultaneous sign-in attempts
    if (isSigningIn) return;

    // Attempt silent sign-in to get the planner scope
    setIsSigningIn(true);
    console.log("Planner scope missing, attempting silent sign-in");

    auth
      .signinRedirect()
      .then(() => {
        console.log("Silent sign-in completed");
      })
      .catch((err) => {
        console.error("Silent sign-in failed:", err);
      });
  }, [auth, isSigningIn]);

  // Set up replication for folders
  useEffect(() => {
    if (!foldersCol) return;
    if (!auth.isAuthenticated) return;
    if (!hasPlannerScope(auth)) return; // Skip replication if scope is missing

    const replicationState = replicateRxCollection<
      FolderDocType,
      { id: string; serverTimestamp: string }
    >({
      collection: foldersCol,
      replicationIdentifier: "folders-replication",
      live: true,
      push: {
        async handler(changeRows) {
          try {
            // Filter out the _unsorted folder before pushing to server
            const filteredChangeRows = changeRows.filter(
              (row) => row.newDocumentState.id !== "_unsorted",
            );

            // Skip the API call if there are no changes to push after filtering
            if (filteredChangeRows.length === 0) {
              return [];
            }

            const response = await client.planner.folders.push.$post(
              {
                json: filteredChangeRows,
              },
              {
                headers: {
                  Authorization: `Bearer ${auth.user?.access_token}`,
                },
              },
            );
            const conflicts = await response.json();
            return conflicts as WithDeleted<FolderDocType>[];
          } catch (error) {
            console.error("Error pushing folders:", error);
            return [];
          }
        },
      },
      pull: {
        async handler(lastPulledCheckpoint, batchSize) {
          const serverTimestamp = lastPulledCheckpoint
            ? lastPulledCheckpoint.serverTimestamp
            : "";
          const id = lastPulledCheckpoint ? lastPulledCheckpoint.id : "";

          const response = await client.planner.folders.pull.$get(
            {
              query: {
                id,
                serverTimestamp,
                batchSize: batchSize.toString(),
              },
            },
            {
              headers: {
                Authorization: `Bearer ${auth.user?.access_token}`,
              },
            },
          );

          const data = await response.json();
          // Filter out _unsorted folder if it somehow exists in pulled data
          if (data.documents) {
            data.documents = data.documents.filter(
              (doc) => doc.id !== "_unsorted",
            );
          }

          return {
            documents: data.documents as WithDeleted<FolderDocType>[],
            checkpoint: data.checkpoint,
          };
        },
      },
    });

    replicationState.error$.subscribe((error) =>
      console.error("Folders replication error:", error),
    );
    replicationState.start();
    replicationState.awaitInitialReplication().then(() => {
      console.log("[folders] Initial replication done");
      setFoldersInitialized(true);
    });

    return () => {
      replicationState.cancel();
    };
  }, [auth, foldersCol]);

  // Set up replication for items
  useEffect(() => {
    if (!itemsCol) return;
    if (!auth.isAuthenticated) return;
    if (!hasPlannerScope(auth)) return; // Skip replication if scope is missing

    const replicationState = replicateRxCollection<
      ItemDocType,
      { uuid: string; serverTimestamp: string }
    >({
      collection: itemsCol,
      replicationIdentifier: "items-replication",
      live: true,
      push: {
        async handler(changeRows) {
          const response = await client.planner.items.push.$post(
            {
              json: changeRows,
            },
            {
              headers: {
                Authorization: `Bearer ${auth.user?.access_token}`,
              },
            },
          );
          const conflicts = await response.json();
          return conflicts as WithDeleted<ItemDocType>[];
        },
      },
      pull: {
        async handler(lastPulledCheckpoint, batchSize) {
          const serverTimestamp = lastPulledCheckpoint
            ? lastPulledCheckpoint.serverTimestamp
            : "";
          const uuid = lastPulledCheckpoint ? lastPulledCheckpoint.uuid : "";

          const response = await client.planner.items.pull.$get(
            {
              query: {
                uuid,
                serverTimestamp,
                batchSize: batchSize.toString(),
              },
            },
            {
              headers: {
                Authorization: `Bearer ${auth.user?.access_token}`,
              },
            },
          );

          const data = await response.json();
          return {
            documents: data.documents as WithDeleted<ItemDocType>[],
            checkpoint: data.checkpoint,
          };
        },
      },
    });

    replicationState.error$.subscribe((error) =>
      console.error("Items replication error:", error),
    );
    replicationState.start();
    replicationState.awaitInitialReplication().then(() => {
      console.log("[items] Initial replication done");
      setItemsInitialized(true);
    });

    return () => {
      replicationState.cancel();
    };
  }, [auth, itemsCol]);

  // Set up replication for plannerdata
  useEffect(() => {
    if (!plannerdataCol) return;
    if (!auth.isAuthenticated) return;
    if (!hasPlannerScope(auth)) return; // Skip replication if scope is missing

    const replicationState = replicateRxCollection<
      PlannerDataDocType,
      { id: string; serverTimestamp: string }
    >({
      collection: plannerdataCol,
      replicationIdentifier: "plannerdata-replication",
      live: true,
      push: {
        async handler(changeRows) {
          try {
            const response = await client.planner.plannerdata.push.$post(
              {
                json: changeRows,
              },
              {
                headers: {
                  Authorization: `Bearer ${auth.user?.access_token}`,
                },
              },
            );
            const conflicts = await response.json();
            return conflicts as WithDeleted<PlannerDataDocType>[];
          } catch (error) {
            console.error("Error pushing plannerdata:", error);
            return [];
          }
        },
      },
      pull: {
        async handler(lastPulledCheckpoint, batchSize) {
          const serverTimestamp = lastPulledCheckpoint
            ? lastPulledCheckpoint.serverTimestamp
            : "";
          const id = lastPulledCheckpoint ? lastPulledCheckpoint.id : "";

          const response = await client.planner.plannerdata.pull.$get(
            {
              query: {
                id,
                serverTimestamp,
                batchSize: batchSize.toString(),
              },
            },
            {
              headers: {
                Authorization: `Bearer ${auth.user?.access_token}`,
              },
            },
          );

          const data = await response.json();

          return {
            documents:
              data.documents as unknown as WithDeleted<PlannerDataDocType>[],
            checkpoint: data.checkpoint,
          };
        },
      },
    });

    replicationState.error$.subscribe((error) =>
      console.error("PlannerData replication error:", error),
    );
    replicationState.start();
    replicationState.awaitInitialReplication().then(() => {
      console.log("[plannerdata] Initial replication done");
      setPlannerdataInitialized(true);
    });

    return () => {
      replicationState.cancel();
    };
  }, [auth, plannerdataCol]);

  // Set up replication for semesters
  useEffect(() => {
    if (!semestersCol) return;
    if (!auth.isAuthenticated) return;
    if (!hasPlannerScope(auth)) return; // Skip replication if scope is missing

    const replicationState = replicateRxCollection<
      SemesterDocType,
      { id: string; serverTimestamp: string }
    >({
      collection: semestersCol,
      replicationIdentifier: "semesters-replication",
      live: true,
      push: {
        async handler(changeRows) {
          try {
            const response = await client.planner.semesters.push.$post(
              {
                json: changeRows,
              },
              {
                headers: {
                  Authorization: `Bearer ${auth.user?.access_token}`,
                },
              },
            );
            const conflicts = await response.json();
            return conflicts as WithDeleted<SemesterDocType>[];
          } catch (error) {
            console.error("Error pushing semesters:", error);
            return [];
          }
        },
      },
      pull: {
        async handler(lastPulledCheckpoint, batchSize) {
          const serverTimestamp = lastPulledCheckpoint
            ? lastPulledCheckpoint.serverTimestamp
            : "";
          const id = lastPulledCheckpoint ? lastPulledCheckpoint.id : "";

          const response = await client.planner.semesters.pull.$get(
            {
              query: {
                id,
                serverTimestamp,
                batchSize: batchSize.toString(),
              },
            },
            {
              headers: {
                Authorization: `Bearer ${auth.user?.access_token}`,
              },
            },
          );

          const data = await response.json();
          return {
            documents: data.documents as WithDeleted<SemesterDocType>[],
            checkpoint: data.checkpoint,
          };
        },
      },
    });

    replicationState.error$.subscribe((error) =>
      console.error("Semesters replication error:", error),
    );
    replicationState.start();
    replicationState.awaitInitialReplication().then(() => {
      console.log("[semesters] Initial replication done");
      setSemestersInitialized(true);
    });

    return () => {
      replicationState.cancel();
    };
  }, [auth, semestersCol]);

  return (
    <PlannerReplicationContext.Provider
      value={{
        initialized,
        foldersInitialized,
        itemsInitialized,
        plannerdataInitialized,
        semestersInitialized,
      }}
    >
      {children}
    </PlannerReplicationContext.Provider>
  );
};
