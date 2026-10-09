export const ModuleLoading = () => (
  <div className="flex animate-pulse flex-col gap-6">
    <header className="flex flex-col gap-3">
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="h-8 w-3/4 rounded bg-muted" />
      <div className="h-5 w-2/3 rounded bg-muted" />
      <div className="h-4 w-64 rounded bg-muted" />
    </header>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="h-12 w-4/5 rounded bg-muted" />
          <div className="h-5 w-2/3 rounded bg-muted" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="grid grid-cols-8 gap-3">
            {Array.from({ length: 24 }, (_, index) => (
              <div
                key={index}
                className="justify-self-center h-5 w-5 rounded-full bg-muted"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="h-5 w-24 rounded bg-muted" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-11 w-32 rounded-full bg-muted" />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-16 rounded bg-muted/60" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
