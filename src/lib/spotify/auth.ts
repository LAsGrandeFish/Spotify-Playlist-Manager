import { createHash, randomBytes } from "crypto";

export const PKCE_CODE_VERIFIER_MIN_LENGTH = 43;
export const PKCE_CODE_VERIFIER_MAX_LENGTH = 128;
export const PKCE_DEFAULT_VERIFIER_LENGTH = 96;
export const SPOTIFY_AUTHORIZE_ENDPOINT = "https://accounts.spotify.com/authorize";
export const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

export const SPOTIFY_COOKIE_KEYS = {
  pkceVerifier: "spm_pkce_verifier",
  oauthState: "spm_oauth_state",
  tokens: "spm_tokens",
} as const;

export const DEFAULT_SPOTIFY_SCOPES: string[] = [
  "user-library-read",
  "playlist-read-private",
  "playlist-modify-private",
  "playlist-modify-public",
];

const base64UrlEncode = (buffer: Buffer) =>
  buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const generateCodeVerifier = (length = PKCE_DEFAULT_VERIFIER_LENGTH): string => {
  if (length < PKCE_CODE_VERIFIER_MIN_LENGTH || length > PKCE_CODE_VERIFIER_MAX_LENGTH) {
    throw new Error(
      `PKCE code verifier length must be between ${PKCE_CODE_VERIFIER_MIN_LENGTH} and ${PKCE_CODE_VERIFIER_MAX_LENGTH}. Received ${length}.`,
    );
  }

  return base64UrlEncode(randomBytes(length));
};

export const generateCodeChallenge = (codeVerifier: string): string => {
  if (!codeVerifier) {
    throw new Error("PKCE code verifier is required to create a challenge.");
  }

  const hashedVerifier = createHash("sha256").update(codeVerifier).digest();

  return base64UrlEncode(hashedVerifier);
};

type BuildAuthorizeUrlParams = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scopes?: string[];
  showDialog?: boolean;
};

export const buildSpotifyAuthorizeUrl = ({
  clientId,
  redirectUri,
  codeChallenge,
  state,
  scopes = DEFAULT_SPOTIFY_SCOPES,
  showDialog = false,
}: BuildAuthorizeUrlParams): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
    scope: scopes.join(" "),
    show_dialog: showDialog ? "true" : "false",
  });

  return `${SPOTIFY_AUTHORIZE_ENDPOINT}?${params.toString()}`;
};

export const generateOauthState = (length = 24) => base64UrlEncode(randomBytes(length));
