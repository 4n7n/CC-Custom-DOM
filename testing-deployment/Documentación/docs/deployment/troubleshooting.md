# 🔧 Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting steps for common issues encountered during testing, deployment, and production operations of the StoryPlatform application.

## 🚨 Emergency Procedures

### Production Down (P0)

**Immediate Actions (0-5 minutes):**
1. Check application health status
2. Verify traffic routing
3. Check recent deployments
4. Initiate rollback if needed

```bash
# Quick health check
curl -f https://app.storyplatform.com/health

# Check pod status
kubectl get pods -n production

# Check recent deployments
kubectl rollout history deployment/storyplatform-app -n production

# Emergency rollback
kubectl rollout undo deployment/storyplatform-app -n production
```

**Communication (5-10 minutes):**
1. Update status page
2. Notify stakeholders via Slack
3. Page on-call engineer if not already involved

### Database Issues (P1)

**Immediate Actions:**
1. Check database connectivity
2. Verify read/write operations
3. Check for blocking queries
4. Monitor connection pool

```bash
# Test database connection
kubectl exec -n production deployment/storyplatform-app -- \
  npx knex raw "SELECT 1"

# Check active connections
kubectl exec -n production deployment/postgres -- \
  psql -U storyplatform -d storyplatform_production -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check for blocking queries
kubectl exec -n production deployment/postgres -- \
  psql -U storyplatform -d storyplatform_production -c \
  "SELECT pid, query, state, query_start FROM pg_stat_activity WHERE state != 'idle';"
```

## 🧪 Testing Issues

### Unit Tests Failing

#### Common Causes & Solutions

**Test Database Issues:**
```bash
# Reset test database
npm run db:reset:test

# Check test database connection
npm run db:status:test

# Run specific test file
npm test -- tests/unit/story-engine.test.js

# Run tests with verbose output
npm test -- --verbose
```

**Mock Issues:**
```javascript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Reset modules if needed
beforeEach(() => {
  jest.resetModules();
});
```

**Timeout Issues:**
```javascript
// Increase timeout for slow tests
describe('Slow operations', () => {
  jest.setTimeout(30000); // 30 seconds
  
  test('long running operation', async () => {
    // test code
  });
});
```

### Integration Tests Failing

#### Service Dependencies
```bash
# Start required services
docker-compose up -d postgres redis

# Check service health
docker-compose ps

# View service logs
docker-compose logs postgres
docker-compose logs redis
```

#### Database State Issues
```bash
# Clean database between tests
npm run db:truncate:test

# Run migrations
npm run db:migrate:test

# Seed test data
npm run db:seed:test
```

#### Network Issues
```bash
# Check if ports are available
netstat -tulpn | grep :5432
netstat -tulpn | grep :6379

# Kill processes using ports
sudo lsof -ti:5432 | xargs kill -9
```

### E2E Tests Failing

#### Browser Issues
```bash
# Update Playwright browsers
npx playwright install

# Run with headed browser for debugging
npx playwright test --headed

# Generate test report
npx playwright show-report
```

#### Test Environment Issues
```bash
# Check application is running
curl http://localhost:3000/health

# Start application for E2E tests
npm run start:test

# Check test data setup
npm run e2e:setup
```

#### Flaky Tests
```javascript
// Add retry logic for flaky tests
test.describe.configure({ retries: 2 });

// Use proper waits instead of timeouts
await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' });
await page.waitForLoadState('networkidle');

// Add proper cleanup
test.afterEach(async ({ page }) => {
  await page.close();
});
```

### Accessibility Tests Failing

#### Common WCAG Violations
```bash
# Run accessibility tests with detailed output
npm run test:a11y -- --verbose

# Test specific components
npm run test:a11y -- --match="navigation"

# Generate accessibility report
npm run test:a11y:report
```

**Color Contrast Issues:**
```css
/* Fix low contrast text */
.text-primary {
  color: #0066cc; /* Ensure 4.5:1 contrast ratio */
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .text-primary {
    color: #000000;
    background-color: #ffffff;
  }
}
```

**Missing Labels:**
```html
<!-- Add proper labels -->
<label for="email">Email Address</label>
<input id="email" type="email" required>

<!-- Or use aria-label -->
<input type="search" aria-label="Search stories">

<!-- Associate error messages -->
<input id="password" aria-describedby="password-error">
<div id="password-error" role="alert">Password is required</div>
```

**Keyboard Navigation:**
```javascript
// Ensure focusable elements are accessible
test('keyboard navigation', async ({ page }) => {
  await page.keyboard.press('Tab');
  const focused = await page.locator(':focus');
  await expect(focused).toBeVisible();
});
```

## 🚀 Deployment Issues

### GitHub Actions Failures

#### Authentication Issues
```bash
# Check GitHub secrets are configured
# Required secrets:
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - DOCKER_REGISTRY_TOKEN
# - SLACK_WEBHOOK_URL
```

#### Build Failures
```yaml
# Debug build step
- name: Debug Build
  run: |
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    npm ci --verbose
    npm run build --verbose
```

#### Test Failures in CI
```yaml
# Add test debugging
- name: Run Tests with Debug
  run: |
    npm test -- --verbose --detectOpenHandles
  env:
    DEBUG: '*'
    NODE_ENV: test
```

#### Docker Build Issues
```dockerfile
# Debug Docker build
RUN echo "Node version: $(node --version)"
RUN echo "NPM version: $(npm --version)"
RUN ls -la /app/
RUN npm ci --verbose
```

### Infrastructure Deployment Issues

#### Terraform Failures
```bash
# Debug Terraform plan
terraform plan -detailed-exitcode

# Check Terraform state
terraform state list

# Import existing resources if needed
terraform import aws_s3_bucket.assets storyplatform-assets

# Refresh state
terraform refresh
```

#### Kubernetes Deployment Issues
```bash
# Check pod status
kubectl get pods -n production -o wide

# Describe problematic pods
kubectl describe pod <pod-name> -n production

# Check pod logs
kubectl logs <pod-name> -n production --previous

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'
```

#### Network Issues
```bash
# Test service connectivity
kubectl exec -n production deployment/storyplatform-app -- \
  curl -f http://postgres-service:5432

# Check DNS resolution
kubectl exec -n production deployment/storyplatform-app -- \
  nslookup postgres-service

# Test external connectivity
kubectl exec -n production deployment/storyplatform-app -- \
  curl -f https://api.github.com
```

### Database Migration Issues

#### Migration Failures
```bash
# Check migration status
npm run db:status

# Roll back failed migration
npm run db:rollback

# Run specific migration
npx knex migrate:up 001_create_users_table.js

# Check database locks
SELECT * FROM pg_locks WHERE NOT granted;
```

#### Performance Issues During Migration
```sql
-- Create indexes concurrently to avoid locks
CREATE INDEX CONCURRENTLY idx_stories_published_at ON stories(published_at);

-- Use smaller batches for large updates
UPDATE stories SET updated_at = NOW() 
WHERE id IN (SELECT id FROM stories LIMIT 1000);
```

## 🖥️ Production Issues

### Application Performance

#### High Memory Usage
```bash
# Check memory usage
kubectl top pods -n production

# Generate heap dump
kubectl exec -n production deployment/storyplatform-app -- \
  node --inspect --heap-prof index.js

# Monitor memory leaks
kubectl exec -n production deployment/storyplatform-app -- \
  node --trace-gc index.js
```

#### High CPU Usage
```bash
# Check CPU usage
kubectl top nodes
kubectl top pods -n production

# Profile CPU usage
kubectl exec -n production deployment/storyplatform-app -- \
  node --prof index.js

# Analyze profile
node --prof-process isolate-*-v8.log > processed.txt
```

#### Slow Database Queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s

-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
AND correlation < 0.1;
```

### Cache Issues

#### Redis Connection Problems
```bash
# Test Redis connectivity
kubectl exec -n production deployment/storyplatform-app -- \
  redis-cli -h redis-service ping

# Check Redis memory usage
kubectl exec -n production deployment/redis -- \
  redis-cli INFO memory

# Monitor Redis logs
kubectl logs -f deployment/redis -n production
```

#### Cache Invalidation Issues
```bash
# Manually invalidate cache
node tools/deployment/cache-invalidator.js all

# Check cache hit rates
kubectl exec -n production deployment/redis -- \
  redis-cli INFO stats | grep keyspace

# Clear specific cache patterns
kubectl exec -n production deployment/redis -- \
  redis-cli --scan --pattern "storyplatform:stories:*" | xargs redis-cli DEL
```

### CDN and Asset Issues

#### CloudFront Issues
```bash
# Check distribution status
aws cloudfront get-distribution --id EDFDVBD6EXAMPLE

# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id EDFDVBD6EXAMPLE \
  --paths "/*"

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id EDFDVBD6EXAMPLE \
  --id I1EXAMPLE
```

#### S3 Upload Issues
```bash
# Test S3 connectivity
aws s3 ls s3://storyplatform-uploads/

# Check bucket permissions
aws s3api get-bucket-policy --bucket storyplatform-uploads

# Upload test file
echo "test" | aws s3 cp - s3://storyplatform-uploads/test.txt
```

### SSL/TLS Issues

#### Certificate Problems
```bash
# Check certificate expiry
echo | openssl s_client -servername app.storyplatform.com \
  -connect app.storyplatform.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Verify certificate chain
openssl s_client -connect app.storyplatform.com:443 \
  -showcerts </dev/null

# Check SSL configuration
curl -I https://app.storyplatform.com
```

#### Mixed Content Issues
```bash
# Check for mixed content
curl -s https://app.storyplatform.com | \
  grep -i "http://"

# Verify security headers
curl -I https://app.storyplatform.com | \
  grep -E "(Strict-Transport-Security|X-Content-Type-Options)"
```

## 📊 Monitoring and Logging

### Log Analysis

#### Application Logs
```bash
# View recent application logs
kubectl logs --since=1h deployment/storyplatform-app -n production

# Search for errors
kubectl logs deployment/storyplatform-app -n production | \
  grep -E "(ERROR|FATAL|Exception)"

# Follow live logs
kubectl logs -f deployment/storyplatform-app -n production

# Export logs for analysis
kubectl logs deployment/storyplatform-app -n production \
  --since=24h > app-logs.txt
```

#### Database Logs
```bash
# Check PostgreSQL logs
kubectl logs deployment/postgres -n production | \
  grep -E "(ERROR|FATAL|PANIC)"

# Check slow query logs
kubectl exec -n production deployment/postgres -- \
  tail -f /var/log/postgresql/postgresql.log
```

#### System Logs
```bash
# Check node logs
kubectl describe node <node-name>

# Check system events
kubectl get events --all-namespaces --sort-by='.lastTimestamp'

# Check resource usage
kubectl describe pod <pod-name> -n production
```

### Metrics Analysis

#### Application Metrics
```bash
# Check application metrics endpoint
curl https://app.storyplatform.com/metrics

# Query Prometheus metrics
curl -G 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=up{job="storyplatform"}'
```

#### Database Metrics
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('storyplatform_production'));

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check connection count
SELECT count(*) FROM pg_stat_activity;
```

## 🔧 Common Error Solutions

### "Database connection failed"
```bash
# Check database service
kubectl get svc postgres -n production

# Test connectivity
kubectl exec -n production deployment/storyplatform-app -- \
  telnet postgres-service 5432

# Check credentials
kubectl get secret db-credentials -n production -o yaml

# Verify connection string
echo $DATABASE_URL
```

### "Redis connection timeout"
```bash
# Check Redis service
kubectl get svc redis -n production

# Test Redis connectivity
kubectl exec -n production deployment/storyplatform-app -- \
  timeout 5 redis-cli -h redis-service ping

# Check Redis configuration
kubectl exec -n production deployment/redis -- \
  redis-cli CONFIG GET timeout
```

### "S3 access denied"
```bash
# Check AWS credentials
aws sts get-caller-identity

# Test bucket access
aws s3 ls s3://storyplatform-uploads/

# Check IAM permissions
aws iam get-role-policy --role-name StoryPlatformS3Role \
  --policy-name S3AccessPolicy
```

### "CDN cache not updating"
```bash
# Force cache invalidation
node tools/deployment/cache-invalidator.js all

# Check cache headers
curl -I https://cdn.storyplatform.com/static/css/main.css

# Verify CDN configuration
aws cloudfront get-distribution-config \
  --id EDFDVBD6EXAMPLE
```

### "SSL certificate error"
```bash
# Check certificate validity
openssl s_client -connect app.storyplatform.com:443 \
  -servername app.storyplatform.com < /dev/null

# Verify DNS resolution
dig app.storyplatform.com

# Check certificate in AWS
aws acm list-certificates --region us-east-1
```

## 🆘 Escalation Procedures

### When to Escalate

**Immediate Escalation (P0):**
- Production completely down
- Data loss or corruption
- Security breach
- User data exposed

**Next Business Day (P1):**
- Significant performance degradation
- Non-critical feature failures
- Failed deployments blocking releases

**Standard Process (P2):**
- Minor bugs
- Enhancement requests
- Documentation updates

### Escalation Contacts

1. **Primary On-Call**: Check PagerDuty rotation
2. **DevOps Lead**: devops-lead@storyplatform.com
3. **Engineering Manager**: eng-manager@storyplatform.com
4. **CTO**: cto@storyplatform.com (P0 only)

### Incident Response

1. **Acknowledge**: Respond to alert within 5 minutes
2. **Assess**: Determine impact and severity
3. **Communicate**: Update status page and stakeholders
4. **Resolve**: Fix the issue or implement workaround
5. **Document**: Create post-incident review

## 📚 Additional Resources

### Documentation
- [Setup Guide](./setup-guide.md)
- [API Documentation](./api-docs.md)
- [Architecture Overview](./architecture.md)

### Monitoring Tools
- **Grafana**: https://grafana.storyplatform.com
- **Prometheus**: https://prometheus.storyplatform.com
- **Kibana**: https://kibana.storyplatform.com

### External Resources
- [Kubernetes Troubleshooting](https://kubernetes.io/docs/tasks/debug-application-cluster/)
- [PostgreSQL Performance](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis Best Practices](https://redis.io/topics/memory-optimization)

---

**Need Help?** 
- Slack: #devops-help
- Email: support@storyplatform.com
- Emergency: Page on-call via PagerDuty