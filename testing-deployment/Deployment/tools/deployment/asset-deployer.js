#!/usr/bin/env node

/**
 * Asset Deployer
 * Handles deployment of static assets to CDN and manages asset versioning
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const glob = require('glob');
const sharp = require('sharp');
const { promisify } = require('util');

const globAsync = promisify(glob);

class AssetDeployer {
  constructor(options = {}) {
    this.config = {
      bucketName: process.env.AWS_S3_BUCKET || options.bucketName,
      cdnDistributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID || options.cdnDistributionId,
      environment: process.env.NODE_ENV || options.environment || 'staging',
      buildDir: options.buildDir || './build',
      assetsDir: options.assetsDir || './build/static',
      manifestPath: options.manifestPath || './build/asset-manifest.json',
      maxConcurrentUploads: options.maxConcurrentUploads || 10,
      cacheControl: options.cacheControl || {
        html: 'max-age=0, no-cache, no-store, must-revalidate',
        css: 'max-age=31536000, immutable',
        js: 'max-age=31536000, immutable',
        images: 'max-age=31536000, immutable',
        fonts: 'max-age=31536000, immutable',
        default: 'max-age=86400'
      },
      ...options
    };

    // Initialize AWS services
    this.s3 = new AWS.S3({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.cloudfront = new AWS.CloudFront({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.uploadQueue = [];
    this.uploadStats = {
      uploaded: 0,
      skipped: 0,
      errors: 0,
      totalSize: 0
    };
  }

  async deploy() {
    console.log(chalk.blue('🚀 Starting asset deployment...'));
    
    try {
      // Pre-deployment validation
      await this.validateConfig();
      await this.validateBuildOutput();

      // Optimize assets
      await this.optimizeAssets();

      // Generate asset manifest
      const manifest = await this.generateAssetManifest();

      // Upload assets to S3
      await this.uploadAssets();

      // Update asset manifest
      await this.uploadManifest(manifest);

      // Invalidate CDN cache
      await this.invalidateCache();

      // Post-deployment verification
      await this.verifyDeployment();

      this.printDeploymentSummary();
      
      console.log(chalk.green('✅ Asset deployment completed successfully!'));
      
    } catch (error) {
      console.error(chalk.red('❌ Asset deployment failed:'), error.message);
      process.exit(1);
    }
  }

  async validateConfig() {
    const spinner = ora('Validating configuration...').start();
    
    try {
      if (!this.config.bucketName) {
        throw new Error('AWS S3 bucket name is required');
      }

      if (!this.config.cdnDistributionId) {
        throw new Error('CloudFront distribution ID is required');
      }

      // Test AWS credentials and permissions
      await this.s3.headBucket({ Bucket: this.config.bucketName }).promise();
      await this.cloudfront.getDistribution({ Id: this.config.cdnDistributionId }).promise();

      spinner.succeed('Configuration validated');
    } catch (error) {
      spinner.fail('Configuration validation failed');
      throw error;
    }
  }

  async validateBuildOutput() {
    const spinner = ora('Validating build output...').start();
    
    try {
      const buildDirExists = await fs.access(this.config.buildDir).then(() => true).catch(() => false);
      if (!buildDirExists) {
        throw new Error(`Build directory not found: ${this.config.buildDir}`);
      }

      const assetsDirExists = await fs.access(this.config.assetsDir).then(() => true).catch(() => false);
      if (!assetsDirExists) {
        throw new Error(`Assets directory not found: ${this.config.assetsDir}`);
      }

      // Check for critical files
      const criticalFiles = ['index.html', 'static/js', 'static/css'];
      for (const file of criticalFiles) {
        const filePath = path.join(this.config.buildDir, file);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (!exists) {
          throw new Error(`Critical file/directory missing: ${file}`);
        }
      }

      spinner.succeed('Build output validated');
    } catch (error) {
      spinner.fail('Build output validation failed');
      throw error;
    }
  }

  async optimizeAssets() {
    const spinner = ora('Optimizing assets...').start();
    
    try {
      // Optimize images
      await this.optimizeImages();
      
      // Minify and compress JavaScript
      await this.optimizeJavaScript();
      
      // Optimize CSS
      await this.optimizeCSS();
      
      // Generate WebP versions of images
      await this.generateWebPImages();
      
      spinner.succeed('Assets optimized');
    } catch (error) {
      spinner.fail('Asset optimization failed');
      throw error;
    }
  }

  async optimizeImages() {
    const imageFiles = await globAsync(path.join(this.config.assetsDir, '**/*.{jpg,jpeg,png}'));
    
    for (const imagePath of imageFiles) {
      const outputPath = imagePath.replace(/\.(jpg|jpeg|png)$/, '.optimized.$1');
      
      await sharp(imagePath)
        .jpeg({ quality: 85, progressive: true })
        .png({ quality: 85, compressionLevel: 9 })
        .toFile(outputPath);
      
      // Replace original with optimized version
      await fs.rename(outputPath, imagePath);
    }
  }

  async generateWebPImages() {
    const imageFiles = await globAsync(path.join(this.config.assetsDir, '**/*.{jpg,jpeg,png}'));
    
    for (const imagePath of imageFiles) {
      const webpPath = imagePath.replace(/\.(jpg|jpeg|png)$/, '.webp');
      
      await sharp(imagePath)
        .webp({ quality: 85 })
        .toFile(webpPath);
    }
  }

  async optimizeJavaScript() {
    // JavaScript files are already minified by the build process
    // Additional optimization could include tree-shaking unused code
    const jsFiles = await globAsync(path.join(this.config.assetsDir, '**/*.js'));
    
    for (const jsFile of jsFiles) {
      const stats = await fs.stat(jsFile);
      console.log(`JS file: ${path.basename(jsFile)} (${this.formatBytes(stats.size)})`);
    }
  }

  async optimizeCSS() {
    // CSS files are already minified by the build process
    // Additional optimization could include unused CSS removal
    const cssFiles = await globAsync(path.join(this.config.assetsDir, '**/*.css'));
    
    for (const cssFile of cssFiles) {
      const stats = await fs.stat(cssFile);
      console.log(`CSS file: ${path.basename(cssFile)} (${this.formatBytes(stats.size)})`);
    }
  }

  async generateAssetManifest() {
    const spinner = ora('Generating asset manifest...').start();
    
    try {
      const manifest = {
        version: this.generateVersion(),
        environment: this.config.environment,
        timestamp: new Date().toISOString(),
        assets: {}
      };

      // Find all asset files
      const assetFiles = await globAsync(path.join(this.config.assetsDir, '**/*'), {
        nodir: true
      });

      for (const filePath of assetFiles) {
        const relativePath = path.relative(this.config.buildDir, filePath);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath);
        const hash = crypto.createHash('md5').update(content).digest('hex');
        
        manifest.assets[relativePath] = {
          size: stats.size,
          hash: hash,
          lastModified: stats.mtime.toISOString(),
          contentType: this.getContentType(filePath),
          cacheControl: this.getCacheControl(filePath)
        };
      }

      // Include HTML files
      const htmlFiles = await globAsync(path.join(this.config.buildDir, '**/*.html'));
      for (const filePath of htmlFiles) {
        const relativePath = path.relative(this.config.buildDir, filePath);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath);
        const hash = crypto.createHash('md5').update(content).digest('hex');
        
        manifest.assets[relativePath] = {
          size: stats.size,
          hash: hash,
          lastModified: stats.mtime.toISOString(),
          contentType: 'text/html',
          cacheControl: this.config.cacheControl.html
        };
      }

      spinner.succeed('Asset manifest generated');
      return manifest;
    } catch (error) {
      spinner.fail('Asset manifest generation failed');
      throw error;
    }
  }

  async uploadAssets() {
    const spinner = ora('Uploading assets to S3...').start();
    
    try {
      // Get all files to upload
      const allFiles = await globAsync(path.join(this.config.buildDir, '**/*'), {
        nodir: true
      });

      // Check which files need updating
      const filesToUpload = await this.getFilesToUpload(allFiles);
      
      spinner.text = `Uploading ${filesToUpload.length} assets to S3...`;

      // Upload files in batches
      const batches = this.createBatches(filesToUpload, this.config.maxConcurrentUploads);
      
      for (const batch of batches) {
        await Promise.all(batch.map(file => this.uploadFile(file)));
        spinner.text = `Uploaded ${this.uploadStats.uploaded}/${filesToUpload.length} assets...`;
      }

      spinner.succeed(`Successfully uploaded ${this.uploadStats.uploaded} assets`);
    } catch (error) {
      spinner.fail('Asset upload failed');
      throw error;
    }
  }

  async getFilesToUpload(allFiles) {
    const filesToUpload = [];
    
    for (const filePath of allFiles) {
      const key = this.getS3Key(filePath);
      const needsUpload = await this.fileNeedsUpload(filePath, key);
      
      if (needsUpload) {
        filesToUpload.push(filePath);
      } else {
        this.uploadStats.skipped++;
      }
    }
    
    return filesToUpload;
  }

  async fileNeedsUpload(filePath, key) {
    try {
      // Check if file exists in S3 and compare ETag
      const s3Object = await this.s3.headObject({
        Bucket: this.config.bucketName,
        Key: key
      }).promise();

      const fileContent = await fs.readFile(filePath);
      const localETag = crypto.createHash('md5').update(fileContent).digest('hex');
      const s3ETag = s3Object.ETag.replace(/"/g, '');

      return localETag !== s3ETag;
    } catch (error) {
      // File doesn't exist in S3, needs upload
      return true;
    }
  }

  async uploadFile(filePath) {
    try {
      const key = this.getS3Key(filePath);
      const content = await fs.readFile(filePath);
      const contentType = this.getContentType(filePath);
      const cacheControl = this.getCacheControl(filePath);
      
      const uploadParams = {
        Bucket: this.config.bucketName,
        Key: key,
        Body: content,
        ContentType: contentType,
        CacheControl: cacheControl,
        ServerSideEncryption: 'AES256'
      };

      // Add compression for compressible files
      if (this.isCompressible(contentType)) {
        uploadParams.ContentEncoding = 'gzip';
        uploadParams.Body = await this.gzipContent(content);
      }

      await this.s3.upload(uploadParams).promise();
      
      this.uploadStats.uploaded++;
      this.uploadStats.totalSize += content.length;
      
    } catch (error) {
      this.uploadStats.errors++;
      console.error(`Failed to upload ${filePath}:`, error.message);
    }
  }

  async uploadManifest(manifest) {
    const spinner = ora('Uploading asset manifest...').start();
    
    try {
      const manifestContent = JSON.stringify(manifest, null, 2);
      
      await this.s3.upload({
        Bucket: this.config.bucketName,
        Key: 'asset-manifest.json',
        Body: manifestContent,
        ContentType: 'application/json',
        CacheControl: 'max-age=300', // 5 minutes cache
        ServerSideEncryption: 'AES256'
      }).promise();

      // Also save manifest locally
      await fs.writeFile(this.config.manifestPath, manifestContent);
      
      spinner.succeed('Asset manifest uploaded');
    } catch (error) {
      spinner.fail('Asset manifest upload failed');
      throw error;
    }
  }

  async invalidateCache() {
    const spinner = ora('Invalidating CDN cache...').start();
    
    try {
      const invalidationParams = {
        DistributionId: this.config.cdnDistributionId,
        InvalidationBatch: {
          CallerReference: `asset-deploy-${Date.now()}`,
          Paths: {
            Quantity: 1,
            Items: ['/*'] // Invalidate all paths
          }
        }
      };

      const result = await this.cloudfront.createInvalidation(invalidationParams).promise();
      
      spinner.succeed(`CDN cache invalidation initiated (${result.Invalidation.Id})`);
      
      // Wait for invalidation to complete if needed
      if (process.env.WAIT_FOR_INVALIDATION === 'true') {
        await this.waitForInvalidation(result.Invalidation.Id);
      }
      
    } catch (error) {
      spinner.fail('CDN cache invalidation failed');
      throw error;
    }
  }

  async waitForInvalidation(invalidationId) {
    const spinner = ora('Waiting for CDN invalidation to complete...').start();
    
    try {
      await this.cloudfront.waitFor('invalidationCompleted', {
        DistributionId: this.config.cdnDistributionId,
        Id: invalidationId
      }).promise();
      
      spinner.succeed('CDN invalidation completed');
    } catch (error) {
      spinner.warn('CDN invalidation status unknown');
    }
  }

  async verifyDeployment() {
    const spinner = ora('Verifying deployment...').start();
    
    try {
      // Verify critical assets are accessible
      const criticalAssets = [
        'index.html',
        'static/js/main.*.js',
        'static/css/main.*.css'
      ];

      for (const assetPattern of criticalAssets) {
        const assetExists = await this.verifyAssetExists(assetPattern);
        if (!assetExists) {
          throw new Error(`Critical asset not found: ${assetPattern}`);
        }
      }

      // Verify manifest is accessible
      await this.s3.headObject({
        Bucket: this.config.bucketName,
        Key: 'asset-manifest.json'
      }).promise();

      spinner.succeed('Deployment verified');
    } catch (error) {
      spinner.fail('Deployment verification failed');
      throw error;
    }
  }

  async verifyAssetExists(assetPattern) {
    try {
      const objects = await this.s3.listObjectsV2({
        Bucket: this.config.bucketName,
        Prefix: assetPattern.replace('*', '')
      }).promise();

      return objects.Contents && objects.Contents.length > 0;
    } catch (error) {
      return false;
    }
  }

  getS3Key(filePath) {
    const relativePath = path.relative(this.config.buildDir, filePath);
    return relativePath.replace(/\\/g, '/'); // Convert Windows paths to Unix style
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.map': 'application/json',
      '.txt': 'text/plain',
      '.xml': 'application/xml'
    };

    return contentTypes[ext] || 'application/octet-stream';
  }

  getCacheControl(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (filePath.includes('.html')) {
      return this.config.cacheControl.html;
    } else if (['.css'].includes(ext)) {
      return this.config.cacheControl.css;
    } else if (['.js'].includes(ext)) {
      return this.config.cacheControl.js;
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
      return this.config.cacheControl.images;
    } else if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
      return this.config.cacheControl.fonts;
    }
    
    return this.config.cacheControl.default;
  }

  isCompressible(contentType) {
    const compressibleTypes = [
      'text/',
      'application/javascript',
      'application/json',
      'application/xml',
      'image/svg+xml'
    ];

    return compressibleTypes.some(type => contentType.startsWith(type));
  }

  async gzipContent(content) {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(content, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  generateVersion() {
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    return `${timestamp}-${gitHash}`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  printDeploymentSummary() {
    console.log('\n' + chalk.blue('📊 Deployment Summary'));
    console.log('─────────────────────────');
    console.log(`Environment: ${chalk.yellow(this.config.environment)}`);
    console.log(`Bucket: ${chalk.yellow(this.config.bucketName)}`);
    console.log(`Distribution: ${chalk.yellow(this.config.cdnDistributionId)}`);
    console.log(`Files uploaded: ${chalk.green(this.uploadStats.uploaded)}`);
    console.log(`Files skipped: ${chalk.yellow(this.uploadStats.skipped)}`);
    console.log(`Errors: ${chalk.red(this.uploadStats.errors)}`);
    console.log(`Total size: ${chalk.cyan(this.formatBytes(this.uploadStats.totalSize))}`);
    console.log('─────────────────────────\n');
  }

  // Rollback functionality
  async rollback(version) {
    console.log(chalk.blue(`🔄 Rolling back to version ${version}...`));
    
    try {
      // Download previous manifest
      const manifestKey = `manifests/asset-manifest-${version}.json`;
      const manifest = await this.downloadManifest(manifestKey);
      
      if (!manifest) {
        throw new Error(`Version ${version} not found`);
      }

      // Restore assets from backup
      await this.restoreAssets(manifest);
      
      // Update current manifest
      await this.uploadManifest(manifest);
      
      // Invalidate cache
      await this.invalidateCache();
      
      console.log(chalk.green(`✅ Successfully rolled back to version ${version}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Rollback failed:'), error.message);
      process.exit(1);
    }
  }

  async downloadManifest(manifestKey) {
    try {
      const result = await this.s3.getObject({
        Bucket: this.config.bucketName,
        Key: manifestKey
      }).promise();
      
      return JSON.parse(result.Body.toString());
    } catch (error) {
      return null;
    }
  }

  async restoreAssets(manifest) {
    const spinner = ora('Restoring assets from backup...').start();
    
    try {
      for (const [assetPath, assetInfo] of Object.entries(manifest.assets)) {
        const backupKey = `backups/${manifest.version}/${assetPath}`;
        const currentKey = assetPath;
        
        // Copy from backup to current location
        await this.s3.copyObject({
          Bucket: this.config.bucketName,
          CopySource: `${this.config.bucketName}/${backupKey}`,
          Key: currentKey,
          CacheControl: assetInfo.cacheControl,
          ContentType: assetInfo.contentType
        }).promise();
      }
      
      spinner.succeed('Assets restored from backup');
    } catch (error) {
      spinner.fail('Asset restoration failed');
      throw error;
    }
  }

  // Backup functionality
  async backup() {
    console.log(chalk.blue('💾 Creating asset backup...'));
    
    try {
      const version = this.generateVersion();
      
      // List all current assets
      const objects = await this.s3.listObjectsV2({
        Bucket: this.config.bucketName,
        Prefix: 'static/'
      }).promise();

      // Copy assets to backup location
      const spinner = ora('Backing up assets...').start();
      
      for (const object of objects.Contents) {
        const backupKey = `backups/${version}/${object.Key}`;
        
        await this.s3.copyObject({
          Bucket: this.config.bucketName,
          CopySource: `${this.config.bucketName}/${object.Key}`,
          Key: backupKey
        }).promise();
      }

      // Backup current manifest
      const manifestBackupKey = `manifests/asset-manifest-${version}.json`;
      await this.s3.copyObject({
        Bucket: this.config.bucketName,
        CopySource: `${this.config.bucketName}/asset-manifest.json`,
        Key: manifestBackupKey
      }).promise();

      spinner.succeed(`Backup created with version ${version}`);
      
      return version;
    } catch (error) {
      console.error(chalk.red('❌ Backup failed:'), error.message);
      throw error;
    }
  }

  // Cleanup old backups
  async cleanupOldBackups(keepVersions = 10) {
    console.log(chalk.blue('🧹 Cleaning up old backups...'));
    
    try {
      const spinner = ora('Finding old backups...').start();
      
      // List all backup versions
      const backups = await this.s3.listObjectsV2({
        Bucket: this.config.bucketName,
        Prefix: 'backups/',
        Delimiter: '/'
      }).promise();

      const versions = backups.CommonPrefixes
        .map(prefix => prefix.Prefix.split('/')[1])
        .sort()
        .reverse();

      const versionsToDelete = versions.slice(keepVersions);
      
      if (versionsToDelete.length === 0) {
        spinner.succeed('No old backups to clean up');
        return;
      }

      spinner.text = `Deleting ${versionsToDelete.length} old backup versions...`;

      for (const version of versionsToDelete) {
        await this.deleteBackupVersion(version);
      }

      spinner.succeed(`Cleaned up ${versionsToDelete.length} old backup versions`);
      
    } catch (error) {
      console.error(chalk.red('❌ Backup cleanup failed:'), error.message);
    }
  }

  async deleteBackupVersion(version) {
    const objects = await this.s3.listObjectsV2({
      Bucket: this.config.bucketName,
      Prefix: `backups/${version}/`
    }).promise();

    if (objects.Contents.length > 0) {
      const deleteParams = {
        Bucket: this.config.bucketName,
        Delete: {
          Objects: objects.Contents.map(obj => ({ Key: obj.Key }))
        }
      };

      await this.s3.deleteObjects(deleteParams).promise();
    }

    // Delete manifest backup
    try {
      await this.s3.deleteObject({
        Bucket: this.config.bucketName,
        Key: `manifests/asset-manifest-${version}.json`
      }).promise();
    } catch (error) {
      // Manifest might not exist, ignore error
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const deployer = new AssetDeployer();

  switch (command) {
    case 'deploy':
      deployer.deploy();
      break;
      
    case 'backup':
      deployer.backup();
      break;
      
    case 'rollback':
      const version = args[1];
      if (!version) {
        console.error(chalk.red('❌ Version required for rollback'));
        process.exit(1);
      }
      deployer.rollback(version);
      break;
      
    case 'cleanup':
      const keepVersions = parseInt(args[1]) || 10;
      deployer.cleanupOldBackups(keepVersions);
      break;
      
    default:
      console.log(chalk.blue('Asset Deployer'));
      console.log('Usage:');
      console.log('  node asset-deployer.js deploy     - Deploy assets to CDN');
      console.log('  node asset-deployer.js backup     - Create backup of current assets');
      console.log('  node asset-deployer.js rollback <version> - Rollback to specific version');
      console.log('  node asset-deployer.js cleanup [keep] - Cleanup old backups (default: keep 10)');
      break;
  }
}

module.exports = AssetDeployer;