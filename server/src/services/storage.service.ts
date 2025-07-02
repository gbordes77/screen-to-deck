import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from 'crypto';
import sharp from 'sharp';

// ==============================================
// CLOUDFLARE R2 STORAGE SERVICE
// ==============================================

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  hash: string;
}

export interface UploadOptions {
  optimize?: boolean;
  maxWidth?: number;
  quality?: number;
  contentType?: string;
}

class StorageService {
  private client: S3Client;
  private bucketName: string;
  private customDomain?: string;
  private cdnDomain?: string;

  constructor() {
    const accountId = process.env.CF_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing Cloudflare R2 configuration');
    }

    this.bucketName = process.env.R2_BUCKET_NAME || 'screen-to-deck';
    this.customDomain = process.env.R2_CUSTOM_DOMAIN;
    this.cdnDomain = process.env.CF_CDN_DOMAIN;

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  // ==============================================
  // IMAGE UPLOAD
  // ==============================================

  async uploadImage(
    file: Buffer,
    orgId: string,
    scanId: string,
    originalName: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    let processedFile = file;
    let contentType = options.contentType || this.getContentType(originalName);

    // Optimize image if requested
    if (options.optimize) {
      processedFile = await this.optimizeImage(file, {
        maxWidth: options.maxWidth || 2048,
        quality: options.quality || 85,
      });
      contentType = 'image/jpeg'; // Sharp outputs JPEG by default
    }

    // Generate unique key
    const timestamp = Date.now();
    const hash = this.generateHash(processedFile);
    const extension = this.getExtension(originalName);
    const key = `orgs/${orgId}/scans/${scanId}/${timestamp}-${hash.substring(0, 8)}.${extension}`;
    
    // Upload to R2
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: processedFile,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000", // 1 year
      Metadata: {
        'original-name': originalName,
        'org-id': orgId,
        'scan-id': scanId,
        'uploaded-at': new Date().toISOString(),
      },
    }));

    const url = this.getPublicUrl(key);

    return {
      url,
      key,
      size: processedFile.length,
      hash,
    };
  }

  // ==============================================
  // SIGNED UPLOAD URLS
  // ==============================================

  async getSignedUploadUrl(
    orgId: string,
    scanId: string,
    filename: string,
    contentType?: string
  ): Promise<{
    uploadUrl: string;
    key: string;
    publicUrl: string;
  }> {
    const timestamp = Date.now();
    const extension = this.getExtension(filename);
    const key = `orgs/${orgId}/scans/${scanId}/${timestamp}-${filename}`;
    
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType || this.getContentType(filename),
        CacheControl: "public, max-age=31536000",
        Metadata: {
          'original-name': filename,
          'org-id': orgId,
          'scan-id': scanId,
        },
      }),
      { expiresIn: 3600 } // 1 hour
    );

    return {
      uploadUrl,
      key,
      publicUrl: this.getPublicUrl(key),
    };
  }

  // ==============================================
  // IMAGE OPTIMIZATION
  // ==============================================

  private async optimizeImage(
    buffer: Buffer,
    options: { maxWidth: number; quality: number }
  ): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(options.maxWidth, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .jpeg({
          quality: options.quality,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();
    } catch (error) {
      console.error('Image optimization failed:', error);
      return buffer; // Return original if optimization fails
    }
  }

  // ==============================================
  // FILE MANAGEMENT
  // ==============================================

  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  async getFileInfo(key: string): Promise<{
    exists: boolean;
    size?: number;
    lastModified?: Date;
    contentType?: string;
  }> {
    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));

      return {
        exists: true,
        size: response.ContentLength,
        lastModified: response.LastModified,
        contentType: response.ContentType,
      };
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return { exists: false };
      }
      throw error;
    }
  }

  // ==============================================
  // BULK OPERATIONS
  // ==============================================

  async cleanupOldFiles(orgId: string, olderThanDays = 90): Promise<number> {
    // This would require listing objects and filtering by date
    // Implementation depends on your cleanup policy
    console.log(`Cleanup requested for org ${orgId}, files older than ${olderThanDays} days`);
    return 0; // Return count of deleted files
  }

  async getStorageUsage(orgId: string): Promise<{
    totalFiles: number;
    totalBytes: number;
    filesByType: Record<string, number>;
  }> {
    // This would require listing all objects for the org
    // Implementation depends on your storage analytics needs
    return {
      totalFiles: 0,
      totalBytes: 0,
      filesByType: {},
    };
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  private getPublicUrl(key: string): string {
    if (this.cdnDomain) {
      return `https://${this.cdnDomain}/${key}`;
    }
    
    if (this.customDomain) {
      return `https://${this.customDomain}/${key}`;
    }
    
    return `https://${this.bucketName}.${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
  }

  private getContentType(filename: string): string {
    const ext = this.getExtension(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'json': 'application/json',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private getExtension(filename: string): string {
    return filename.split('.').pop() || 'bin';
  }

  private generateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  // ==============================================
  // HEALTH CHECK
  // ==============================================

  async healthCheck(): Promise<boolean> {
    try {
      // Try to upload a small test file
      const testKey = `health-check/${Date.now()}.txt`;
      const testContent = Buffer.from('health-check');
      
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain',
      }));

      // Clean up test file
      await this.deleteFile(testKey);
      
      return true;
    } catch (error) {
      console.error('Storage health check failed:', error);
      return false;
    }
  }
}

// ==============================================
// SINGLETON EXPORT
// ==============================================

export const storageService = new StorageService();
export default storageService; 