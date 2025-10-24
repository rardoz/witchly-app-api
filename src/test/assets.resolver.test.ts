import { beforeAll, describe, expect, it } from '@jest/globals';
import { Asset } from '../models/Asset';
import { initializeChunkedUpload } from '../services/upload.service';

describe('AssetResolver GraphQL Tests', () => {
  let testAssetId: string;

  beforeAll(async () => {
    // Create test asset
    const asset = new Asset({
      fileName: 'test-asset.jpg',
      hashedFileName: 'hashed-test-asset.jpg',
      mimeType: 'image/jpeg',
      fileSize: 102400, // 100KB
      s3Key: 'test/assets/images/hashed-test-asset.jpg',
      s3Url:
        'https://bucket.s3.amazonaws.com/test/assets/images/hashed-test-asset.jpg',
      assetType: 'image',
      uploadedBy: global.adminUserId,
    });
    await asset.save();
    testAssetId = asset.id;
  });

  describe('Asset Queries', () => {
    it('should get assets list', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query {
              assets(limit: 10, offset: 0) {
                assets {
                  id
                  fileName
                  hashedFileName
                  mimeType
                  fileSize
                  s3Key
                  s3Url
                  assetType
                  uploadedBy
                  createdAt
                  updatedAt
                }
                total
                limit
                offset
              }
            }
          `,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.assets).toBeDefined();
      expect(response.body.data.assets.assets).toBeDefined();
      expect(Array.isArray(response.body.data.assets.assets)).toBe(true);
      expect(response.body.data.assets.total).toBeDefined();
      expect(response.body.data.assets.limit).toBe(10);
      expect(response.body.data.assets.offset).toBe(0);
    });

    it('should get asset by ID', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query GetAsset($id: ID!) {
              asset(id: $id) {
                id
                fileName
                mimeType
                fileSize
                assetType
                s3Url
                uploadedBy
                createdAt
                updatedAt
              }
            }
          `,
        variables: {
          id: testAssetId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.asset).toBeDefined();
      expect(response.body.data.asset.id).toBe(testAssetId);
      expect(response.body.data.asset.fileName).toBe('test-asset.jpg');
      expect(response.body.data.asset.assetType).toBe('image');
    });

    it('should filter assets by type', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query {
              assets(limit: 10, offset: 0, assetType: image) {
                assets {
                  id
                  fileName
                  assetType
                }
                total
                limit
                offset
              }
            }
          `,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.assets).toBeDefined();
      expect(response.body.data.assets.assets).toBeDefined();
      // All returned assets should be images

      response.body.data.assets.assets.forEach(
        (asset: { assetType: string }) => {
          expect(asset.assetType).toBe('image');
        }
      );
    });

    it('should get assets by user', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query GetMyAssets($limit: Int, $offset: Int) {
              myAssets(limit: $limit, offset: $offset) {
                assets {
                  id
                  fileName
                  uploadedBy
                  assetType
                }
                total
                limit
                offset
              }
            }
          `,
        variables: {
          limit: 10,
          offset: 0,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.myAssets).toBeDefined();
      expect(response.body.data.myAssets.assets).toBeDefined();
      // All returned assets should belong to the test user

      response.body.data.myAssets.assets.forEach(
        (asset: { uploadedBy: string }) => {
          expect(asset.uploadedBy).toBe(global.adminUserId);
        }
      );
    });

    it('should handle pagination', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query {
              assets(limit: 5, offset: 0) {
                assets {
                  id
                  fileName
                }
                total
                limit
                offset
              }
            }
          `,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.assets).toBeDefined();
      expect(response.body.data.assets.assets).toBeDefined();
      expect(response.body.data.assets.assets.length).toBeLessThanOrEqual(5);
      expect(response.body.data.assets.limit).toBe(5);
      expect(response.body.data.assets.offset).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle asset not found', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format

      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query GetAsset($id: ID!) {
              asset(id: $id) {
                id
                fileName
              }
            }
          `,
        variables: {
          id: fakeId,
        },
      });

      expect(response.status).toBe(404);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Asset not found');
    });

    it('should handle invalid asset ID format', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query GetAsset($id: ID!) {
              asset(id: $id) {
                id
                fileName
              }
            }
          `,
        variables: {
          id: 'invalid-id',
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Invalid asset ID format'
      );
    });

    it('should reject queries without authentication', async () => {
      const response = await testRequest.post('/graphql').send({
        query: `
            query {
                assets(limit: 5, offset: 0) {
                    assets {
                    id
                    fileName
                    }
                    total
                    limit
                    offset
              }
            }
          `,
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHORIZED');
    });

    it('should validate pagination limits', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query {
              assets(limit: 1000) {
                assets {
                  id
                  fileName
                }
                total
                limit
                offset
              }
            }
          `,
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Limit must be between 1 and 100'
      );
    });
  });

  describe('Upload Progress', () => {
    it('should get upload progress', async () => {
      // Create a real upload session for testing
      const totalSize = 1024 * 1024; // 1MB file
      const chunkSize = 1024 * 256; // 256KB chunks
      const totalChunks = Math.ceil(totalSize / chunkSize); // Calculate total chunks

      const initData = {
        fileName: 'test-progress-file.jpg',
        totalSize,
        chunkSize,
        totalChunks,
        mimeType: 'image/jpeg',
      };

      // Initialize upload session
      const uploadResult = await initializeChunkedUpload(
        initData,
        global.adminUserId
      );

      const response = await global.adminUserAdminAppTestRequest().send({
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
        variables: {
          uploadId: uploadResult.uploadId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.uploadProgress).toBeDefined();
      expect(response.body.data.uploadProgress.uploadId).toBe(
        uploadResult.uploadId
      );
      expect(response.body.data.uploadProgress.fileName).toBe(
        'test-progress-file.jpg'
      );
      expect(response.body.data.uploadProgress.totalSize).toBe(1024 * 1024);
      expect(response.body.data.uploadProgress.progress).toBe(0); // No chunks uploaded yet
      expect(response.body.data.uploadProgress.status).toBe('initializing');
    });

    it('should handle invalid upload ID', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query GetUploadProgress($uploadId: ID!) {
              uploadProgress(uploadId: $uploadId) {
                uploadId
                fileName
                progress
              }
            }
          `,
        variables: {
          uploadId: '',
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid upload ID');
    });

    it('should handle upload session not found', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
            query GetUploadProgress($uploadId: ID!) {
              uploadProgress(uploadId: $uploadId) {
                uploadId
                fileName
                progress
              }
            }
          `,
        variables: {
          uploadId: 'non-existent-upload-id',
        },
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Upload session not found'
      );
    });
  });

  describe('Optional SignedUrl Tests', () => {
    it('should not include signedUrl by default in assets query', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
          query {
            assets(limit: 1) {
              assets {
                id
                fileName
                s3Url
                signedUrl
              }
            }
          }
        `,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.assets.assets).toBeDefined();
      if (response.body.data.assets.assets.length > 0) {
        const asset = response.body.data.assets.assets[0];
        expect(asset.signedUrl).toBeNull();
      }
    });

    it('should include signedUrl when explicitly requested in assets query', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
          query {
            assets(limit: 1, signedUrl: true) {
              assets {
                id
                fileName
                s3Url
                signedUrl
              }
            }
          }
        `,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.assets.assets).toBeDefined();
      if (response.body.data.assets.assets.length > 0) {
        const asset = response.body.data.assets.assets[0];
        expect(asset.signedUrl).toBeDefined();
        expect(typeof asset.signedUrl).toBe('string');
        expect(asset.signedUrl.length).toBeGreaterThan(0);
      }
    });

    it('should not include signedUrl by default in asset query', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
          query GetAsset($id: ID!) {
            asset(id: $id) {
              id
              fileName
              s3Url
              signedUrl
            }
          }
        `,
        variables: {
          id: testAssetId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.asset).toBeDefined();
      expect(response.body.data.asset.signedUrl).toBeNull();
    });

    it('should include signedUrl when explicitly requested in asset query', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
          query GetAsset($id: ID!) {
            asset(id: $id, signedUrl: true) {
              id
              fileName
              s3Url
              signedUrl
            }
          }
        `,
        variables: {
          id: testAssetId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.asset).toBeDefined();
      expect(response.body.data.asset.signedUrl).toBeDefined();
      expect(typeof response.body.data.asset.signedUrl).toBe('string');
      expect(response.body.data.asset.signedUrl.length).toBeGreaterThan(0);
    });

    it('should not include signedUrl by default in myAssets query', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
          query {
            myAssets(limit: 1) {
              assets {
                id
                fileName
                s3Url
                signedUrl
              }
            }
          }
        `,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.myAssets.assets).toBeDefined();
      if (response.body.data.myAssets.assets.length > 0) {
        const asset = response.body.data.myAssets.assets[0];
        expect(asset.signedUrl).toBeNull();
      }
    });

    it('should include signedUrl when explicitly requested in myAssets query', async () => {
      const response = await global.adminUserAdminAppTestRequest().send({
        query: `
          query {
            myAssets(limit: 1, signedUrl: true) {
              assets {
                id
                fileName
                s3Url
                signedUrl
              }
            }
          }
        `,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.myAssets.assets).toBeDefined();
      if (response.body.data.myAssets.assets.length > 0) {
        const asset = response.body.data.myAssets.assets[0];
        expect(asset.signedUrl).toBeDefined();
        expect(typeof asset.signedUrl).toBe('string');
        expect(asset.signedUrl.length).toBeGreaterThan(0);
      }
    });
  });
});
