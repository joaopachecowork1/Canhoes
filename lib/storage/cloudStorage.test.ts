import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
const constructed = vi.hoisted(() => [] as unknown[]);

// O cliente S3 é um serviço externo: só se simula a chamada de rede.
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = send;
    constructor(config: unknown) {
      constructed.push(config);
    }
  },
  PutObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
  GetObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: { Bucket: string; Key: string }) {}
  },
}));

import { deleteCloudObject, isCloudStorageConfigured, readCloudUpload, saveCloudUpload } from "./cloudStorage";

const CLOUD_VARIABLES = [
  "R2_BUCKET",
  "S3_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_ACCOUNT_ID",
  "R2_REGION",
  "AWS_REGION",
];

/** Configura o R2 como na Vercel: bucket e chaves. */
function configureR2() {
  vi.stubEnv("R2_BUCKET", "canhoes-test");
  vi.stubEnv("R2_ACCESS_KEY_ID", "key");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
}

beforeEach(() => {
  // Um ambiente sem nada de cloud; cada teste liga o que precisa.
  for (const name of CLOUD_VARIABLES) vi.stubEnv(name, undefined);
  send.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isCloudStorageConfigured", () => {
  it("is off without a bucket and keys, so uploads stay on disk", () => {
    expect(isCloudStorageConfigured()).toBe(false);
  });

  it("is on with an R2 bucket and keys", () => {
    configureR2();
    expect(isCloudStorageConfigured()).toBe(true);
  });

  it("is on with the S3 names for the bucket and the keys", () => {
    vi.stubEnv("S3_BUCKET", "bucket");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "key");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "secret");
    expect(isCloudStorageConfigured()).toBe(true);
  });

  it("stays off when the bucket has no keys", () => {
    vi.stubEnv("R2_BUCKET", "canhoes-test");
    expect(isCloudStorageConfigured()).toBe(false);
  });
});

describe("saveCloudUpload", () => {
  it("stores the bytes under the folders with a random name and answers with the /uploads url", async () => {
    configureR2();
    send.mockResolvedValue({});
    const file = new File(["x"], "foto.png", { type: "image/png" });

    const saved = await saveCloudUpload(file, ["feed", "event-1"], new Uint8Array([1, 2]), ".png");

    const command = send.mock.calls[0]?.[0] as { input: { Bucket: string; Key: string; ContentType: string } };
    expect(command.input).toMatchObject({ Bucket: "canhoes-test", ContentType: "image/png" });
    expect(command.input.Key).toMatch(/^feed\/event-1\/[a-f0-9]{32}\.png$/);
    expect(saved).toEqual({
      url: `/uploads/${command.input.Key}`,
      fileName: "foto.png",
      fileSize: 1,
      contentType: "image/png",
    });
  });

  it("strips from the folder names everything that is not a letter, digit, hyphen or underscore", async () => {
    configureR2();
    send.mockResolvedValue({});

    await saveCloudUpload(
      new File(["x"], "a.png", { type: "image/png" }),
      ["../stories", "ev/ent"],
      new Uint8Array(),
      ".png",
    );

    const command = send.mock.calls[0]?.[0] as { input: { Key: string } };
    expect(command.input.Key).toMatch(/^stories\/event\/[a-f0-9]{32}\.png$/);
  });

  it("refuses to pretend it saved when the cloud storage is not configured", async () => {
    await expect(
      saveCloudUpload(new File(["x"], "a.png", { type: "image/png" }), ["feed"], new Uint8Array(), ".png"),
    ).rejects.toThrow("Cloud storage is not configured");
  });
});

describe("readCloudUpload", () => {
  it("returns the bytes and the content type of the object", async () => {
    configureR2();
    send.mockResolvedValue({
      Body: { transformToByteArray: async () => new Uint8Array([7, 8]) },
      ContentType: "image/webp",
    });

    const { buffer, contentType } = await readCloudUpload("feed/event-1/a.webp");

    expect([...buffer]).toEqual([7, 8]);
    expect(contentType).toBe("image/webp");
  });

  it("falls back to a generic content type when the object has none", async () => {
    configureR2();
    send.mockResolvedValue({ Body: { transformToByteArray: async () => new Uint8Array([1]) } });

    expect((await readCloudUpload("feed/a")).contentType).toBe("application/octet-stream");
  });

  it("fails on an empty body and when the cloud storage is not configured", async () => {
    await expect(readCloudUpload("feed/a")).rejects.toThrow("Cloud storage is not configured");

    configureR2();
    send.mockResolvedValue({});
    await expect(readCloudUpload("feed/a")).rejects.toThrow("Empty file from cloud storage");
  });
});

describe("deleteCloudObject", () => {
  it("deletes the object with that key from the bucket", async () => {
    configureR2();
    send.mockResolvedValue({});

    await deleteCloudObject("stories/event-1/0a1b2c.webp");

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0].input).toEqual({ Bucket: "canhoes-test", Key: "stories/event-1/0a1b2c.webp" });
  });

  it("lets a storage failure reach the caller", async () => {
    configureR2();
    send.mockRejectedValue(new Error("R2 unavailable"));

    await expect(deleteCloudObject("stories/event-1/0a1b2c.webp")).rejects.toThrow("R2 unavailable");
  });

  it("fails when the cloud storage is not configured, instead of pretending it deleted", async () => {
    await expect(deleteCloudObject("stories/event-1/0a1b2c.webp")).rejects.toThrow("Cloud storage is not configured");
  });
});

describe("how the client is set up", () => {
  /** Carrega o módulo de novo, porque o cliente S3 fica guardado depois da primeira vez. */
  async function connect() {
    vi.resetModules();
    constructed.length = 0;
    send.mockResolvedValue({});
    const cloud = await import("./cloudStorage");
    await cloud.deleteCloudObject("feed/a.png");
    return constructed[0] as { region: string; endpoint?: string; credentials: { accessKeyId: string } };
  }

  it("uses the R2 endpoint of the account, and the region 'auto'", async () => {
    configureR2();
    vi.stubEnv("R2_ACCOUNT_ID", "abc123");

    expect(await connect()).toMatchObject({ endpoint: "https://abc123.r2.cloudflarestorage.com", region: "auto" });
  });

  it("prefers an explicit endpoint and region over the ones it would build", async () => {
    configureR2();
    vi.stubEnv("R2_ACCOUNT_ID", "abc123");
    vi.stubEnv("R2_ENDPOINT", "https://storage.example.test");
    vi.stubEnv("R2_REGION", "eu-west");

    expect(await connect()).toMatchObject({ endpoint: "https://storage.example.test", region: "eu-west" });
  });

  it("falls back to the AWS names for the keys and the region", async () => {
    vi.stubEnv("S3_BUCKET", "bucket");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "aws-key");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "aws-secret");
    vi.stubEnv("AWS_REGION", "us-east-1");

    expect(await connect()).toMatchObject({ region: "us-east-1", credentials: { accessKeyId: "aws-key" } });
  });
});
