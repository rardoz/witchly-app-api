import crypto from 'node:crypto';
import { describe, expect, it } from '@jest/globals';

describe('Asset Upload API Tests', () => {
  // Generate test files
  const generateTestFile = (sizeInBytes: number): Buffer => {
    const buffer = Buffer.alloc(sizeInBytes);
    crypto.randomFillSync(buffer);
    return buffer;
  };

  const smallFile = {
    name: 'test-small.jpg',
    buffer: generateTestFile(500 * 1024), // 500KB
    mimeType: 'image/jpeg',
  };

  const largeFile = {
    name: 'test-large.mp4',
    buffer: generateTestFile(8.5 * 1024 * 1024), // 8.5MB
    mimeType: 'video/mp4',
  };

  describe('Direct Upload API - /api/assets/upload', () => {
    it('should upload small file via direct upload', async () => {
      const response = await global.testRequest
        .post('/api/assets/upload')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .attach('file', smallFile.buffer, {
          filename: smallFile.name,
          contentType: smallFile.mimeType,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.asset).toBeDefined();
      expect(response.body.asset.fileName).toBe(smallFile.name);
    });

    it('should handle missing file in direct upload', async () => {
      const response = await global.testRequest
        .post('/api/assets/upload')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Chunked Upload API - Small File (500KB)', () => {
    let uploadId: string;

    it('should initialize chunked upload for small file', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: `
            mutation InitializeChunkedUpload($input: ChunkUploadInitInput!) {
              initializeChunkedUpload(input: $input) {
                uploadId
                chunkSize
              }
            }
          `,
          variables: {
            input: {
              fileName: smallFile.name,
              mimeType: smallFile.mimeType,
              totalSize: smallFile.buffer.length,
              chunkSize: 5 * 1024 * 1024,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.initializeChunkedUpload).toBeDefined();
      expect(response.body.data.initializeChunkedUpload.uploadId).toBeDefined();
      uploadId = response.body.data.initializeChunkedUpload.uploadId;
    });

    it('should upload small file chunk and track progress', async () => {
      if (!uploadId) {
        throw new Error(
          'Upload ID not available - initialization test may have failed'
        );
      }

      // Check initial progress
      const initialProgressResponse = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: `
            query GetUploadProgress($uploadId: ID!) {
              uploadProgress(uploadId: $uploadId) {
                uploadId
                status
                chunksUploaded
                totalChunks
                progress
              }
            }
          `,
          variables: { uploadId },
        });

      expect(initialProgressResponse.status).toBe(200);
      expect(initialProgressResponse.body.data.uploadProgress).toBeDefined();
      expect(initialProgressResponse.body.data.uploadProgress.status).toBe(
        'initializing'
      );
      expect(
        initialProgressResponse.body.data.uploadProgress.chunksUploaded
      ).toBe(0);
      expect(initialProgressResponse.body.data.uploadProgress.totalChunks).toBe(
        1
      );

      const chunkHash = crypto
        .createHash('sha256')
        .update(smallFile.buffer)
        .digest('hex');

      const response = await global.testRequest
        .post(`/api/assets/chunked/upload/${uploadId}/0`)
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .set('X-Chunk-Hash', chunkHash)
        .set('Content-Type', 'application/octet-stream')
        .send(smallFile.buffer);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Check final progress after upload
      const finalProgressResponse = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: `
            query GetUploadProgress($uploadId: ID!) {
              uploadProgress(uploadId: $uploadId) {
                uploadId
                status
                chunksUploaded
                totalChunks
                progress
              }
            }
          `,
          variables: { uploadId },
        });

      expect(finalProgressResponse.status).toBe(200);
      expect(finalProgressResponse.body.data.uploadProgress).toBeDefined();
      expect(
        finalProgressResponse.body.data.uploadProgress.chunksUploaded
      ).toBe(1);
      expect(finalProgressResponse.body.data.uploadProgress.totalChunks).toBe(
        1
      );
      expect(finalProgressResponse.body.data.uploadProgress.progress).toBe(100);
      expect(finalProgressResponse.body.data.uploadProgress.status).toBe(
        'completed'
      );
    });

    it('should get upload progress', async () => {
      if (!uploadId) return;

      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: `
            query GetUploadProgress($uploadId: ID!) {
              uploadProgress(uploadId: $uploadId) {
                uploadId
                fileName
                totalSize
                uploadedSize
                chunksUploaded
                totalChunks
                progress
                status
                createdAt
                lastUpdated
              }
            }
          `,
          variables: { uploadId },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.uploadProgress).toBeDefined();
    });
  });

  describe('Chunked Upload API - Large File (8.5MB)', () => {
    let uploadId: string;
    const chunkSize = 5 * 1024 * 1024; // 5MB

    it('should initialize chunked upload for large file', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: `
            mutation InitializeChunkedUpload($input: ChunkUploadInitInput!) {
              initializeChunkedUpload(input: $input) {
                uploadId
                chunkSize
              }
            }
          `,
          variables: {
            input: {
              fileName: largeFile.name,
              mimeType: largeFile.mimeType,
              totalSize: largeFile.buffer.length,
              chunkSize: chunkSize,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.initializeChunkedUpload).toBeDefined();
      expect(response.body.data.initializeChunkedUpload.uploadId).toBeDefined();
      uploadId = response.body.data.initializeChunkedUpload.uploadId;
    });

    it('should upload large file in chunks and track progress', async () => {
      if (!uploadId) return;

      const totalChunks = Math.ceil(largeFile.buffer.length / chunkSize);

      // Check initial progress
      const initialProgressResponse = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: `
            query GetUploadProgress($uploadId: ID!) {
              uploadProgress(uploadId: $uploadId) {
                uploadId
                status
                chunksUploaded
                totalChunks
              }
            }
          `,
          variables: { uploadId },
        });

      expect(initialProgressResponse.status).toBe(200);
      expect(initialProgressResponse.body.data.uploadProgress).toBeDefined();
      expect(initialProgressResponse.body.data.uploadProgress.status).toBe(
        'initializing'
      );
      expect(
        initialProgressResponse.body.data.uploadProgress.chunksUploaded
      ).toBe(0);
      expect(initialProgressResponse.body.data.uploadProgress.totalChunks).toBe(
        totalChunks
      );

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, largeFile.buffer.length);
        const chunk = largeFile.buffer.subarray(start, end);

        const chunkHash = crypto
          .createHash('sha256')
          .update(chunk)
          .digest('hex');

        const response = await global.testRequest
          .post(`/api/assets/chunked/upload/${uploadId}/${i}`)
          .set('Authorization', `Bearer ${global.adminAccessToken}`)
          .set('X-Session-Token', global.adminSessionToken)
          .set('User-Agent', 'node-superagent/3.8.3')
          .set('X-Chunk-Hash', chunkHash)
          .set('Content-Type', 'application/octet-stream')
          .send(chunk);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Check progress after each chunk upload
        const progressResponse = await global.testRequest
          .post('/graphql')
          .set('Authorization', `Bearer ${global.adminAccessToken}`)
          .set('X-Session-Token', global.adminSessionToken)
          .set('User-Agent', 'node-superagent/3.8.3')
          .send({
            query: `
              query GetUploadProgress($uploadId: ID!) {
                uploadProgress(uploadId: $uploadId) {
                  uploadId
                  status
                  chunksUploaded
                  totalChunks
                  progress
                }
              }
            `,
            variables: { uploadId },
          });

        expect(progressResponse.status).toBe(200);
        expect(progressResponse.body.data.uploadProgress).toBeDefined();
        expect(progressResponse.body.data.uploadProgress.chunksUploaded).toBe(
          i + 1
        );
        expect(progressResponse.body.data.uploadProgress.totalChunks).toBe(
          totalChunks
        );

        const expectedProgress = Math.round(((i + 1) / totalChunks) * 100);
        expect(progressResponse.body.data.uploadProgress.progress).toBe(
          expectedProgress
        );

        // Status should be 'uploading' until the last chunk, then 'completed'
        if (i === totalChunks - 1) {
          expect(progressResponse.body.data.uploadProgress.status).toBe(
            'completed'
          );
          expect(progressResponse.body.data.uploadProgress.progress).toBe(100);
        } else {
          expect(progressResponse.body.data.uploadProgress.status).toBe(
            'uploading'
          );
        }
      }
    });

    it('should handle upload cancellation', async () => {
      // Initialize a new upload for cancellation
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: `
            mutation InitializeChunkedUpload($input: ChunkUploadInitInput!) {
              initializeChunkedUpload(input: $input) {
                uploadId
                chunkSize
              }
            }
          `,
          variables: {
            input: {
              fileName: 'cancel-test.mp4',
              mimeType: 'video/mp4',
              totalSize: largeFile.buffer.length,
              chunkSize: chunkSize,
            },
          },
        });

      const cancelUploadId =
        response.body.data.initializeChunkedUpload.uploadId;

      if (cancelUploadId) {
        const cancelResponse = await global.testRequest
          .post('/graphql')
          .set('Authorization', `Bearer ${global.adminAccessToken}`)
          .set('X-Session-Token', global.adminSessionToken)
          .set('User-Agent', 'node-superagent/3.8.3')
          .send({
            query: `
              mutation CancelUpload($input: CancelUploadInput!) {
                cancelUpload(input: $input) {
                  success
                  message
                }
              }
            `,
            variables: {
              input: {
                uploadId: cancelUploadId,
              },
            },
          });

        expect(cancelResponse.status).toBe(200);
        expect(cancelResponse.body.data.cancelUpload.success).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should reject requests without authentication', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: `
            mutation InitializeChunkedUpload($input: ChunkUploadInitInput!) {
              initializeChunkedUpload(input: $input) {
                uploadId
                chunkSize
              }
            }
          `,
          variables: {
            input: {
              fileName: 'test.jpg',
              mimeType: 'image/jpeg',
              totalSize: 1000,
            },
          },
        });

      // GraphQL returns 401 for authentication errors
      expect(response.status).toBe(401);
    });

    it('should handle invalid upload ID in progress check', async () => {
      const response = await global.testRequest
        .post('/graphql')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          query: `
            query GetUploadProgress($uploadId: ID!) {
              uploadProgress(uploadId: $uploadId) {
                uploadId
                fileName
                progress
              }
            }
          `,
          variables: { uploadId: 'invalid-id' },
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Upload session not found'
      );
    });

    it('should validate chunk hash', async () => {
      const initResponse = await global.testRequest
        .post('/api/assets/chunked/init')
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .send({
          fileName: 'hash-test.jpg',
          mimeType: 'image/jpeg',
          totalSize: 1024,
          chunkSize: 5 * 1024 * 1024,
          totalChunks: 1,
        });

      const uploadId = initResponse.body.uploadId;

      const testData = Buffer.from('test data');

      const response = await global.testRequest
        .post(`/api/assets/chunked/upload/${uploadId}/0`)
        .set('Authorization', `Bearer ${global.adminAccessToken}`)
        .set('X-Session-Token', global.adminSessionToken)
        .set('User-Agent', 'node-superagent/3.8.3')
        .set('X-Chunk-Hash', 'invalid-hash')
        .set('Content-Type', 'application/octet-stream')
        .send(testData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
