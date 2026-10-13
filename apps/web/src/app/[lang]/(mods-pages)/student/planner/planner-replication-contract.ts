export type PlannerResponse = {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
};

export const ensurePlannerResponseOk = async (
  response: PlannerResponse,
  operation: string,
) => {
  if (response.ok) return;
  const details = await response.text().catch(() => "");
  throw new Error(
    `${operation} failed with status ${response.status}${details ? `: ${details}` : ""}`,
  );
};
