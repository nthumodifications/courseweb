declare const app: import("hono/hono-base").HonoBase<{}, {
    "*": {};
} & {
    "/.well-known/openid-configuration": {
        $get: {
            input: {};
            output: {
                issuer: string;
                authorization_endpoint: string;
                token_endpoint: string;
                userinfo_endpoint: string;
                jwks_uri: string;
                response_types_supported: string[];
                grant_types_supported: string[];
                subject_types_supported: string[];
                id_token_signing_alg_values_supported: string[];
                end_session_endpoint: string;
                scopes_supported: string[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/.well-known/jwks.json": {
        $get: {
            input: {};
            output: {
                keys: {
                    crv?: string | undefined;
                    d?: string | undefined;
                    dp?: string | undefined;
                    dq?: string | undefined;
                    e?: string | undefined;
                    k?: string | undefined;
                    n?: string | undefined;
                    p?: string | undefined;
                    q?: string | undefined;
                    qi?: string | undefined;
                    x?: string | undefined;
                    y?: string | undefined;
                    kty?: string | undefined;
                    alg?: string | undefined;
                    key_ops?: string[] | undefined;
                    ext?: boolean | undefined;
                    use?: string | undefined;
                    x5c?: string[] | undefined;
                    x5t?: string | undefined;
                    'x5t#S256'?: string | undefined;
                    x5u?: string | undefined;
                    kid?: string | undefined;
                }[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/output.css": {
        $get: {
            input: {};
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
        } | {
            input: {};
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
        };
    };
} & {
    "/authorize": {
        $get: {
            input: {
                query: {
                    client_id: string | string[];
                    redirect_uri: string | string[];
                    scope: string | string[];
                    state: string | string[];
                    response_type: string | string[];
                    prompt?: string | string[] | undefined;
                    nonce?: string | string[] | undefined;
                    code_challenge?: string | string[] | undefined;
                    code_challenge_method?: string | string[] | undefined;
                    ui_locales?: string | string[] | undefined;
                    acceptTos?: string | string[] | undefined;
                };
            };
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
        } | {
            input: {
                query: {
                    client_id: string | string[];
                    redirect_uri: string | string[];
                    scope: string | string[];
                    state: string | string[];
                    response_type: string | string[];
                    prompt?: string | string[] | undefined;
                    nonce?: string | string[] | undefined;
                    code_challenge?: string | string[] | undefined;
                    code_challenge_method?: string | string[] | undefined;
                    ui_locales?: string | string[] | undefined;
                    acceptTos?: string | string[] | undefined;
                };
            };
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
        };
    };
} & {
    "/oauth/nthu": {
        $get: {
            input: {
                query: {
                    state: string;
                    code: string;
                };
            };
            output: undefined;
            outputFormat: "redirect";
            status: 302;
        } | {
            input: {
                query: {
                    state: string;
                    code: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 400;
        };
    };
} & {
    "/token": {
        $post: {
            input: {
                form: {
                    client_id: string;
                    redirect_uri: string;
                    grant_type: "authorization_code";
                    code?: string | undefined;
                    code_verifier?: string | undefined;
                } | {
                    grant_type: "refresh_token";
                    refresh_token: string;
                    scope?: string | undefined;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                form: {
                    client_id: string;
                    redirect_uri: string;
                    grant_type: "authorization_code";
                    code?: string | undefined;
                    code_verifier?: string | undefined;
                } | {
                    grant_type: "refresh_token";
                    refresh_token: string;
                    scope?: string | undefined;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 500;
        } | {
            input: {
                form: {
                    client_id: string;
                    redirect_uri: string;
                    grant_type: "authorization_code";
                    code?: string | undefined;
                    code_verifier?: string | undefined;
                } | {
                    grant_type: "refresh_token";
                    refresh_token: string;
                    scope?: string | undefined;
                };
            };
            output: {
                id_token: string;
                token_type: string;
                expires_in: number;
                refresh_token?: `${string}-${string}-${string}-${string}-${string}` | undefined;
                access_token: `${string}-${string}-${string}-${string}-${string}`;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                form: {
                    client_id: string;
                    redirect_uri: string;
                    grant_type: "authorization_code";
                    code?: string | undefined;
                    code_verifier?: string | undefined;
                } | {
                    grant_type: "refresh_token";
                    refresh_token: string;
                    scope?: string | undefined;
                };
            };
            output: {
                access_token: `${string}-${string}-${string}-${string}-${string}`;
                refresh_token: `${string}-${string}-${string}-${string}-${string}`;
                token_type: string;
                expires_in: number;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                form: {
                    client_id: string;
                    redirect_uri: string;
                    grant_type: "authorization_code";
                    code?: string | undefined;
                    code_verifier?: string | undefined;
                } | {
                    grant_type: "refresh_token";
                    refresh_token: string;
                    scope?: string | undefined;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        };
    };
} & {
    "/userinfo": {
        $get: {
            input: {};
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {};
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 500;
        } | {
            input: {};
            output: {
                email?: string | undefined;
                name?: string | undefined;
                name_en?: string | undefined;
                inschool?: boolean | undefined;
                sub: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/logout": {
        $get: {
            input: {
                query: {
                    id_token_hint: string;
                    post_logout_redirect_uri: string;
                    client_id?: string | undefined;
                    state?: string | undefined;
                    logout_hint?: string | undefined;
                };
            };
            output: undefined;
            outputFormat: "redirect";
            status: 302;
        } | {
            input: {
                query: {
                    id_token_hint: string;
                    post_logout_redirect_uri: string;
                    client_id?: string | undefined;
                    state?: string | undefined;
                    logout_hint?: string | undefined;
                };
            };
            output: {
                error: string;
                error_description: string;
            };
            outputFormat: "json";
            status: 400;
        };
    };
} & {
    "/revoke": {
        $post: {
            input: {
                form: {
                    client_id: string;
                    token: string;
                    token_type_hint?: "access_token" | "refresh_token" | undefined;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                form: {
                    client_id: string;
                    token: string;
                    token_type_hint?: "access_token" | "refresh_token" | undefined;
                };
            };
            output: {};
            outputFormat: "json";
            status: 200;
        };
    };
}, "/">;
export default app;
