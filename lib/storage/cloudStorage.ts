import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

function getCloudEndpoint(accountId?: string) {
  if (process.env.R2_ENDPOINT) return process.env.R2_ENDPOINT;
  return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined;
}

function getCloudCredentials() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  return { accessKeyId, secretAccessKey };
}

function getCloudConfig() {
  const bucket = process.env.R2_BUCKET ?? process.env.S3_BUCKET;
  const creds = getCloudCredentials();
  if (!bucket || !creds) return null;

  return {
    bucket,
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    endpoint: getCloudEndpoint(process.env.R2_ACCOUNT_ID),
    region: process.env.R2_REGION ?? process.env.AWS_REGION ?? "auto",
  };
}

let cachedClient: S3Client | null = null;

function getS3Client() {
  if (cachedClient) return cachedClient;
  const config = getCloudConfig();
  if (!config) return null;

  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return cachedClient;
}

/** Indica se o armazenamento na cloud (Cloudflare R2 / AWS S3) está configurado via variáveis de ambiente. */
export function isCloudStorageConfigured(): boolean {
  return Boolean(getCloudConfig());
}

/** Guarda um ficheiro no bucket R2/S3 e devolve os metadados. */
export async function saveCloudUpload(file: File, folders: string[], content: Uint8Array, extension: string) {
  const config = getCloudConfig();
  const client = getS3Client();
  if (!config || !client) throw new Error("Cloud storage is not configured.");

  const fileName = `${crypto.randomUUID().replaceAll("-", "")}${extension}`;
  const cleanFolders = folders.map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ""));
  const key = [...cleanFolders, fileName].join("/");

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: content,
      ContentType: file.type,
    }),
  );

  return {
    url: `/uploads/${key}`,
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
  };
}

/** Lê um ficheiro do bucket R2/S3. */
export async function readCloudUpload(key: string) {
  const config = getCloudConfig();
  const client = getS3Client();
  if (!config || !client) throw new Error("Cloud storage is not configured.");

  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );

  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty file from cloud storage.");

  return {
    buffer: Buffer.from(bytes),
    contentType: response.ContentType ?? "application/octet-stream",
  };
}

/** Apaga um ficheiro do bucket R2/S3 e deixa subir qualquer falha (apagar uma chave que não existe não falha). */
export async function deleteCloudObject(key: string) {
  const config = getCloudConfig();
  const client = getS3Client();
  if (!config || !client) throw new Error("Cloud storage is not configured.");

  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
