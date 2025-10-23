const AWS = require('aws-sdk');
const logger = require('./logger');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name with extension
 * @param {string} folder - S3 folder (e.g., 'profiles', 'documents', 'portfolio')
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - S3 file URL
 */
const uploadToS3 = async (fileBuffer, fileName, folder = 'uploads', mimeType) => {
  const bucket = process.env.AWS_S3_BUCKET;
  const key = `${folder}/${Date.now()}-${fileName}`;

  const params = {
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: 'public-read' // Make files publicly accessible
  };

  try {
    const result = await s3.upload(params).promise();
    logger.info(`File uploaded to S3: ${result.Location}`);
    return result.Location;
  } catch (error) {
    logger.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

/**
 * Delete file from S3
 * @param {string} fileUrl - Full S3 URL
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (fileUrl) => {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    // Extract key from URL
    const urlParts = fileUrl.split('.com/');
    const key = urlParts[1];

    const params = {
      Bucket: bucket,
      Key: key
    };

    await s3.deleteObject(params).promise();
    logger.info(`File deleted from S3: ${key}`);
  } catch (error) {
    logger.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

/**
 * Generate presigned URL for temporary access
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
 * @returns {Promise<string>} - Presigned URL
 */
const getPresignedUrl = async (key, expiresIn = 3600) => {
  const bucket = process.env.AWS_S3_BUCKET;

  const params = {
    Bucket: bucket,
    Key: key,
    Expires: expiresIn
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    logger.error('Presigned URL error:', error);
    throw new Error('Failed to generate presigned URL');
  }
};

module.exports = {
  s3,
  uploadToS3,
  deleteFromS3,
  getPresignedUrl
};
