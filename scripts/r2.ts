import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { missingEnv, requireEnv } from "./env";

const R2_ENV = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];

export const r2Configured = (): boolean => missingEnv(R2_ENV).length === 0;

const client = (): S3Client =>
  new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: requireEnv("R2_ACCESS_KEY_ID"), secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY") },
  });

const bucket = (): string => requireEnv("R2_BUCKET");

export const putFile = async (key: string, file: string, contentType: string): Promise<void> => {
  await client().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: readFileSync(file), ContentType: contentType }));
};

export const putText = async (key: string, body: string, contentType = "application/json"): Promise<void> => {
  await client().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));
};

export const getText = async (key: string): Promise<string | undefined> => {
  try {
    const response = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return await response.Body?.transformToString();
  } catch (error) {
    if (error instanceof Error && (error.name === "NoSuchKey" || error.name === "NotFound")) return undefined;
    throw error;
  }
};

export const getFile = async (key: string, file: string): Promise<boolean> => {
  try {
    const response = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) return false;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    return true;
  } catch (error) {
    if (error instanceof Error && (error.name === "NoSuchKey" || error.name === "NotFound")) return false;
    throw error;
  }
};

export const exists = async (key: string): Promise<boolean> => {
  try {
    await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
};

export const queueKey = (lang: string): string => `queue/${lang}.json`;
export const readyVideoKey = (slug: string, lang: string): string => `ready/${slug}.${lang}.mp4`;
export const readyCoverKey = (slug: string, lang: string): string => `ready/${slug}.${lang}.cover.jpg`;
export const reviewKey = (slug: string, lang: string, name: string): string => `review/${lang}/${slug}/${name}`;
