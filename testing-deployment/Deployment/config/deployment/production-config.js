/**
 * Production Configuration
 * Centralized configuration management for production deployments
 */

const path = require('path');
const fs = require('fs');

class ProductionConfig {
  constructor() {
    this.environment = process.env.NODE_ENV || 'production';
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  loadConfiguration() {
    const baseConfig = {
      // Application Settings
      app: {
        name: 'StoryPlatform',
        version: process.env.APP_VERSION || this.getVersionFromPackage(),
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || '0.0.0.0',
        baseUrl: process.env.BASE_URL || 'https://app.storyplatform.com',
        apiUrl: process.env.API_URL || 'https://api.storyplatform.com',
        enableCluster: process.env.ENABLE_CLUSTER === 'true',
        workerCount: parseInt(process.env.WORKER_COUNT) || require('os').cpus().length
      },

      // Database Configuration
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || 'storyplatform_production',
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? {
          rejectUnauthorized: false,
          ca: process.env.DB_SSL_CA || undefined,
          cert: process.env.DB_SSL_CERT || undefined,
          key: process.env.DB_SSL_KEY || undefined
        } : false,
        pool: {
          min: parseInt(process.env.DB_POOL_MIN) || 5,
          max: parseInt(process.env.DB_POOL_MAX) || 20,
          acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 30000,
          idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 600000
        },
        migrations: {
          directory: './database/migrations',
          tableName: 'knex_migrations'
        }
      },

      // Redis Configuration
      redis: {
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        keepAlive: 30000,
        maxmemoryPolicy: 'allkeys-lru',
        cluster: process.env.REDIS_CLUSTER === 'true' ? {
          enableReadyCheck: false,
          redisOptions: {
            password: process.env.REDIS_PASSWORD
          }
        } : null
      },

      // Cache Configuration
      cache: {
        defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 3600, // 1 hour
        maxTTL: parseInt(process.env.CACHE_MAX_TTL) || 86400, // 24 hours
        keyPrefix: process.env.CACHE_KEY_PREFIX || 'storyplatform:',
        compression: process.env.CACHE_COMPRESSION === 'true',
        layers: {
          memory: {
            enabled: true,
            maxSize: parseInt(process.env.MEMORY_CACHE_SIZE) || 100,
            ttl: parseInt(process.env.MEMORY_CACHE_TTL) || 300 // 5 minutes
          },
          redis: {
            enabled: true,
            ttl: parseInt(process.env.REDIS_CACHE_TTL) || 3600 // 1 hour
          },
          cdn: {
            enabled: true,
            ttl: parseInt(process.env.CDN_CACHE_TTL) || 86400 // 24 hours
          }
        }
      },

      // Session Configuration
      session: {
        secret: process.env.SESSION_SECRET,
        name: process.env.SESSION_NAME || 'storyplatform.sid',
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 hours
        secure: process.env.SESSION_SECURE !== 'false',
        httpOnly: true,
        sameSite: 'strict',
        store: 'redis',
        rolling: true
      },

      // JWT Configuration
      jwt: {
        secret: process.env.JWT_SECRET,
        accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
        refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
        issuer: process.env.JWT_ISSUER || 'storyplatform.com',
        audience: process.env.JWT_AUDIENCE || 'storyplatform-users',
        algorithm: 'HS256'
      },

      // Security Configuration
      security: {
        cors: {
          origin: this.parseCorsOrigins(process.env.CORS_ORIGINS),
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        },
        helmet: {
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'https:'],
              scriptSrc: ["'self'"],
              connectSrc: ["'self'", 'https://api.storyplatform.com'],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"]
            }
          },
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
          }
        },
        rateLimiting: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
          max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
          standardHeaders: true,
          legacyHeaders: false,
          skipSuccessfulRequests: false
        },
        encryption: {
          algorithm: 'aes-256-gcm',
          keyDerivation: 'pbkdf2',
          iterations: 100000
        }
      },

      // AWS Configuration
      aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        s3: {
          bucket: process.env.AWS_S3_BUCKET,
          uploadBucket: process.env.AWS_S3_UPLOAD_BUCKET,
          region: process.env.AWS_S3_REGION || process.env.AWS_REGION,
          signedUrlExpires: parseInt(process.env.S3_SIGNED_URL_EXPIRES) || 3600
        },
        cloudfront: {
          distributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID,
          domain: process.env.AWS_CLOUDFRONT_DOMAIN
        },
        ses: {
          region: process.env.AWS_SES_REGION || process.env.AWS_REGION,
          fromEmail: process.env.AWS_SES_FROM_EMAIL,
          replyToEmail: process.env.AWS_SES_REPLY_TO_EMAIL
        }
      },

      // CDN Configuration
      cdn: {
        enabled: process.env.CDN_ENABLED === 'true',
        baseUrl: process.env.CDN_BASE_URL,
        staticAssetsUrl: process.env.CDN_STATIC_URL,
        uploadsUrl: process.env.CDN_UPLOADS_URL,
        cacheControl: {
          static: 'public, max-age=31536000, immutable',
          uploads: 'public, max-age=86400',
          api: 'no-cache, no-store, must-revalidate'
        }
      },

      // Email Configuration
      email: {
        provider: process.env.EMAIL_PROVIDER || 'aws-ses',
        fromAddress: process.env.EMAIL_FROM_ADDRESS,
        fromName: process.env.EMAIL_FROM_NAME || 'StoryPlatform',
        replyToAddress: process.env.EMAIL_REPLY_TO_ADDRESS,
        templates: {
          welcome: process.env.EMAIL_TEMPLATE_WELCOME,
          passwordReset: process.env.EMAIL_TEMPLATE_PASSWORD_RESET,
          emailVerification: process.env.EMAIL_TEMPLATE_EMAIL_VERIFICATION
        },
        smtp: process.env.EMAIL_PROVIDER === 'smtp' ? {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        } : null
      },

      // Search Configuration
      search: {
        provider: process.env.SEARCH_PROVIDER || 'elasticsearch',
        elasticsearch: {
          node: process.env.ELASTICSEARCH_URL,
          auth: process.env.ELASTICSEARCH_AUTH ? {
            username: process.env.ELASTICSEARCH_USERNAME,
            password: process.env.ELASTICSEARCH_PASSWORD
          } : undefined,
          maxRetries: 3,
          requestTimeout: 30000,
          sniffOnStart: true
        },
        algolia: process.env.SEARCH_PROVIDER === 'algolia' ? {
          applicationId: process.env.ALGOLIA_APP_ID,
          apiKey: process.env.ALGOLIA_API_KEY,
          indexName: process.env.ALGOLIA_INDEX_NAME
        } : null
      },

      // Analytics Configuration
      analytics: {
        googleAnalytics: {
          trackingId: process.env.GA_TRACKING_ID,
          enabled: process.env.GA_ENABLED === 'true'
        },
        mixpanel: {
          token: process.env.MIXPANEL_TOKEN,
          enabled: process.env.MIXPANEL_ENABLED === 'true'
        },
        hotjar: {
          siteId: process.env.HOTJAR_SITE_ID,
          enabled: process.env.HOTJAR_ENABLED === 'true'
        }
      },

      // Payment Configuration
      payments: {
        stripe: {
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
          secretKey: process.env.STRIPE_SECRET_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
          enabled: process.env.STRIPE_ENABLED === 'true'
        },
        paypal: {
          clientId: process.env.PAYPAL_CLIENT_ID,
          clientSecret: process.env.PAYPAL_CLIENT_SECRET,
          environment: process.env.PAYPAL_ENVIRONMENT || 'live',
          enabled: process.env.PAYPAL_ENABLED === 'true'
        }
      },

      // Social Authentication
      social: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          enabled: process.env.GOOGLE_AUTH_ENABLED === 'true'
        },
        facebook: {
          appId: process.env.FACEBOOK_APP_ID,
          appSecret: process.env.FACEBOOK_APP_SECRET,
          enabled: process.env.FACEBOOK_AUTH_ENABLED === 'true'
        },
        twitter: {
          consumerKey: process.env.TWITTER_CONSUMER_KEY,
          consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
          enabled: process.env.TWITTER_AUTH_ENABLED === 'true'
        }
      },

      // Monitoring Configuration
      monitoring: {
        healthCheck: {
          enabled: true,
          endpoint: '/health',
          interval: 30000
        },
        metrics: {
          enabled: process.env.METRICS_ENABLED === 'true',
          provider: process.env.METRICS_PROVIDER || 'prometheus',
          endpoint: process.env.METRICS_ENDPOINT || '/metrics'
        },
        logging: {
          level: process.env.LOG_LEVEL || 'info',
          format: process.env.LOG_FORMAT || 'json',
          destination: process.env.LOG_DESTINATION || 'stdout',
          maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
          maxSize: process.env.LOG_MAX_SIZE || '10m'
        },
        tracing: {
          enabled: process.env.TRACING_ENABLED === 'true',
          jaeger: {
            endpoint: process.env.JAEGER_ENDPOINT,
            serviceName: 'storyplatform-api'
          }
        },
        alerts: {
          slack: {
            webhookUrl: process.env.SLACK_WEBHOOK_URL,
            channel: process.env.SLACK_ALERTS_CHANNEL || '#alerts'
          },
          pagerduty: {
            integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY
          }
        }
      },

      // File Upload Configuration
      uploads: {
        maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE) || 10485760, // 10MB
        allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
        storage: process.env.UPLOAD_STORAGE || 's3',
        local: {
          directory: process.env.UPLOAD_LOCAL_DIR || './uploads',
          urlPrefix: process.env.UPLOAD_LOCAL_URL_PREFIX || '/uploads'
        },
        processing: {
          imageOptimization: process.env.IMAGE_OPTIMIZATION === 'true',
          generateThumbnails: process.env.GENERATE_THUMBNAILS === 'true',
          thumbnailSizes: (process.env.THUMBNAIL_SIZES || '150x150,300x300,600x600').split(',')
        }
      },

      // API Configuration
      api: {
        version: process.env.API_VERSION || 'v1',
        prefix: process.env.API_PREFIX || '/api',
        documentation: {
          enabled: process.env.API_DOCS_ENABLED === 'true',
          path: process.env.API_DOCS_PATH || '/docs'
        },
        pagination: {
          defaultLimit: parseInt(process.env.API_DEFAULT_LIMIT) || 20,
          maxLimit: parseInt(process.env.API_MAX_LIMIT) || 100
        },
        versioning: {
          strategy: process.env.API_VERSIONING_STRATEGY || 'header',
          header: process.env.API_VERSION_HEADER || 'X-API-Version'
        }
      },

      // Feature Flags
      features: {
        userRegistration: process.env.FEATURE_USER_REGISTRATION !== 'false',
        socialLogin: process.env.FEATURE_SOCIAL_LOGIN === 'true',
        premiumFeatures: process.env.FEATURE_PREMIUM === 'true',
        contentModeration: process.env.FEATURE_CONTENT_MODERATION === 'true',
        aiRecommendations: process.env.FEATURE_AI_RECOMMENDATIONS === 'true',
        realTimeNotifications: process.env.FEATURE_REALTIME_NOTIFICATIONS === 'true',
        betaFeatures: process.env.FEATURE_BETA === 'true'
      },

      // Performance Configuration
      performance: {
        compression: {
          enabled: process.env.COMPRESSION_ENABLED !== 'false',
          level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
          threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024
        },
        clustering: {
          enabled: process.env.CLUSTERING_ENABLED === 'true',
          workers: parseInt(process.env.CLUSTER_WORKERS) || require('os').cpus().length
        },
        caching: {
          strategy: process.env.CACHE_STRATEGY || 'redis',
          ttl: parseInt(process.env.CACHE_TTL) || 3600
        }
      },

      // Deployment Configuration
      deployment: {
        strategy: process.env.DEPLOYMENT_STRATEGY || 'blue-green',
        environment: this.environment,
        version: process.env.DEPLOYMENT_VERSION || this.getVersionFromPackage(),
        buildNumber: process.env.BUILD_NUMBER,
        deploymentId: process.env.DEPLOYMENT_ID,
        rollback: {
          enabled: process.env.ROLLBACK_ENABLED === 'true',
          strategy: process.env.ROLLBACK_STRATEGY || 'immediate',
          healthCheckUrl: process.env.ROLLBACK_HEALTH_CHECK_URL || '/health'
        }
      }
    };

    // Environment-specific overrides
    const envConfigPath = path.join(__dirname, `${this.environment}.config.js`);
    if (fs.existsSync(envConfigPath)) {
      const envConfig = require(envConfigPath);
      return this.mergeConfigs(baseConfig, envConfig);
    }

    return baseConfig;
  }

  validateConfiguration() {
    const requiredVars = [
      'DB_HOST',
      'DB_USERNAME', 
      'DB_PASSWORD',
      'REDIS_URL',
      'SESSION_SECRET',
      'JWT_SECRET'
    ];

    const missing = requiredVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate database configuration
    if (!this.config.database.host || !this.config.database.username || !this.config.database.password) {
      throw new Error('Database configuration is incomplete');
    }

    // Validate JWT configuration
    if (!this.config.jwt.secret || this.config.jwt.secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }

    // Validate session configuration
    if (!this.config.session.secret || this.config.session.secret.length < 32) {
      throw new Error('Session secret must be at least 32 characters long');
    }

    // Validate AWS configuration if enabled
    if (this.config.cdn.enabled && !this.config.aws.s3.bucket) {
      throw new Error('S3 bucket configuration required when CDN is enabled');
    }

    // Validate email configuration
    if (!this.config.email.fromAddress) {
      console.warn('Warning: Email from address not configured');
    }

    // Validate production-specific requirements
    if (this.environment === 'production') {
      this.validateProductionRequirements();
    }
  }

  validateProductionRequirements() {
    const productionRequirements = [
      { key: 'security.cors.origin', message: 'CORS origins must be configured for production' },
      { key: 'monitoring.alerts.slack.webhookUrl', message: 'Slack webhook URL should be configured for alerts' },
      { key: 'aws.s3.bucket', message: 'S3 bucket should be configured for file storage' }
    ];

    const warnings = [];
    const errors = [];

    productionRequirements.forEach(req => {
      const value = this.getNestedConfig(req.key);
      if (!value) {
        if (req.key.includes('alerts')) {
          warnings.push(req.message);
        } else {
          errors.push(req.message);
        }
      }
    });

    if (errors.length > 0) {
      throw new Error(`Production configuration errors: ${errors.join(', ')}`);
    }

    if (warnings.length > 0) {
      console.warn('Production configuration warnings:', warnings.join(', '));
    }

    // Validate SSL configuration
    if (!this.config.session.secure) {
      console.warn('Warning: Session cookies should be secure in production');
    }

    // Validate security headers
    if (!this.config.security.helmet.hsts) {
      console.warn('Warning: HSTS should be enabled in production');
    }
  }

  getNestedConfig(keyPath) {
    return keyPath.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  parseCorsOrigins(originsString) {
    if (!originsString) {
      return this.environment === 'production' ? false : true;
    }
    
    if (originsString === '*') {
      return true;
    }
    
    return originsString.split(',').map(origin => origin.trim());
  }

  getVersionFromPackage() {
    try {
      const packagePath = path.join(__dirname, '../../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      return '1.0.0';
    }
  }

  mergeConfigs(base, override) {
    const result = { ...base };
    
    for (const key in override) {
      if (override.hasOwnProperty(key)) {
        if (typeof override[key] === 'object' && override[key] !== null && !Array.isArray(override[key])) {
          result[key] = this.mergeConfigs(base[key] || {}, override[key]);
        } else {
          result[key] = override[key];
        }
      }
    }
    
    return result;
  }

  // Configuration getters
  get(keyPath, defaultValue = undefined) {
    const value = this.getNestedConfig(keyPath);
    return value !== undefined ? value : defaultValue;
  }

  getDatabaseConfig() {
    return {
      client: 'postgresql',
      connection: {
        host: this.config.database.host,
        port: this.config.database.port,
        database: this.config.database.name,
        user: this.config.database.username,
        password: this.config.database.password,
        ssl: this.config.database.ssl
      },
      pool: this.config.database.pool,
      migrations: this.config.database.migrations,
      acquireConnectionTimeout: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    };
  }

  getRedisConfig() {
    if (this.config.redis.url) {
      return {
        url: this.config.redis.url,
        maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
        retryDelayOnFailover: this.config.redis.retryDelayOnFailover,
        lazyConnect: this.config.redis.lazyConnect,
        keepAlive: this.config.redis.keepAlive
      };
    }

    return {
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
      retryDelayOnFailover: this.config.redis.retryDelayOnFailover,
      lazyConnect: this.config.redis.lazyConnect,
      keepAlive: this.config.redis.keepAlive
    };
  }

  getSecurityConfig() {
    return {
      cors: this.config.security.cors,
      helmet: this.config.security.helmet,
      rateLimiting: this.config.security.rateLimiting,
      session: {
        ...this.config.session,
        store: this.getRedisConfig()
      }
    };
  }

  getMonitoringConfig() {
    return this.config.monitoring;
  }

  // Health check functionality
  async performHealthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: this.config.app.version,
      environment: this.environment,
      checks: {}
    };

    try {
      // Database health check
      health.checks.database = await this.checkDatabase();
      
      // Redis health check
      health.checks.redis = await this.checkRedis();
      
      // External services health check
      health.checks.external = await this.checkExternalServices();
      
      // Memory usage check
      health.checks.memory = this.checkMemoryUsage();
      
      // Disk usage check
      health.checks.disk = await this.checkDiskUsage();

      // Determine overall health
      const failedChecks = Object.values(health.checks).filter(check => check.status !== 'healthy');
      if (failedChecks.length > 0) {
        health.status = failedChecks.some(check => check.critical) ? 'unhealthy' : 'degraded';
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  async checkDatabase() {
    try {
      const knex = require('knex')(this.getDatabaseConfig());
      await knex.raw('SELECT 1');
      await knex.destroy();
      
      return {
        status: 'healthy',
        message: 'Database connection successful',
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error.message}`,
        critical: true
      };
    }
  }

  async checkRedis() {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(this.getRedisConfig());
      
      await redis.ping();
      await redis.quit();
      
      return {
        status: 'healthy',
        message: 'Redis connection successful'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis connection failed: ${error.message}`,
        critical: false
      };
    }
  }

  async checkExternalServices() {
    const services = [];
    
    // Check S3 if configured
    if (this.config.aws.s3.bucket) {
      try {
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({ region: this.config.aws.region });
        await s3.headBucket({ Bucket: this.config.aws.s3.bucket }).promise();
        services.push({ name: 'S3', status: 'healthy' });
      } catch (error) {
        services.push({ name: 'S3', status: 'unhealthy', error: error.message });
      }
    }

    // Check Elasticsearch if configured
    if (this.config.search.elasticsearch.node) {
      try {
        const { Client } = require('@elastic/elasticsearch');
        const client = new Client({ node: this.config.search.elasticsearch.node });
        await client.ping();
        services.push({ name: 'Elasticsearch', status: 'healthy' });
      } catch (error) {
        services.push({ name: 'Elasticsearch', status: 'unhealthy', error: error.message });
      }
    }

    const unhealthyServices = services.filter(s => s.status !== 'healthy');
    
    return {
      status: unhealthyServices.length === 0 ? 'healthy' : 'degraded',
      services: services,
      critical: false
    };
  }

  checkMemoryUsage() {
    const used = process.memoryUsage();
    const totalMB = Math.round(used.rss / 1024 / 1024);
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    
    const isHighMemory = totalMB > 512; // Alert if over 512MB
    
    return {
      status: isHighMemory ? 'warning' : 'healthy',
      memory: {
        rss: `${totalMB}MB`,
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`
      },
      critical: false
    };
  }

  async checkDiskUsage() {
    try {
      const fs = require('fs').promises;
      const stats = await fs.statfs('./');
      
      const totalGB = Math.round(stats.bavail * stats.frsize / 1024 / 1024 / 1024);
      const freeGB = Math.round(stats.bavail * stats.frsize / 1024 / 1024 / 1024);
      const usedPercent = Math.round((1 - freeGB / totalGB) * 100);
      
      const isHighDisk = usedPercent > 80;
      
      return {
        status: isHighDisk ? 'warning' : 'healthy',
        disk: {
          total: `${totalGB}GB`,
          free: `${freeGB}GB`,
          usedPercent: `${usedPercent}%`
        },
        critical: usedPercent > 95
      };
    } catch (error) {
      return {
        status: 'unknown',
        message: 'Could not check disk usage',
        critical: false
      };
    }
  }

  // Configuration export for other modules
  toJSON() {
    return this.config;
  }

  // Environment-specific configurations
  static createForEnvironment(environment) {
    process.env.NODE_ENV = environment;
    return new ProductionConfig();
  }
}

// Export singleton instance
const config = new ProductionConfig();

module.exports = config;
module.exports.ProductionConfig = ProductionConfig;