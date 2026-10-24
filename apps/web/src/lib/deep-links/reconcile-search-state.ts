export function reconcileSearchState<T>(
  currentState: T,
  nextState: T,
  previousSearchKey: string,
  nextSearchKey: string,
): T {
  return previousSearchKey === nextSearchKey ? currentState : nextState;
}
