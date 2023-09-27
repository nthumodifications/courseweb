Generate types for TypeScript. Must specify one of --local, --linked, --project-id, or --db-url

Usage:
  supabase gen types typescript [flags]

Examples:
  supabase gen types typescript --local
  supabase gen types typescript --linked
  supabase gen types typescript --project-id abc-def-123 --schema public --schema private
  supabase gen types typescript --db-url 'postgresql://...' --schema public --schema auth

Flags:
      --db-url string        Generate types from a database url.
  -h, --help                 help for typescript
      --linked               Generate types from the linked project.
      --local                Generate types from the local dev database.
      --project-id string    Generate types from a project ID.
      --schema stringArray   Schemas to generate types for.

Global Flags:
      --debug                             output debug logs to stderr
      --dns-resolver [ native | https ]   lookup domain names using the specified resolver (default native)
      --experimental                      enable experimental features
      --workdir string                    path to a Supabase project directory
