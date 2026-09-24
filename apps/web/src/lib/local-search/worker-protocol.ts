export type WorkerDocument = { id: string; text: string };

export type WorkerRequest =
  | { type: "build"; documents: WorkerDocument[] }
  | { type: "search"; requestId: number; query: string; limit: number };

export type WorkerResponse =
  | { type: "built"; count: number }
  | { type: "results"; requestId: number; ids: string[] }
  | { type: "error"; requestId?: number; message: string };

export type SearchWorker = {
  postMessage: (message: WorkerRequest) => void;
  terminate: () => void;
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
};

export type SearchWorkerScope = {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};
