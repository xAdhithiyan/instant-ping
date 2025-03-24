import {
  ListBucketsCommand,
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import checkMimeType from './mimeType';

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRECT_KEY!,
  },
  region: process.env.BUCKET_REGION!,
});

async function checkConnection() {
  try {
    const command = new ListBucketsCommand({});
    const result = await s3.send(command);
    console.log('Buckets:', result.Buckets);
  } catch (e) {
    console.log(e);
  }
}

async function add(filename: string, body: Buffer) {
  try {
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `uploads/${filename}`,
      Body: body,
      ContentType: checkMimeType(filename)?.mime as string,
    };
    const command = new PutObjectCommand(params);
    await s3.send(command);
  } catch (e) {
    console.log(e);
  }
}

async function getUrl(filename: string) {
  try {
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `uploads/${filename}`,
    };

    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return url;
  } catch (e) {
    console.log(e);
  }
}

export default { checkConnection, add, getUrl };
