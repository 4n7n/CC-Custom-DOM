#!/usr/bin/env node

/**
 * Cache Invalidator
 * Manages cache invalidation across multiple CDN providers and cache layers
 */

const AWS = require('aws-sdk');
const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const { promisify } = require('util');
const redis = require('redis');

class CacheInvalidator {
  constructor(options = {}) {
    this.config = {
      // CloudFront configuration
      cloudfront: {
        distributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID || options.cloudfrontDistributionId,
        region: process.env.AWS_REGION || 'us-east-1'
      },
      
      // Cloudflare configuration
      cloudflare: {
        zoneId: process.env.CLOUDFLARE_ZONE_ID || options.cloudflareZoneId,
        apiToken: process.env.CLOUDFLARE_API_TOKEN || options.cloudflareApiToken,
        email: process.env.CLOUDFLARE_EMAIL || options.cloudflareEmail,
        apiKey: process.env.CLOUDFLARE_API_KEY || options.cloudflareApiKey
      },
      
      // Redis configuration
      redis: {
        url: process.env.REDIS_URL || options.redisUrl || 'redis://localhost:6379',
        keyPrefix: options.redisKeyPrefix || 'storyplatform:cache:'
      },
      
      // Application cache endpoints
      appCache: {
        endpoints: options.appCacheEndpoints || [
          process.env.APP_URL + '/api/cache/invalidate',
          process.env.STAGING_URL && process.env.STAGING_URL + '/api/cache/invalidate'
        ].filter(Boolean),
        authToken: process.env.CACHE_INVALIDATION_TOKEN || options.cacheAuthToken
      },
      
      // Invalidation patterns
      patterns: {
        all: ['/*'],
        static: ['/static/*', '/assets/*'],
        api: ['/api/*'],
        pages: ['/', '/communities/*', '/profile/*', '/stories/*'],
        images: ['/static/images/*', '/uploads/*'],
        css: ['/static/css/*'],
        js: ['/static/js/*']
      },
      
      // Configuration
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      batchSize: options.batchSize || 100,
      
      ...options
    };

    // Initialize services
    this.cloudfront = new AWS.CloudFront({
      region: this.config.cloudfront.region
    });

    this.redisClient = null;
    this.initializeRedis();

    this.invalidationStats = {
      cloudfront: { success: false, invalidationId: null, error: null },
      cloudflare: { success: false, purgeId: null, error: null },
      redis: { success: false, keysCleared: 0, error: null },
      appCache: { success: false, endpoints: [], error: null }
    };
  }

  async initializeRedis() {
    try {
      this.redisClient = redis.createClient({ url: this.config.redis.url });
      await this.redisClient.connect();
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Redis connection failed, skipping Redis cache invalidation'));
    }
  }

  async invalidateAll(type = 'deployment') {
    console.log(chalk.blue(`🗑️  Starting cache invalidation (${type})...`));
    
    try {
      const results = await Promise.allSettled([
        this.invalidateCloudFront(['/*']),
        this.invalidateCloudflare(['purge_everything']),
        this.invalidateRedis(),
        this.invalidateApplicationCache()
      ]);

      this.processResults(results);
      this.printInvalidationSummary();
      
      const hasFailures = Object.values(this.invalidationStats).some(stat => !stat.success);
      
      if (hasFailures) {
        console.log(chalk.yellow('⚠️  Some cache invalidations failed, but deployment can continue'));
      } else {
        console.log(chalk.green('✅ All cache layers invalidated successfully'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Cache invalidation failed:'), error.message);
      throw error;
    }
  }

  async invalidateSelective(patterns) {
    console.log(chalk.blue(`🎯 Starting selective cache invalidation...`));
    
    try {
      const cloudfrontPaths = this.expandPatterns(patterns);
      
      const results = await Promise.allSettled([
        this.invalidateCloudFront(cloudfrontPaths),
        this.invalidateCloudflareSelective(patterns),
        this.invalidateRedisSelective(patterns),
        this.invalidateApplicationCacheSelective(patterns)
      ]);

      this.processResults(results);
      this.printInvalidationSummary();
      
    } catch (error) {
      console.error(chalk.red('❌ Selective cache invalidation failed:'), error.message);
      throw error;
    }
  }

  async invalidateCloudFront(paths) {
    const spinner = ora('Invalidating CloudFront cache...').start();
    
    try {
      if (!this.config.cloudfront.distributionId) {
        spinner.skip('CloudFront distribution ID not configured');
        return;
      }

      // CloudFront has a limit of 3000 paths per invalidation
      const batches = this.createBatches(paths, 3000);
      const invalidationIds = [];

      for (const batch of batches) {
        const invalidationParams = {
          DistributionId: this.config.cloudfront.distributionId,
          InvalidationBatch: {
            CallerReference: `cache-invalidation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            Paths: {
              Quantity: batch.length,
              Items: batch
            }
          }
        };

        const result = await this.cloudfront.createInvalidation(invalidationParams).promise();
        invalidationIds.push(result.Invalidation.Id);
      }

      this.invalidationStats.cloudfront = {
        success: true,
        invalidationId: invalidationIds.length === 1 ? invalidationIds[0] : invalidationIds,
        pathsInvalidated: paths.length,
        error: null
      };

      spinner.succeed(`CloudFront cache invalidated (${invalidationIds.length} invalidation(s))`);
      
      return invalidationIds;
    } catch (error) {
      this.invalidationStats.cloudfront = {
        success: false,
        invalidationId: null,
        error: error.message
      };
      
      spinner.fail('CloudFront cache invalidation failed');
      throw error;
    }
  }

  async waitForCloudFrontInvalidation(invalidationId) {
    const spinner = ora(`Waiting for CloudFront invalidation ${invalidationId} to complete...`).start();
    
    try {
      await this.cloudfront.waitFor('invalidationCompleted', {
        DistributionId: this.config.cloudfront.distributionId,
        Id: invalidationId
      }).promise();
      
      spinner.succeed(`CloudFront invalidation ${invalidationId} completed`);
    } catch (error) {
      spinner.warn(`CloudFront invalidation ${invalidationId} status unknown`);
    }
  }

  async invalidateCloudflare(action = 'purge_everything') {
    const spinner = ora('Invalidating Cloudflare cache...').start();
    
    try {
      if (!this.config.cloudflare.zoneId || !this.getCloudflareAuth()) {
        spinner.skip('Cloudflare configuration not found');
        return;
      }

      const headers = this.getCloudflareHeaders();
      const url = `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zoneId}/purge_cache`;
      
      const data = action === 'purge_everything' 
        ? { purge_everything: true }
        : { files: action };

      const response = await axios.post(url, data, { headers });

      if (response.data.success) {
        this.invalidationStats.cloudflare = {
          success: true,
          purgeId: response.data.result?.id || 'purge_everything',
          error: null
        };
        
        spinner.succeed('Cloudflare cache invalidated');
      } else {
        throw new Error(response.data.errors?.map(e => e.message).join(', ') || 'Unknown Cloudflare error');
      }
      
    } catch (error) {
      this.invalidationStats.cloudflare = {
        success: false,
        purgeId: null,
        error: error.message
      };
      
      spinner.fail('Cloudflare cache invalidation failed');
      console.error('Cloudflare error:', error.response?.data || error.message);
    }
  }

  async invalidateCloudflareSelective(patterns) {
    const spinner = ora('Invalidating Cloudflare cache (selective)...').start();
    
    try {
      if (!this.config.cloudflare.zoneId || !this.getCloudflareAuth()) {
        spinner.skip('Cloudflare configuration not found');
        return;
      }

      // Convert patterns to full URLs for Cloudflare
      const baseUrl = process.env.PRODUCTION_URL || process.env.APP_URL;
      if (!baseUrl) {
        spinner.skip('Base URL not configured for Cloudflare selective purge');
        return;
      }

      const urls = patterns.map(pattern => {
        const cleanPattern = pattern.replace(/\/\*$/, '');
        return `${baseUrl}${cleanPattern}`;
      });

      await this.invalidateCloudflare(urls);
      
    } catch (error) {
      spinner.fail('Cloudflare selective invalidation failed');
      throw error;
    }
  }

  async invalidateRedis() {
    const spinner = ora('Clearing Redis cache...').start();
    
    try {
      if (!this.redisClient) {
        spinner.skip('Redis client not available');
        return;
      }

      // Get all keys with the prefix
      const pattern = `${this.config.redis.keyPrefix}*`;
      const keys = await this.redisClient.keys(pattern);
      
      if (keys.length === 0) {
        this.invalidationStats.redis = {
          success: true,
          keysCleared: 0,
          error: null
        };
        
        spinner.succeed('Redis cache cleared (no keys found)');
        return;
      }

      // Delete keys in batches
      const batches = this.createBatches(keys, this.config.batchSize);
      let totalKeysCleared = 0;

      for (const batch of batches) {
        await this.redisClient.del(batch);
        totalKeysCleared += batch.length;
      }

      this.invalidationStats.redis = {
        success: true,
        keysCleared: totalKeysCleared,
        error: null
      };
      
      spinner.succeed(`Redis cache cleared (${totalKeysCleared} keys)`);
      
    } catch (error) {
      this.invalidationStats.redis = {
        success: false,
        keysCleared: 0,
        error: error.message
      };
      
      spinner.fail('Redis cache clearing failed');
      console.error('Redis error:', error.message);
    }
  }

  async invalidateRedisSelective(patterns) {
    const spinner = ora('Clearing Redis cache (selective)...').start();
    
    try {
      if (!this.redisClient) {
        spinner.skip('Redis client not available');
        return;
      }

      let totalKeysCleared = 0;

      for (const pattern of patterns) {
        const redisPattern = `${this.config.redis.keyPrefix}${pattern.replace(/\*/g, '*')}`;
        const keys = await this.redisClient.keys(redisPattern);
        
        if (keys.length > 0) {
          const batches = this.createBatches(keys, this.config.batchSize);
          
          for (const batch of batches) {
            await this.redisClient.del(batch);
            totalKeysCleared += batch.length;
          }
        }
      }

      this.invalidationStats.redis = {
        success: true,
        keysCleared: totalKeysCleared,
        error: null
      };
      
      spinner.succeed(`Redis cache cleared (${totalKeysCleared} keys)`);
      
    } catch (error) {
      this.invalidationStats.redis = {
        success: false,
        keysCleared: 0,
        error: error.message
      };
      
      spinner.fail('Redis selective cache clearing failed');
      console.error('Redis error:', error.message);
    }
  }

  async invalidateApplicationCache() {
    const spinner = ora('Invalidating application cache...').start();
    
    try {
      const results = [];
      
      for (const endpoint of this.config.appCache.endpoints) {
        try {
          const headers = {};
          if (this.config.appCache.authToken) {
            headers['Authorization'] = `Bearer ${this.config.appCache.authToken}`;
          }

          const response = await axios.post(endpoint, 
            { action: 'invalidate_all', timestamp: Date.now() },
            { headers, timeout: 10000 }
          );

          results.push({
            endpoint,
            success: true,
            response: response.data
          });
          
        } catch (error) {
          results.push({
            endpoint,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      this.invalidationStats.appCache = {
        success: successCount > 0,
        endpoints: results,
        error: successCount === 0 ? 'All endpoints failed' : null
      };
      
      if (successCount === results.length) {
        spinner.succeed(`Application cache invalidated (${successCount} endpoints)`);
      } else if (successCount > 0) {
        spinner.warn(`Application cache partially invalidated (${successCount}/${results.length} endpoints)`);
      } else {
        spinner.fail('Application cache invalidation failed');
      }
      
    } catch (error) {
      this.invalidationStats.appCache = {
        success: false,
        endpoints: [],
        error: error.message
      };
      
      spinner.fail('Application cache invalidation failed');
    }
  }

  async invalidateApplicationCacheSelective(patterns) {
    const spinner = ora('Invalidating application cache (selective)...').start();
    
    try {
      const results = [];
      
      for (const endpoint of this.config.appCache.endpoints) {
        try {
          const headers = {};
          if (this.config.appCache.authToken) {
            headers['Authorization'] = `Bearer ${this.config.appCache.authToken}`;
          }

          const response = await axios.post(endpoint, 
            { 
              action: 'invalidate_selective', 
              patterns: patterns,
              timestamp: Date.now() 
            },
            { headers, timeout: 10000 }
          );

          results.push({
            endpoint,
            success: true,
            response: response.data
          });
          
        } catch (error) {
          results.push({
            endpoint,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      this.invalidationStats.appCache = {
        success: successCount > 0,
        endpoints: results,
        error: successCount === 0 ? 'All endpoints failed' : null
      };
      
      if (successCount === results.length) {
        spinner.succeed(`Application cache invalidated (${successCount} endpoints)`);
      } else if (successCount > 0) {
        spinner.warn(`Application cache partially invalidated (${successCount}/${results.length} endpoints)`);
      } else {
        spinner.fail('Application cache selective invalidation failed');
      }
      
    } catch (error) {
      this.invalidationStats.appCache = {
        success: false,
        endpoints: [],
        error: error.message
      };
      
      spinner.fail('Application cache selective invalidation failed');
    }
  }

  getCloudflareAuth() {
    return this.config.cloudflare.apiToken || 
           (this.config.cloudflare.email && this.config.cloudflare.apiKey);
  }

  getCloudflareHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.config.cloudflare.apiToken) {
      headers['Authorization'] = `Bearer ${this.config.cloudflare.apiToken}`;
    } else if (this.config.cloudflare.email && this.config.cloudflare.apiKey) {
      headers['X-Auth-Email'] = this.config.cloudflare.email;
      headers['X-Auth-Key'] = this.config.cloudflare.apiKey;
    }

    return headers;
  }

  expandPatterns(patterns) {
    const expanded = new Set();
    
    for (const pattern of patterns) {
      if (this.config.patterns[pattern]) {
        this.config.patterns[pattern].forEach(p => expanded.add(p));
      } else {
        expanded.add(pattern);
      }
    }
    
    return Array.from(expanded);
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  processResults(results) {
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(chalk.yellow(`⚠️  Cache invalidation step ${index + 1} failed:`, result.reason?.message));
      }
    });
  }

  printInvalidationSummary() {
    console.log('\n' + chalk.blue('🗑️  Cache Invalidation Summary'));
    console.log('────────────────────────────────');
    
    // CloudFront
    const cf = this.invalidationStats.cloudfront;
    if (cf.success) {
      console.log(`${chalk.green('✅')} CloudFront: ${cf.invalidationId} (${cf.pathsInvalidated || 'all'} paths)`);
    } else if (cf.error) {
      console.log(`${chalk.red('❌')} CloudFront: ${cf.error}`);
    } else {
      console.log(`${chalk.gray('⏭️')} CloudFront: Skipped`);
    }
    
    // Cloudflare
    const cflar = this.invalidationStats.cloudflare;
    if (cflar.success) {
      console.log(`${chalk.green('✅')} Cloudflare: ${cflar.purgeId}`);
    } else if (cflar.error) {
      console.log(`${chalk.red('❌')} Cloudflare: ${cflar.error}`);
    } else {
      console.log(`${chalk.gray('⏭️')} Cloudflare: Skipped`);
    }
    
    // Redis
    const redis = this.invalidationStats.redis;
    if (redis.success) {
      console.log(`${chalk.green('✅')} Redis: ${redis.keysCleared} keys cleared`);
    } else if (redis.error) {
      console.log(`${chalk.red('❌')} Redis: ${redis.error}`);
    } else {
      console.log(`${chalk.gray('⏭️')} Redis: Skipped`);
    }
    
    // Application Cache
    const app = this.invalidationStats.appCache;
    if (app.success) {
      const successCount = app.endpoints.filter(e => e.success).length;
      console.log(`${chalk.green('✅')} Application: ${successCount}/${app.endpoints.length} endpoints`);
    } else if (app.error) {
      console.log(`${chalk.red('❌')} Application: ${app.error}`);
    } else {
      console.log(`${chalk.gray('⏭️')} Application: Skipped`);
    }
    
    console.log('────────────────────────────────\n');
  }

  // Prewarming functionality
  async prewarmCache(urls = []) {
    console.log(chalk.blue('🔥 Prewarming cache...'));
    
    try {
      const defaultUrls = [
        '/',
        '/communities',
        '/api/stories/featured',
        '/api/communities',
        '/static/css/main.css',
        '/static/js/main.js'
      ];

      const urlsToPrewarm = urls.length > 0 ? urls : defaultUrls;
      const baseUrl = process.env.PRODUCTION_URL || process.env.APP_URL;
      
      if (!baseUrl) {
        console.log(chalk.yellow('⚠️  Base URL not configured, skipping cache prewarming'));
        return;
      }

      const spinner = ora('Prewarming cache...').start();
      const results = [];

      // Prewarm URLs concurrently but with rate limiting
      const batches = this.createBatches(urlsToPrewarm, 5);
      
      for (const batch of batches) {
        const batchPromises = batch.map(async (url) => {
          try {
            const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
            const response = await axios.get(fullUrl, {
              timeout: 30000,
              headers: {
                'User-Agent': 'CachePrewarmer/1.0',
                'Cache-Control': 'no-cache'
              }
            });
            
            return {
              url: fullUrl,
              status: response.status,
              success: true,
              cacheStatus: response.headers['x-cache'] || response.headers['cf-cache-status']
            };
          } catch (error) {
            return {
              url: url,
              status: error.response?.status || 0,
              success: false,
              error: error.message
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Rate limiting between batches
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      if (successCount === results.length) {
        spinner.succeed(`Cache prewarmed (${successCount} URLs)`);
      } else {
        spinner.warn(`Cache partially prewarmed (${successCount}/${results.length} URLs)`);
      }

      // Log detailed results if there are failures
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.log(chalk.yellow('\nPrewarm failures:'));
        failures.forEach(failure => {
          console.log(`  ${chalk.red('❌')} ${failure.url}: ${failure.error}`);
        });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Cache prewarming failed:'), error.message);
    }
  }

  // Health check for cache layers
  async healthCheck() {
    console.log(chalk.blue('🏥 Checking cache layer health...'));
    
    const health = {
      cloudfront: { status: 'unknown', message: '' },
      cloudflare: { status: 'unknown', message: '' },
      redis: { status: 'unknown', message: '' },
      appCache: { status: 'unknown', message: '' }
    };

    // Check CloudFront
    try {
      if (this.config.cloudfront.distributionId) {
        await this.cloudfront.getDistribution({
          Id: this.config.cloudfront.distributionId
        }).promise();
        health.cloudfront = { status: 'healthy', message: 'Distribution accessible' };
      } else {
        health.cloudfront = { status: 'skipped', message: 'Not configured' };
      }
    } catch (error) {
      health.cloudfront = { status: 'unhealthy', message: error.message };
    }

    // Check Cloudflare
    try {
      if (this.config.cloudflare.zoneId && this.getCloudflareAuth()) {
        const headers = this.getCloudflareHeaders();
        const response = await axios.get(
          `https://api.cloudflare.com/client/v4/zones/${this.config.cloudflare.zoneId}`,
          { headers }
        );
        health.cloudflare = { status: 'healthy', message: 'Zone accessible' };
      } else {
        health.cloudflare = { status: 'skipped', message: 'Not configured' };
      }
    } catch (error) {
      health.cloudflare = { status: 'unhealthy', message: error.message };
    }

    // Check Redis
    try {
      if (this.redisClient) {
        await this.redisClient.ping();
        health.redis = { status: 'healthy', message: 'Connection active' };
      } else {
        health.redis = { status: 'skipped', message: 'Not connected' };
      }
    } catch (error) {
      health.redis = { status: 'unhealthy', message: error.message };
    }

    // Check Application Cache endpoints
    try {
      if (this.config.appCache.endpoints.length > 0) {
        const results = await Promise.allSettled(
          this.config.appCache.endpoints.map(endpoint => 
            axios.get(`${endpoint}/health`, { timeout: 5000 })
          )
        );
        
        const healthyCount = results.filter(r => r.status === 'fulfilled').length;
        const totalCount = results.length;
        
        if (healthyCount === totalCount) {
          health.appCache = { status: 'healthy', message: `All ${totalCount} endpoints healthy` };
        } else if (healthyCount > 0) {
          health.appCache = { status: 'degraded', message: `${healthyCount}/${totalCount} endpoints healthy` };
        } else {
          health.appCache = { status: 'unhealthy', message: 'No endpoints responding' };
        }
      } else {
        health.appCache = { status: 'skipped', message: 'No endpoints configured' };
      }
    } catch (error) {
      health.appCache = { status: 'unhealthy', message: error.message };
    }

    // Print health report
    console.log('\n' + chalk.blue('🏥 Cache Health Report'));
    console.log('──────────────────────────');
    
    Object.entries(health).forEach(([service, status]) => {
      const icon = {
        healthy: chalk.green('✅'),
        degraded: chalk.yellow('⚠️'),
        unhealthy: chalk.red('❌'),
        skipped: chalk.gray('⏭️'),
        unknown: chalk.gray('❓')
      }[status.status];
      
      console.log(`${icon} ${service}: ${status.message}`);
    });
    
    console.log('──────────────────────────\n');
    
    return health;
  }

  // Scheduled cache warming
  async schedulePrewarm(cronExpression = '0 */6 * * *') {
    console.log(chalk.blue(`⏰ Scheduling cache prewarming: ${cronExpression}`));
    
    // This would typically integrate with a job scheduler like node-cron
    // For now, we'll just log the intention
    console.log(chalk.yellow('Note: Implement with node-cron or similar scheduler'));
    
    return {
      scheduled: true,
      expression: cronExpression,
      nextRun: 'Depends on scheduler implementation'
    };
  }

  async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const invalidator = new CacheInvalidator();

  const runCommand = async () => {
    try {
      switch (command) {
        case 'all':
          await invalidator.invalidateAll();
          break;
          
        case 'selective':
          const patterns = args.slice(1);
          if (patterns.length === 0) {
            console.error(chalk.red('❌ Patterns required for selective invalidation'));
            console.log('Available patterns:', Object.keys(invalidator.config.patterns).join(', '));
            process.exit(1);
          }
          await invalidator.invalidateSelective(patterns);
          break;
          
        case 'prewarm':
          const urls = args.slice(1);
          await invalidator.prewarmCache(urls);
          break;
          
        case 'health':
          await invalidator.healthCheck();
          break;
          
        case 'cloudfront':
          const paths = args.slice(1);
          if (paths.length === 0) paths.push('/*');
          await invalidator.invalidateCloudFront(paths);
          break;
          
        case 'cloudflare':
          await invalidator.invalidateCloudflare();
          break;
          
        case 'redis':
          await invalidator.invalidateRedis();
          break;
          
        case 'app':
          await invalidator.invalidateApplicationCache();
          break;
          
        default:
          console.log(chalk.blue('Cache Invalidator'));
          console.log('Usage:');
          console.log('  node cache-invalidator.js all              - Invalidate all cache layers');
          console.log('  node cache-invalidator.js selective <patterns> - Selective invalidation');
          console.log('  node cache-invalidator.js prewarm [urls]   - Prewarm cache with URLs');
          console.log('  node cache-invalidator.js health           - Check cache layer health');
          console.log('  node cache-invalidator.js cloudfront [paths] - CloudFront only');
          console.log('  node cache-invalidator.js cloudflare       - Cloudflare only');
          console.log('  node cache-invalidator.js redis            - Redis only');
          console.log('  node cache-invalidator.js app              - Application cache only');
          console.log('');
          console.log('Available selective patterns:');
          console.log(' ', Object.keys(invalidator.config.patterns).join(', '));
          break;
      }
    } finally {
      await invalidator.cleanup();
    }
  };

  runCommand().catch(error => {
    console.error(chalk.red('❌ Command failed:'), error.message);
    process.exit(1);
  });
}

module.exports = CacheInvalidator;