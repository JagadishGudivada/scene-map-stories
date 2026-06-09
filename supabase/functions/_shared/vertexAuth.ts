import { GoogleAuth } from "npm:google-auth-library@9";

// GCP service account tokens are valid for 60 min. Cache for 55 min to avoid clock-skew expiry.
let _saToken: string | null = null;
let _saTokenExpiry = 0;

type VertexCredentialDiagnostics = {
  credentialType: string;
  hasAudience: boolean;
  hasCredentialSource: boolean;
  hasSubjectTokenType: boolean;
  hasTokenUrl: boolean;
  hasServiceAccountImpersonationUrl: boolean;
};

type ExternalAccountCredentials = {
  type: "external_account";
  audience: string;
  subject_token_type: string;
  token_url: string;
  service_account_impersonation_url?: string;
};

function getAuthHeaderInfo(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const hasBearer = auth.startsWith("Bearer ");
  const token = hasBearer ? auth.slice(7).trim() : "";
  return {
    hasAuthorizationHeader: auth.length > 0,
    hasBearerPrefix: hasBearer,
    tokenLength: token.length,
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
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    throw new Error("No Supabase bearer token found in Authorization header");
  }
  const token = auth.slice(7).trim();
  if (!token) throw new Error("Supabase bearer token is empty");
  return token;
}

function asExternalAccountCredentials(credentials: Record<string, unknown>): ExternalAccountCredentials {
  if (credentials?.type !== "external_account") {
    throw new Error("credentials.type is not external_account");
  }

  const audience = typeof credentials?.audience === "string" ? credentials.audience : "";
  const subjectTokenType =
    typeof credentials?.subject_token_type === "string" ? credentials.subject_token_type : "";
  const tokenUrl = typeof credentials?.token_url === "string" ? credentials.token_url : "";
  const impersonationUrl =
    typeof credentials?.service_account_impersonation_url === "string"
      ? credentials.service_account_impersonation_url
      : undefined;

  if (!audience || !subjectTokenType || !tokenUrl) {
    throw new Error("external_account credentials missing audience, subject_token_type, or token_url");
  }

  return {
    type: "external_account",
    audience,
    subject_token_type: subjectTokenType,
    token_url: tokenUrl,
    service_account_impersonation_url: impersonationUrl,
  };
}

async function exchangeViaSts(
  credentials: ExternalAccountCredentials,
  subjectToken: string
): Promise<string> {
  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
    subject_token_type: credentials.subject_token_type,
    subject_token: subjectToken,
    audience: credentials.audience,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  });

  const stsRes = await fetch(credentials.token_url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!stsRes.ok) {
    const text = await stsRes.text().catch(() => "");
    throw new Error(`STS token exchange failed: ${stsRes.status} ${text.slice(0, 240)}`);
  }

  const stsJson = await stsRes.json();
  const stsAccessToken = typeof stsJson?.access_token === "string" ? stsJson.access_token : "";
  if (!stsAccessToken) throw new Error("STS token exchange returned no access_token");

  if (!credentials.service_account_impersonation_url) {
    return stsAccessToken;
  }

  const impersonationRes = await fetch(credentials.service_account_impersonation_url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stsAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scope: ["https://www.googleapis.com/auth/cloud-platform"],
    }),
  });

  if (!impersonationRes.ok) {
    const text = await impersonationRes.text().catch(() => "");
    throw new Error(`Service account impersonation failed: ${impersonationRes.status} ${text.slice(0, 240)}`);
  }

  const impersonationJson = await impersonationRes.json();
  const accessToken = typeof impersonationJson?.accessToken === "string" ? impersonationJson.accessToken : "";
  if (!accessToken) throw new Error("Service account impersonation returned no accessToken");
  return accessToken;
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
    if (!diagnostics.hasCredentialSource) {
      console.info(`${logPrefix} Vertex external_account fallback path`, {
        reason: "missing credential_source",
      });
      try {
        const externalCredentials = asExternalAccountCredentials(credentials);
        const subjectToken = getBearerToken(req);
        return await exchangeViaSts(externalCredentials, subjectToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`${logPrefix} Vertex external_account fallback failed`, {
          ...diagnostics,
          ...authHeaderInfo,
          error: message,
        });
        throw err;
      }
    }

    const auth = new GoogleAuth({
      credentials,
      identityPoolTokenProvider: {
        getFederatedToken: async () => {
          const token = getBearerToken(req);
          return token;
        },
      },
    });

    try {
      const client = await auth.getClient();
      const tokenRes = await client.getAccessToken();
      if (tokenRes?.token) return tokenRes.token;
      console.error(`${logPrefix} Vertex external_account token empty`, diagnostics);
      throw new Error("GoogleAuth returned an empty access token");
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