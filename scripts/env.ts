export const loadEnv = (): void => {
  try {
    process.loadEnvFile();
  } catch {
    // .env is optional; variables may come from the shell
  }
};

export const missingEnv = (names: string[]): string[] => {
  loadEnv();
  return names.filter((name) => !process.env[name]);
};

export const requireEnv = (name: string): string => {
  loadEnv();
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
};

export const instagramEnvNames = (lang: string): { token: string; userId: string } =>
  lang === "ru"
    ? { token: "INSTAGRAM_ACCESS_TOKEN", userId: "INSTAGRAM_USER_ID" }
    : { token: `INSTAGRAM_ACCESS_TOKEN_${lang.toUpperCase()}`, userId: `INSTAGRAM_USER_ID_${lang.toUpperCase()}` };
