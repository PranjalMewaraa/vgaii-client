import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 is S3-compatible. Region is required by the SDK but ignored by R2 —
// "auto" matches what the R2 dashboard generates in code samples.
const R2_REGION = "auto";

const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

let cachedClient: S3Client | null = null;

const env = (key: string): string => {
  const v = process.env[key];
  if (!v) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
};

const getEndpoint = () =>
  `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;

const getBucket = () => env("R2_BUCKET_NAME");

export const getMaxUploadBytes = (): number => {
  const raw = process.env.R2_MAX_UPLOAD_BYTES;
  if (!raw) return DEFAULT_MAX_UPLOAD_BYTES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_UPLOAD_BYTES;
};

const getR2Client = (): S3Client => {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: R2_REGION,
    endpoint: getEndpoint(),
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
    // Required for R2: forces virtual-hosted style routing off in favor
    // of path-style, which R2 expects.
    forcePathStyle: true,
  });
  return cachedClient;
};

export const signPutUrl = async (
  key: string,
  contentType: string,
  expiresInSec = 15 * 60,
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn: expiresInSec });
};

export const signGetUrl = async (
  key: string,
  expiresInSec = 10 * 60,
  filename?: string,
): Promise<string> => {
  // Cloudflare R2 honors ResponseContentDisposition on signed URLs, so we
  // can override the filename the browser sees regardless of how the
  // object was stored.
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ResponseContentDisposition: filename
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : undefined,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn: expiresInSec });
};

// Returns the object metadata (size etc) when the upload completed, or
// null when the object is still missing. Used by the confirm endpoint to
// decide whether to mark the row `confirmed: true`.
export const headObject = async (
  key: string,
): Promise<{ size: number; contentType?: string } | null> => {
  try {
    const res = await getR2Client().send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    return {
      size: res.ContentLength ?? 0,
      contentType: res.ContentType,
    };
  } catch (err: unknown) {
    // 404 / NotFound = upload didn't complete. Anything else is unexpected.
    if (
      typeof err === "object" &&
      err !== null &&
      "name" in err &&
      ((err as { name: string }).name === "NotFound" ||
        (err as { name: string }).name === "NoSuchKey")
    ) {
      return null;
    }
    throw err;
  }
};

export const deleteObject = async (key: string): Promise<void> => {
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
};
