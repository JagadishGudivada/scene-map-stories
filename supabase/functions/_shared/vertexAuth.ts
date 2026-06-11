import {
  ExternalAccountClient,
  GoogleAuth,
  type ExternalAccountClientOptions,
} from "npm:google-auth-library@9";

// GCP service account tokens are valid for 60 min. Cache for 55 min to avoid clock-skew expiry.
let _saToken: string | null = null;
let _saTokenExpiry = 0;

// External-account tokens are per-user: keyed by the Supabase JWT used as the subject token.
const _extTokenCache = new Map<string, { token: string; expiry: number }>();

type VertexCredentialDiagnostics = {
  credentialType: string;
  hasAudience: boolean;
  hasCredentialSource: boolean;
  hasSubjectTokenType: boolean;
  hasTokenUrl: boolean;
  hasServiceAccountImpersonationUrl: boolean;
};

function parseBearerToken(req: Request): string {
  const auth = req.headers.get("Authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

function getAuthHeaderInfo(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  return {
    hasAuthorizationHeader: auth.length > 0,
    hasBearerPrefix: auth.startsWith("Bearer "),
    tokenLength: parseBearerToken(req).length,
  };
}

function getCredentialDiagnostics(credentials: Record<string, unknown>): VertexCredentialDiagnostics {
  return {
    credentialType: typeof credentials?.type === "string" ? String(credentials.type) : "unknown",
    hasAudience: typeof credentials?.audience === "string" && credentials.audience.length > 0,
    hasCredentialSource:
      Boolean(credentials?.credential_source) && typeof credentials.credential_source === "object",
    hasSubjectTokenType:
      typeof credentials?.subject_token_type === "string" && credentials.subject_token_type.length > 0,
    hasTokenUrl: typeof credentials?.token_url === "string" && credentials.token_url.length > 0,
    hasServiceAccountImpersonationUrl:
      typeof credentials?.service_account_impersonation_url === "string" &&
      credentials.service_account_impersonation_url.length > 0,
  };
}

function getBearerToken(req: Request): string {
  const token = parseBearerToken(req);
  if (!token) throw new Error("No Supabase bearer token found in Authorization header");
  return token;
}

export async function getVertexAccessToken(req: Request, logPrefix = "vertex-auth"): Promise<string> {
  const credentialsJson = Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS_JSON");
  if (!credentialsJson) {
    console.error(`${logPrefix} Vertex auth config missing`, {
      hasCredentialsJson: false,
    });
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON not configured");
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch {
    console.error(`${logPrefix} Vertex auth config parse error`, {
      credentialsJsonLength: credentialsJson.length,
    });
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON");
  }

  const diagnostics = getCredentialDiagnostics(credentials);
  const authHeaderInfo = getAuthHeaderInfo(req);

  console.info(`${logPrefix} Vertex auth bootstrap`, {
    ...diagnostics,
    ...authHeaderInfo,
  });

  if (credentials?.type === "external_account") {
    const subjectToken = getBearerToken(req);

    const now = Date.now();
    const cached = _extTokenCache.get(subjectToken);
    if (cached && now < cached.expiry) {
      console.info(`${logPrefix} using cached external_account token`);
      return cached.token;
    }

    // credential_source (a file/URL reference from the credential JSON) is unusable in
    // edge functions and mutually exclusive with subject_token_supplier — drop it and
    // exchange the per-request Supabase JWT instead.
    const { credential_source: _credentialSource, ...externalOptions } = credentials;
    const client = ExternalAccountClient.fromJSON({
      ...externalOptions,
      subject_token_supplier: {
        getSubjectToken: async () => subjectToken,
      },
    } as unknown as ExternalAccountClientOptions);
    if (!client) {
      console.error(`${logPrefix} Vertex external_account client init failed`, diagnostics);
      throw new Error("Could not create an external account client from credentials");
    }
    client.scopes = ["https://www.googleapis.com/auth/cloud-platform"];

    try {
      const tokenRes = await client.getAccessToken();
      if (!tokenRes?.token) {
        console.error(`${logPrefix} Vertex external_account token empty`, diagnostics);
        throw new Error("GoogleAuth returned an empty access token");
      }
      for (const [key, value] of _extTokenCache) {
        if (value.expiry <= now) _extTokenCache.delete(key);
      }
      const expiryDate = client.credentials?.expiry_date;
      _extTokenCache.set(subjectToken, {
        token: tokenRes.token,
        expiry:
          typeof expiryDate === "number" ? expiryDate - 5 * 60 * 1000 : now + 55 * 60 * 1000,
      });
      return tokenRes.token;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${logPrefix} Vertex external_account token exchange failed`, {
        ...diagnostics,
        ...authHeaderInfo,
        error: message,
      });
      throw err;
    }
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  try {
    const now = Date.now();
    if (_saToken && now < _saTokenExpiry) {
      console.info(`${logPrefix} using cached service account token`);
      return _saToken;
    }
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    if (!tokenRes?.token) {
      console.error(`${logPrefix} Vertex service_account token empty`, diagnostics);
      throw new Error("GoogleAuth returned an empty access token");
    }
    _saToken = tokenRes.token;
    _saTokenExpiry = now + 55 * 60 * 1000;
    return tokenRes.token;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} Vertex service_account token exchange failed`, {
      ...diagnostics,
      error: message,
    });
    throw err;
  }
}