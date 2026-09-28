import {
  buildFlexSearchIndex,
  searchFlexSearchIndex,
} from "./flexsearch-index";
import type {
  SearchWorkerScope,
  WorkerRequest,
  WorkerResponse,
} from "./worker-protocol";

const worker = self as unknown as SearchWorkerScope;
let index: ReturnType<typeof buildFlexSearchIndex> | undefined;

worker.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === "build") {
      index = buildFlexSearchIndex(request.documents);
      worker.postMessage({ type: "built", count: request.documents.length });
      return;
    }
    if (!index) throw new Error("Local search index is not built");
    const ids = searchFlexSearchIndex(index, request.query, request.limit);
    worker.postMessage({ type: "results", requestId: request.requestId, ids });
  } catch (error) {
    const response: WorkerResponse = {
      type: "error",
      ...(request.type === "search" ? { requestId: request.requestId } : {}),
      message: error instanceof Error ? error.message : "Local index failed",
    };
    worker.postMessage(response);
  }
};
