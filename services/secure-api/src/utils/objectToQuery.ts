export function toQueryParams(params: { [key: string]: any }): string {
  const elements = Object.keys(params);

  elements.forEach((element) => {
    if (params[element] === undefined) {
      delete params[element];
    }
  });

  return new URLSearchParams(params).toString();
}
