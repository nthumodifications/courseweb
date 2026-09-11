import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Switch,
  useToast,
} from "@courseweb/ui";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  EmptyState,
  ErrorState,
  InlineSpinner,
  Mono,
  PageHeader,
} from "../components";
import {
  useAdminOAuthClients,
  useCreateOAuthClient,
  useDeleteOAuthClient,
  useRotateClientSecret,
  useUpdateOAuthClient,
  type AdminClient,
  type AdminIdentity,
  type AdminOAuthClientInput,
} from "../api";

const VALID_SCOPES = [
  { value: "openid", description: "Stable subject identifier" },
  { value: "profile", description: "Name, English name and school status" },
  { value: "email", description: "Email address" },
  { value: "offline_access", description: "Long-lived refresh access" },
  { value: "kv", description: "Key-value storage" },
  { value: "calendar", description: "Calendar data" },
  { value: "planner", description: "Planner data" },
] as const;

type ClientFormValues = {
  clientId: string;
  name: string;
  clientUri: string;
  firstParty: boolean;
  confidential: boolean;
  redirectUris: string[];
  logoutUris: string[];
  scopes: string[];
};

type ClientFormErrors = Partial<
  Record<
    "clientId" | "clientUri" | "redirectUris" | "logoutUris" | "scopes",
    string
  >
>;

type SecretNotice = {
  clientId: string;
  clientSecret: string | null;
  action: "created" | "rotated";
};

const emptyClientForm = (): ClientFormValues => ({
  clientId: "",
  name: "",
  clientUri: "",
  firstParty: false,
  confidential: false,
  redirectUris: [""],
  logoutUris: [],
  scopes: [],
});

const formFromClient = (client: AdminClient): ClientFormValues => ({
  clientId: client.clientId,
  name: client.name ?? "",
  clientUri: client.clientUri ?? "",
  firstParty: client.firstParty,
  confidential: client.confidential,
  redirectUris: [...client.redirectUris],
  logoutUris: [...client.logoutUris],
  scopes: [...client.scopes],
});

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const validateClientForm = (
  values: ClientFormValues,
  isCreate: boolean,
): ClientFormErrors => {
  const errors: ClientFormErrors = {};
  const clientId = values.clientId.trim();

  if (isCreate) {
    if (clientId.length < 3 || clientId.length > 64) {
      errors.clientId = "Client ID must be between 3 and 64 characters.";
    } else if (!/^[a-zA-Z0-9._-]+$/.test(clientId)) {
      errors.clientId =
        "Client ID may use only letters, digits, periods, underscores and hyphens.";
    }
  }

  if (values.clientUri.trim() && !isValidUrl(values.clientUri.trim())) {
    errors.clientUri = "Client URI must be a valid URL.";
  }

  if (values.redirectUris.length === 0) {
    errors.redirectUris = "Add at least one redirect URI.";
  } else if (values.redirectUris.some((uri) => !isValidUrl(uri.trim()))) {
    errors.redirectUris = "Every redirect URI must be a valid URL.";
  }

  if (values.logoutUris.some((uri) => !isValidUrl(uri.trim()))) {
    errors.logoutUris = "Every logout URI must be a valid URL.";
  }

  if (values.scopes.length === 0) {
    errors.scopes = "Select at least one scope.";
  }

  return errors;
};

const toApiInput = (values: ClientFormValues): AdminOAuthClientInput => ({
  clientId: values.clientId.trim(),
  name: values.name.trim() || null,
  clientUri: values.clientUri.trim() || null,
  firstParty: values.firstParty,
  confidential: values.confidential,
  redirectUris: values.redirectUris.map((uri) => uri.trim()),
  logoutUris: values.logoutUris.map((uri) => uri.trim()),
  scopes: values.scopes,
});

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null;

const UriListEditor = ({
  label,
  description,
  values,
  onChange,
  onAdd,
  onRemove,
  error,
  required,
  idPrefix,
}: {
  label: string;
  description: string;
  values: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  error?: string;
  required?: boolean;
  idPrefix: string;
}) => (
  <div className="space-y-2">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <Label>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus aria-hidden />
        Add URI
      </Button>
    </div>

    {values.length === 0 ? (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        No URIs configured.
      </p>
    ) : (
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={`${idPrefix}-${index}`} className="flex items-start gap-2">
            <Input
              id={`${idPrefix}-${index}`}
              type="url"
              inputMode="url"
              placeholder="https://example.com/callback"
              value={value}
              onChange={(event) => onChange(index, event.target.value)}
              aria-label={`${label} ${index + 1}`}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
      </div>
    )}

    <FieldError message={error} />
  </div>
);

const ClientFormDialog = ({
  open,
  onOpenChange,
  mode,
  client,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  client?: AdminClient;
  pending: boolean;
  onSubmit: (values: ClientFormValues) => void;
}) => {
  const [values, setValues] = useState<ClientFormValues>(() =>
    mode === "edit" && client ? formFromClient(client) : emptyClientForm(),
  );
  const [errors, setErrors] = useState<ClientFormErrors>({});
  const idPrefix = mode === "create" ? "create-client" : "edit-client";

  useEffect(() => {
    if (!open) return;
    setValues(
      mode === "edit" && client ? formFromClient(client) : emptyClientForm(),
    );
    setErrors({});
  }, [client?.id, mode, open]);

  const setValue = <K extends keyof ClientFormValues>(
    key: K,
    value: ClientFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const updateUri = (
    key: "redirectUris" | "logoutUris",
    index: number,
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      [key]: current[key].map((uri, uriIndex) =>
        uriIndex === index ? value : uri,
      ),
    }));
  };

  const addUri = (key: "redirectUris" | "logoutUris") => {
    setValues((current) => ({
      ...current,
      [key]: [...current[key], ""],
    }));
  };

  const removeUri = (key: "redirectUris" | "logoutUris", index: number) => {
    setValues((current) => ({
      ...current,
      [key]: current[key].filter((_, uriIndex) => uriIndex !== index),
    }));
  };

  const toggleScope = (scope: string, checked: boolean) => {
    setValues((current) => ({
      ...current,
      scopes: checked
        ? current.scopes.includes(scope)
          ? current.scopes
          : [...current.scopes, scope]
        : current.scopes.filter((value) => value !== scope),
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateClientForm(values, mode === "create");
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create OAuth client" : "Edit OAuth client"}
          </DialogTitle>
          <DialogDescription>
            Register the application metadata and permissions used during OAuth
            sign-in.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" noValidate onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-client-id`}>Client ID</Label>
              <Input
                id={`${idPrefix}-client-id`}
                value={values.clientId}
                onChange={(event) => setValue("clientId", event.target.value)}
                disabled={mode === "edit"}
                className={mode === "edit" ? "font-mono" : undefined}
                autoComplete="off"
              />
              {mode === "create" && (
                <p className="text-xs text-muted-foreground">
                  3–64 characters: letters, digits, periods, underscores or
                  hyphens.
                </p>
              )}
              <FieldError message={errors.clientId} />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-name`}>Name</Label>
              <Input
                id={`${idPrefix}-name`}
                value={values.name}
                onChange={(event) => setValue("name", event.target.value)}
                placeholder="NTHUMods mobile app"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${idPrefix}-client-uri`}>Client URI</Label>
              <Input
                id={`${idPrefix}-client-uri`}
                type="url"
                inputMode="url"
                value={values.clientUri}
                onChange={(event) => setValue("clientUri", event.target.value)}
                placeholder="https://example.com"
              />
              <FieldError message={errors.clientUri} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Switch
                id={`${idPrefix}-first-party`}
                checked={values.firstParty}
                onCheckedChange={(checked) => setValue("firstParty", checked)}
              />
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-first-party`}>First-party</Label>
                <p className="text-xs text-muted-foreground">
                  Trusted NTHUMods-owned application. First-party clients cannot
                  be deleted here.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border p-3">
              <Switch
                id={`${idPrefix}-confidential`}
                checked={values.confidential}
                disabled={mode === "edit"}
                onCheckedChange={(checked) => setValue("confidential", checked)}
              />
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-confidential`}>Confidential</Label>
                <p className="text-xs text-muted-foreground">
                  {mode === "edit"
                    ? "Set at creation; use Rotate secret to replace its secret."
                    : "Create a client secret for a server-side application."}
                </p>
              </div>
            </div>
          </div>

          <UriListEditor
            label="Redirect URIs"
            description="Authorization codes may be sent only to these exact URLs."
            values={values.redirectUris}
            onChange={(index, value) => updateUri("redirectUris", index, value)}
            onAdd={() => addUri("redirectUris")}
            onRemove={(index) => removeUri("redirectUris", index)}
            error={errors.redirectUris}
            required
            idPrefix={`${idPrefix}-redirect-uri`}
          />

          <UriListEditor
            label="Logout URIs"
            description="Optional URLs allowed as post-logout destinations."
            values={values.logoutUris}
            onChange={(index, value) => updateUri("logoutUris", index, value)}
            onAdd={() => addUri("logoutUris")}
            onRemove={(index) => removeUri("logoutUris", index)}
            error={errors.logoutUris}
            idPrefix={`${idPrefix}-logout-uri`}
          />

          <div className="space-y-2">
            <div>
              <Label>
                Scopes <span className="text-destructive">*</span>
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                The authorization server will issue only the selected scopes.
              </p>
            </div>
            <div
              className="grid gap-2 sm:grid-cols-2"
              role="group"
              aria-label="OAuth scopes"
            >
              {VALID_SCOPES.map((scope) => (
                <label
                  key={scope.value}
                  htmlFor={`${idPrefix}-scope-${scope.value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
                >
                  <Checkbox
                    id={`${idPrefix}-scope-${scope.value}`}
                    checked={values.scopes.includes(scope.value)}
                    onCheckedChange={(checked) =>
                      toggleScope(scope.value, checked === true)
                    }
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-sm">
                      {scope.value}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {scope.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError message={errors.scopes} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <InlineSpinner />}
              {mode === "create" ? "Create client" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const SecretDialog = ({
  notice,
  onOpenChange,
}: {
  notice: SecretNotice | null;
  onOpenChange: (open: boolean) => void;
}) => {
  const { toast } = useToast();
  const hasSecret = Boolean(notice?.clientSecret);

  const copySecret = async () => {
    if (!notice?.clientSecret) return;
    try {
      await navigator.clipboard.writeText(notice.clientSecret);
      toast({ title: "Client secret copied" });
    } catch {
      toast({
        title: "Could not copy client secret",
        description: "Copy it manually before closing this dialog.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={Boolean(notice)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {notice?.action === "rotated"
              ? "New client secret"
              : "Client secret created"}
          </DialogTitle>
          <DialogDescription>
            This secret is shown exactly once and will not be shown again after
            this dialog is closed. Store it securely now.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm">
            Client ID: <Mono>{notice?.clientId}</Mono>
          </div>
          {hasSecret ? (
            <div className="rounded-md border bg-muted/50 p-3">
              <code className="block break-all font-mono text-sm">
                {notice?.clientSecret}
              </code>
            </div>
          ) : (
            <p className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
              This is a public client and does not have a client secret.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!hasSecret}
            onClick={() => void copySecret()}
          >
            <Copy aria-hidden />
            Copy secret
          </Button>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button>{hasSecret ? "I saved the secret" : "Close"}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AdminClientsPage = () => {
  const identity = useOutletContext<AdminIdentity>();
  const query = useAdminOAuthClients();
  const createMutation = useCreateOAuthClient();
  const updateMutation = useUpdateOAuthClient();
  const rotateMutation = useRotateClientSecret();
  const deleteMutation = useDeleteOAuthClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<AdminClient | null>(null);
  const [rotateClient, setRotateClient] = useState<AdminClient | null>(null);
  const [deleteClient, setDeleteClient] = useState<AdminClient | null>(null);
  const [secretNotice, setSecretNotice] = useState<SecretNotice | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const showMutationError = (title: string, error: unknown) => {
    toast({
      title,
      description: error instanceof Error ? error.message : "Something failed.",
      variant: "destructive",
    });
  };

  const handleCreate = (formValues: ClientFormValues) => {
    createMutation.mutate(toApiInput(formValues), {
      onSuccess: (client) => {
        setCreateOpen(false);
        setSecretNotice({
          clientId: client.clientId,
          clientSecret: client.clientSecret,
          action: "created",
        });
      },
      onError: (error) => showMutationError("Could not create client", error),
    });
  };

  const handleUpdate = (formValues: ClientFormValues) => {
    const { clientId, ...values } = toApiInput(formValues);
    updateMutation.mutate(
      { clientId, values },
      {
        onSuccess: () => {
          setEditClient(null);
          toast({ title: "OAuth client updated" });
        },
        onError: (error) => showMutationError("Could not update client", error),
      },
    );
  };

  const handleRotate = () => {
    if (!rotateClient) return;
    rotateMutation.mutate(rotateClient.clientId, {
      onSuccess: (result) => {
        setRotateClient(null);
        setSecretNotice({
          clientId: result.clientId,
          clientSecret: result.clientSecret,
          action: "rotated",
        });
      },
      onError: (error) => showMutationError("Could not rotate secret", error),
    });
  };

  const handleDelete = () => {
    if (!deleteClient) return;
    deleteMutation.mutate(deleteClient.clientId, {
      onSuccess: () => {
        setDeleteClient(null);
        toast({ title: "OAuth client deleted" });
      },
      onError: (error) => showMutationError("Could not delete client", error),
    });
  };

  if (!identity.isSuperuser) {
    return (
      <>
        <PageHeader
          title="OAuth Clients"
          description="Applications registered with the NTHUMods authorization server."
        />
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4">
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
            aria-hidden
          />
          <div>
            <h2 className="font-semibold">Superuser only</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              OAuth client registrations and secrets can be managed only by a
              superuser.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="OAuth Clients"
        description="Applications registered with the NTHUMods authorization server."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden />
            New client
          </Button>
        }
      />

      {query.isError && <ErrorState error={query.error} />}

      <TooltipProvider>
        <div className="overflow-x-auto rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Redirect URIs</TableHead>
                <TableHead>Consents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7}>
                      <div className="h-5 w-full animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))}

              {query.data?.map((client) => {
                const expanded = expandedClientId === client.clientId;
                return (
                  <Fragment key={client.id}>
                    <TableRow>
                      <TableCell className="align-top">
                        <Mono>{client.clientId}</Mono>
                      </TableCell>
                      <TableCell className="max-w-[220px] align-top">
                        <div className="truncate">
                          {client.name || (
                            <span className="text-muted-foreground">
                              Unnamed
                            </span>
                          )}
                        </div>
                        {client.clientUri && (
                          <div className="truncate text-xs text-muted-foreground">
                            {client.clientUri}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex min-w-[150px] flex-wrap gap-1">
                          <Badge
                            variant={client.firstParty ? "default" : "outline"}
                          >
                            {client.firstParty ? "First-party" : "Third-party"}
                          </Badge>
                          <Badge
                            variant={
                              client.confidential ? "secondary" : "outline"
                            }
                          >
                            {client.confidential ? "Confidential" : "Public"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[240px] align-top">
                        <div className="flex min-w-[180px] flex-wrap gap-1">
                          {client.scopes.map((scope) => (
                            <Badge
                              key={scope}
                              variant="secondary"
                              className="font-mono text-[0.7rem]"
                            >
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="whitespace-nowrap px-2"
                          aria-expanded={expanded}
                          aria-label={`${expanded ? "Hide" : "Show"} redirect URIs for ${client.clientId}`}
                          onClick={() =>
                            setExpandedClientId(
                              expanded ? null : client.clientId,
                            )
                          }
                        >
                          {client.redirectUris.length} URI
                          {client.redirectUris.length === 1 ? "" : "s"}
                          {expanded ? (
                            <ChevronUp aria-hidden />
                          ) : (
                            <ChevronDown aria-hidden />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="align-top tabular-nums">
                        {client.consents.toLocaleString()}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex min-w-[260px] flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditClient(client)}
                          >
                            <Pencil aria-hidden />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRotateClient(client)}
                          >
                            <RefreshCw aria-hidden />
                            Rotate secret
                          </Button>
                          {client.firstParty ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled
                                  >
                                    <Trash2 aria-hidden />
                                    Delete
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                First-party clients cannot be deleted.
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteClient(client)}
                            >
                              <Trash2 aria-hidden />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/20">
                          <div className="space-y-3 py-1">
                            <div>
                              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Redirect URIs
                              </div>
                              <ul className="grid gap-1">
                                {client.redirectUris.map((uri) => (
                                  <li key={uri} className="break-all">
                                    <Mono>{uri}</Mono>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {client.logoutUris.length > 0 && (
                              <div>
                                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Logout URIs
                                </div>
                                <ul className="grid gap-1">
                                  {client.logoutUris.map((uri) => (
                                    <li key={uri} className="break-all">
                                      <Mono>{uri}</Mono>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>

          {!query.isLoading && query.data?.length === 0 && (
            <EmptyState>No OAuth clients are registered.</EmptyState>
          )}
        </div>
      </TooltipProvider>

      <ClientFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        pending={createMutation.isPending}
        onSubmit={handleCreate}
      />
      <ClientFormDialog
        open={Boolean(editClient)}
        onOpenChange={(open) => {
          if (!open) setEditClient(null);
        }}
        mode="edit"
        client={editClient ?? undefined}
        pending={updateMutation.isPending}
        onSubmit={handleUpdate}
      />

      <AlertDialog
        open={Boolean(rotateClient)}
        onOpenChange={(open) => {
          if (!open && !rotateMutation.isPending) setRotateClient(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate client secret?</AlertDialogTitle>
            <AlertDialogDescription>
              Every deployment still using the old secret will break when this
              rotation completes. The new secret will be shown exactly once.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rotateMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={rotateMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleRotate();
              }}
            >
              {rotateMutation.isPending && <InlineSpinner />}
              Rotate secret
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteClient)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteClient(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OAuth client?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteClient?.clientId} and its OAuth
              registration. Existing tokens or consents for this client may no
              longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              {deleteMutation.isPending && <InlineSpinner />}
              Delete client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SecretDialog
        notice={secretNotice}
        onOpenChange={(open) => {
          if (!open) setSecretNotice(null);
        }}
      />
    </>
  );
};

export default AdminClientsPage;
