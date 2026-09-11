import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  X,
} from "@courseweb/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "react-oidc-context";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";

import useDictionary from "@/dictionaries/useDictionary";
import Footer from "@/components/Footer";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";

const API_BASE = import.meta.env.VITE_COURSEWEB_API_URL as string;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const applicationSchema = z.object({
  role: z.string().min(1),
  statement: z.string().trim().min(20).max(5000),
  contactPreference: z.enum(["email", "discord", "either"]),
  github: z.string().url().or(z.literal("")),
  portfolio: z.string().url().or(z.literal("")),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;
type Role = { id: string };
type Application = {
  id: string;
  role: string;
  status: "submitted" | "reviewing" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
};

const RecruitmentPage = () => {
  const dict = useDictionary();
  const auth = useAuth();
  const { lang } = useParams<{ lang: string }>();
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [applicationError, setApplicationError] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submittedNow, setSubmittedNow] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      role: "",
      statement: "",
      contactPreference: "email",
      github: "",
      portfolio: "",
    },
  });

  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_BASE}/recruit/roles`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) setRolesError(true);
          return;
        }
        const data = (await response.json()) as { roles: Role[] };
        if (!cancelled) setRoles(data.roles);
      })
      .catch(() => {
        if (!cancelled) setRolesError(true);
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadApplication = useCallback(async (accessToken: string) => {
    setApplicationLoading(true);
    setApplicationError(false);
    try {
      const response = await fetch(`${API_BASE}/recruit/application`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("application request failed");
      const data = (await response.json()) as Application | null;
      setApplication(data);
    } catch {
      setApplicationError(true);
    } finally {
      setApplicationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user?.access_token) {
      setApplication(null);
      setApplicationError(false);
      return;
    }
    void loadApplication(auth.user.access_token);
  }, [auth.isAuthenticated, auth.user?.access_token, loadApplication]);

  useEffect(() => {
    if (roles.length > 0 && !form.getValues("role")) {
      form.setValue("role", roles[0].id, { shouldValidate: true });
    }
  }, [form, roles]);

  const handleFileChange = (file: File | undefined) => {
    setFileError(null);
    setSelectedFile(null);
    if (!file) return;

    if (file.size > MAX_RESUME_BYTES) {
      setFileError(dict.recruit.form.file_size);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (
      file.type &&
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setFileError(dict.recruit.form.file_type);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getErrorCode = async (response: Response) => {
    const data = (await response.json().catch(() => null)) as {
      code?: string;
    } | null;
    return data?.code;
  };

  const handleSubmit = async (values: ApplicationFormValues) => {
    setSubmitError(null);
    if (!selectedFile) {
      setFileError(dict.recruit.form.file_required);
      return;
    }
    const accessToken = auth.user?.access_token;
    if (!accessToken) {
      setSubmitError(dict.recruit.form.network_error);
      return;
    }

    setIsUploading(true);
    try {
      const uploadBody = new FormData();
      uploadBody.append("file", selectedFile);
      const uploadResponse = await fetch(`${API_BASE}/recruit/resume-upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: uploadBody,
      });
      if (!uploadResponse.ok) {
        const code = await getErrorCode(uploadResponse);
        if (code === "RESUME_TOO_LARGE") {
          setFileError(dict.recruit.form.file_size);
        } else if (code === "INVALID_RESUME") {
          setFileError(dict.recruit.form.file_type);
        } else {
          setSubmitError(dict.recruit.form.network_error);
        }
        return;
      }

      const response = await fetch(`${API_BASE}/recruit/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          role: values.role,
          statement: values.statement,
          contactPreference: values.contactPreference,
          links: {
            ...(values.github ? { github: values.github } : {}),
            ...(values.portfolio ? { portfolio: values.portfolio } : {}),
          },
        }),
      });
      if (!response.ok) {
        const code = await getErrorCode(response);
        if (code === "ALREADY_APPLIED") {
          setSubmitError(dict.recruit.form.already_applied);
          await loadApplication(accessToken);
        } else if (code === "RESUME_REQUIRED") {
          setSubmitError(dict.recruit.form.file_required);
        } else {
          setSubmitError(dict.recruit.form.network_error);
        }
        return;
      }

      const data = (await response.json()) as Application;
      setApplication(data);
      setSubmittedNow(true);
    } catch {
      setSubmitError(dict.recruit.form.network_error);
    } finally {
      setIsUploading(false);
    }
  };

  const statusLabel = application
    ? dict.recruit.status[application.status]
    : null;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-10 sm:py-8">
      <article className="mx-auto w-full max-w-4xl">
        <div className="mb-8 text-left sm:mb-10 sm:text-center">
          <h1 className="mb-3 text-3xl font-bold sm:mb-4 sm:text-4xl md:text-5xl">
            {dict.recruit.title}
          </h1>
          <p className="mb-2 text-lg text-muted-foreground sm:mb-3 sm:text-xl">
            {dict.recruit.subtitle}
          </p>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
            {dict.recruit.intro}
          </p>
        </div>

        <section className="mb-8 sm:mb-10">
          <h2 className="mb-3 text-xl font-semibold sm:mb-4 sm:text-2xl">
            {dict.recruit.open_roles}
          </h2>
          {rolesLoading ? (
            <p className="text-muted-foreground">{dict.recruit.loading}</p>
          ) : rolesError ? (
            <p className="text-destructive">{dict.recruit.roles_error}</p>
          ) : roles.length === 0 ? (
            <p className="text-muted-foreground">{dict.recruit.no_roles}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {roles.map((role) => {
                const roleCopy =
                  dict.recruit.roles[
                    role.id as keyof typeof dict.recruit.roles
                  ];
                if (!roleCopy) return null;
                return (
                  <Card key={role.id}>
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">
                        {roleCopy.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{roleCopy.description}</CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Stacked and full width on a phone so the primary action is a real
            tap target instead of a cramped inline pair. */}
        <div className="mb-8 flex flex-col-reverse items-stretch gap-3 sm:mb-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link
            className="text-center text-primary underline sm:text-left"
            to={`/${lang}/team`}
          >
            {dict.recruit.meet_team}
          </Link>
          {!auth.isAuthenticated && !auth.isLoading && (
            <Button
              className="w-full sm:w-auto"
              onClick={() => void auth.signinRedirect()}
            >
              {dict.recruit.sign_in}
            </Button>
          )}
        </div>

        {auth.isLoading || applicationLoading ? (
          <p className="text-muted-foreground">{dict.recruit.loading}</p>
        ) : !auth.isAuthenticated ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                {dict.recruit.sign_in_prompt}
              </p>
            </CardContent>
          </Card>
        ) : applicationError ? (
          <p className="text-destructive">{dict.recruit.application_error}</p>
        ) : application ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {submittedNow
                  ? dict.recruit.submitted_title
                  : dict.recruit.application_status}
              </CardTitle>
              <CardDescription>
                {submittedNow
                  ? dict.recruit.submitted_description
                  : dict.recruit.existing_description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {dict.recruit.application_status}: {statusLabel}
              </p>
            </CardContent>
          </Card>
        ) : roles.length === 0 ? (
          <p className="text-muted-foreground">{dict.recruit.no_roles}</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{dict.recruit.form.title}</CardTitle>
              <CardDescription>{dict.recruit.form.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  className="flex flex-col gap-6"
                  onSubmit={form.handleSubmit(handleSubmit)}
                >
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="recruit-role">
                          {dict.recruit.form.role}
                        </Label>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger id="recruit-role">
                              <SelectValue
                                placeholder={dict.recruit.form.role_placeholder}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => {
                              const roleCopy =
                                dict.recruit.roles[
                                  role.id as keyof typeof dict.recruit.roles
                                ];
                              return roleCopy ? (
                                <SelectItem key={role.id} value={role.id}>
                                  {roleCopy.title}
                                </SelectItem>
                              ) : null;
                            })}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="statement"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="recruit-statement">
                          {dict.recruit.form.statement}
                        </Label>
                        <FormControl>
                          <Textarea
                            id="recruit-statement"
                            placeholder={
                              dict.recruit.form.statement_placeholder
                            }
                            rows={6}
                            {...field}
                          />
                        </FormControl>
                        {form.formState.errors.statement && (
                          <p className="text-sm text-destructive">
                            {dict.recruit.form.statement_error}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPreference"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="recruit-contact">
                          {dict.recruit.form.contact}
                        </Label>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger id="recruit-contact">
                              <SelectValue
                                placeholder={
                                  dict.recruit.form.contact_placeholder
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">
                              {dict.recruit.form.contact_email}
                            </SelectItem>
                            <SelectItem value="discord">
                              {dict.recruit.form.contact_discord}
                            </SelectItem>
                            <SelectItem value="either">
                              {dict.recruit.form.contact_either}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="github"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="recruit-github">
                            {dict.recruit.form.github}
                          </Label>
                          <FormControl>
                            <Input id="recruit-github" {...field} />
                          </FormControl>
                          {form.formState.errors.github && (
                            <p className="text-sm text-destructive">
                              {dict.recruit.form.link_error}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="portfolio"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="recruit-portfolio">
                            {dict.recruit.form.portfolio}
                          </Label>
                          <FormControl>
                            <Input id="recruit-portfolio" {...field} />
                          </FormControl>
                          {form.formState.errors.portfolio && (
                            <p className="text-sm text-destructive">
                              {dict.recruit.form.link_error}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="recruit-resume">
                      {dict.recruit.form.resume}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {dict.recruit.form.resume_help}
                    </p>
                    <Input
                      ref={fileInputRef}
                      id="recruit-resume"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) =>
                        handleFileChange(event.target.files?.[0])
                      }
                    />
                    {selectedFile && (
                      <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <span className="min-w-0 truncate">
                          {dict.recruit.form.selected_file}: {selectedFile.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={dict.recruit.form.remove_file}
                          onClick={removeFile}
                        >
                          <X />
                        </Button>
                      </div>
                    )}
                    {fileError && (
                      <p className="text-sm text-destructive">{fileError}</p>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {dict.recruit.form.privacy}{" "}
                    <Link className="underline" to={`/${lang}/privacy-policy`}>
                      {dict.recruit.form.privacy_link}
                    </Link>
                    .
                  </p>

                  {submitError && (
                    <p className="text-sm text-destructive">{submitError}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting || isUploading}
                  >
                    {isUploading
                      ? dict.recruit.form.uploading
                      : form.formState.isSubmitting
                        ? dict.recruit.form.submitting
                        : dict.recruit.form.submit}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </article>
      <Footer />
    </div>
  );
};

export default RecruitmentPage;
