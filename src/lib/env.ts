type EnvReaderOptions = {
  required?: boolean;
  defaultValue?: string;
};

const getEnvVar = (
  key: string,
  { required = false, defaultValue }: EnvReaderOptions = {},
): string => {
  const value = process.env[key] ?? defaultValue ?? "";

  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const spotifyEnv = {
  clientId: () => getEnvVar("SPOTIFY_CLIENT_ID", { required: true }),
  clientSecret: () => getEnvVar("SPOTIFY_CLIENT_SECRET"),
  redirectUri: () => getEnvVar("SPOTIFY_REDIRECT_URI", { required: true }),
};

export const nodeEnv = () => getEnvVar("NODE_ENV", { defaultValue: "development" });

export const isDevelopment = () => nodeEnv() === "development";
