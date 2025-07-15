# 🚀 Deployment Setup Guide

## Overview

This guide covers the complete setup and deployment process for the StoryPlatform application, including testing automation, deployment pipelines, and production configurations.

## 📋 Prerequisites

### Required Software
- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker** >= 20.x
- **kubectl** >= 1.28
- **Terraform** >= 1.6
- **Git** >= 2.x

### Required Accounts & Services
- **AWS Account** with appropriate permissions
- **GitHub** repository access
- **Docker Registry** access (GitHub Container Registry)
- **Domain** for production deployment
- **SSL Certificate** (Let's Encrypt or AWS Certificate Manager)

### Optional Services
- **Cloudflare** account for CDN
- **DataDog** for monitoring
- **PagerDuty** for alerting
- **Slack** for notifications

## 🔧 Local Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/storyplatform.git
cd storyplatform

# Install dependencies
npm ci

# Install development tools
npm install -g @playwright/test
npm install -g jest
```

### 2. Environment Configuration

Create environment files for different stages:

```bash
# Copy example environment files
cp .env.example .env.local
cp .env.test.example .env.test
cp .env.staging.example .env.staging
cp .env.production.example .env.production
```

Fill in the required environment variables:

```bash
# .env.local
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/storyplatform_dev
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-32-character-secret-key-here
JWT_SECRET=your-32-character-jwt-secret-here
```

### 3. Database Setup

```bash
# Start PostgreSQL and Redis (using Docker)
docker-compose up -d postgres redis

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 4. Verify Local Setup

```bash
# Run tests
npm test

# Start development server
npm run dev

# Verify application is running
curl http://localhost:3000/health
```

## 🧪 Testing Setup

### Unit Tests Configuration

```bash
# Install testing dependencies
npm install --save-dev jest supertest

# Configure Jest
npm run test:unit

# Run with coverage
npm run test:coverage
```

### Integration Tests Setup

```bash
# Set up test database
createdb storyplatform_test
npm run db:migrate:test

# Run integration tests
npm run test:integration
```

### End-to-End Tests Setup

```bash
# Install Playwright
npx playwright install

# Configure E2E environment
cp .env.e2e.example .env.e2e

# Run E2E tests
npm run test:e2e
```

### Accessibility Tests Setup

```bash
# Install accessibility testing tools
npm install --save-dev axe-playwright

# Run accessibility tests
npm run test:a11y
```

## ☁️ Cloud Infrastructure Setup

### 1. AWS Configuration

#### S3 Buckets
```bash
# Create S3 buckets
aws s3 mb s3://storyplatform-static-assets
aws s3 mb s3://storyplatform-user-uploads
aws s3 mb s3://storyplatform-backups

# Configure bucket policies
aws s3api put-bucket-policy --bucket storyplatform-static-assets --policy file://s3-bucket-policy.json
```

#### RDS Database
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier storyplatform-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username storyplatform \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 100 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --backup-retention-period 7 \
  --multi-az
```

#### ElastiCache Redis
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id storyplatform-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxxxxxx
```

### 2. Kubernetes Cluster Setup

```bash
# Create EKS cluster
eksctl create cluster \
  --name storyplatform-production \
  --region us-east-1 \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name storyplatform-production
```

### 3. Terraform Infrastructure

```bash
# Initialize Terraform
cd infrastructure/production
terraform init

# Plan infrastructure
terraform plan -var-file="production.tfvars"

# Apply infrastructure
terraform apply -var-file="production.tfvars"
```

## 🔐 Security Setup

### 1. SSL/TLS Configuration

#### Using AWS Certificate Manager
```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name storyplatform.com \
  --subject-alternative-names "*.storyplatform.com" \
  --validation-method DNS
```

#### Using Let's Encrypt
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d storyplatform.com -d www.storyplatform.com
```

### 2. Secrets Management

#### GitHub Secrets
Configure the following secrets in your GitHub repository:

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_S3_BUCKET
AWS_CLOUDFRONT_DISTRIBUTION_ID

DATABASE_URL
REDIS_URL
SESSION_SECRET
JWT_SECRET

DOCKER_REGISTRY_TOKEN
SLACK_WEBHOOK_URL
DATADOG_API_KEY
PAGERDUTY_INTEGRATION_KEY
```

#### Kubernetes Secrets
```bash
# Create database secret
kubectl create secret generic db-credentials \
  --from-literal=username=storyplatform \
  --from-literal=password=YourSecurePassword123!

# Create application secrets
kubectl create secret generic app-secrets \
  --from-literal=session-secret=your-32-character-secret \
  --from-literal=jwt-secret=your-32-character-jwt-secret
```

## 🚀 Deployment Pipeline Setup

### 1. GitHub Actions Configuration

The deployment pipelines are automatically configured through the workflow files:

- `.github/workflows/deploy-staging.yml` - Staging deployment
- `.github/workflows/deploy-production.yml` - Production deployment

### 2. Environment Configuration

#### Staging Environment
```bash
# Configure staging namespace
kubectl create namespace staging

# Apply staging configurations
kubectl apply -f k8s/staging/ -n staging
```

#### Production Environment
```bash
# Configure production namespace
kubectl create namespace production

# Apply production configurations
kubectl apply -f k8s/production/ -n production
```

### 3. Database Migrations

```bash
# Production migration (run manually first time)
kubectl exec -n production deployment/storyplatform-app -- npm run db:migrate

# Verify migration
kubectl exec -n production deployment/storyplatform-app -- npm run db:status
```

## 📊 Monitoring Setup

### 1. Health Checks

Configure health check endpoints:

```bash
# Application health check
curl https://app.storyplatform.com/health

# API health check
curl https://api.storyplatform.com/api/health

# Database connectivity check
curl https://api.storyplatform.com/api/status/database
```

### 2. Logging Configuration

```yaml
# Configure log aggregation
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [INPUT]
        Name tail
        Path /var/log/containers/*storyplatform*.log
        Parser docker
        Tag kube.*
```

### 3. Metrics and Alerting

#### Prometheus Configuration
```yaml
# prometheus-config.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'storyplatform'
    static_configs:
      - targets: ['storyplatform-app:3000']
    metrics_path: '/metrics'
```

#### Grafana Dashboards
Import the pre-configured dashboards from `/monitoring/grafana/dashboards/`

## 🔄 Deployment Process

### Staging Deployment

Staging deployments are triggered automatically on:
- Push to `develop` branch
- Pull requests to `develop`

```bash
# Manual staging deployment
git push origin feature/my-feature

# Check deployment status
kubectl get pods -n staging
kubectl logs -f deployment/storyplatform-app -n staging
```

### Production Deployment

Production deployments are triggered on:
- Push to `main` branch
- Git tags matching `v*`

```bash
# Production deployment via tag
git tag v1.2.3
git push origin v1.2.3

# Check deployment status
kubectl get pods -n production
kubectl logs -f deployment/storyplatform-app -n production
```

### Blue-Green Deployment

The production deployment uses blue-green strategy:

1. **Green Environment**: New version deployed to green pods
2. **Health Checks**: Comprehensive health verification
3. **Traffic Switch**: Route traffic from blue to green
4. **Monitoring**: Monitor for issues post-switch
5. **Cleanup**: Scale down blue environment

### Rollback Process

#### Automatic Rollback
```bash
# Automatic rollback triggers on:
# - Health check failures
# - Error rate spikes
# - Manual trigger via GitHub Actions
```

#### Manual Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/storyplatform-app -n production

# Rollback to specific revision
kubectl rollout undo deployment/storyplatform-app --to-revision=2 -n production

# Check rollback status
kubectl rollout status deployment/storyplatform-app -n production
```

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
kubectl exec -n production deployment/storyplatform-app -- \
  npx knex migrate:currentVersion

# Check database logs
kubectl logs -f deployment/postgres -n production
```

#### Redis Connection Issues
```bash
# Test Redis connectivity
kubectl exec -n production deployment/storyplatform-app -- \
  redis-cli -h redis-service ping

# Check Redis logs
kubectl logs -f deployment/redis -n production
```

#### Asset Loading Issues
```bash
# Check CDN configuration
curl -I https://cdn.storyplatform.com/static/css/main.css

# Invalidate CDN cache
node tools/deployment/cache-invalidator.js all
```

### Log Analysis

#### Application Logs
```bash
# View application logs
kubectl logs -f deployment/storyplatform-app -n production

# Search for errors
kubectl logs deployment/storyplatform-app -n production | grep ERROR

# View logs from specific time
kubectl logs --since=1h deployment/storyplatform-app -n production
```

#### Performance Monitoring
```bash
# Check resource usage
kubectl top pods -n production

# Check node resource usage
kubectl top nodes

# View detailed resource metrics
kubectl describe pod storyplatform-app-xxx -n production
```

## 📈 Performance Optimization

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_stories_published_at ON stories(published_at) WHERE status = 'published';
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_communities_slug ON communities(slug);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM stories WHERE status = 'published' ORDER BY published_at DESC LIMIT 20;
```

### Cache Optimization
```bash
# Optimize Redis memory usage
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Monitor cache hit rates
redis-cli INFO stats | grep keyspace_hits
```

### CDN Configuration
```bash
# Configure CloudFront caching rules
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json

# Optimize cache headers
# Static assets: Cache-Control: public, max-age=31536000, immutable
# API responses: Cache-Control: no-cache, no-store, must-revalidate
```

## 🔒 Security Hardening

### Network Security
```bash
# Configure security groups
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Enable VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxxxxxxxx \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs
```

### Application Security
```bash
# Update dependencies regularly
npm audit fix

# Run security scans
npm run security:scan

# Configure CSP headers
# Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

## 📚 Additional Resources

### Documentation
- [API Documentation](./api-documentation.md)
- [Database Schema](./database-schema.md)
- [Architecture Overview](./architecture.md)

### Monitoring Dashboards
- [Grafana Dashboard](https://grafana.storyplatform.com)
- [Application Metrics](https://app.storyplatform.com/admin/metrics)
- [Error Tracking](https://sentry.io/organizations/storyplatform)

### Support Contacts
- **DevOps Team**: devops@storyplatform.com
- **On-call Engineer**: +1-555-ON-CALL
- **Emergency Escalation**: emergency@storyplatform.com

## 🎯 Next Steps

1. **Complete Initial Setup**: Follow this guide to set up your environment
2. **Run Test Suite**: Ensure all tests pass before deployment
3. **Deploy to Staging**: Test the complete deployment pipeline
4. **Production Deployment**: Deploy to production with monitoring
5. **Monitor & Optimize**: Continuously monitor and optimize performance

For questions or issues, please refer to the [Troubleshooting Guide](./troubleshooting.md) or contact the DevOps team.