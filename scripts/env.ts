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
