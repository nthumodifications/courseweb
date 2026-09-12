declare module "flexsearch" {
  class Index {
    constructor(options?: {
      tokenize?: string;
      resolution?: number;
      minlength?: number;
      encode?: (value: string) => string[];
    });
    add(id: string, text: string): this;
    search(query: string, limit?: number): string[];
  }

  const FlexSearch: { Index: typeof Index };
  export = FlexSearch;
}
