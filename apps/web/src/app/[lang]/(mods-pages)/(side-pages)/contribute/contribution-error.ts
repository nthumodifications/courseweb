export const contributionErrorCodes = [
  "invalid_session",
  "session_expired",
  "school_unreachable",
  "school_response_invalid",
  "invalid_semester",
  "storage_error",
  "rate_limited",
] as const;

export type ContributionErrorCode = (typeof contributionErrorCodes)[number];

export type ContributionErrorMessages = Record<
  ContributionErrorCode | "unknown",
  string
>;

export const getContributionErrorMessage = (
  messages: ContributionErrorMessages,
  code: string,
) =>
  contributionErrorCodes.includes(code as ContributionErrorCode)
    ? messages[code as ContributionErrorCode]
    : messages.unknown;
