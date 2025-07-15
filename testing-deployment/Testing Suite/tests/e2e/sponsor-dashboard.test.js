const { chromium } = require('playwright');
const { expect } = require('@playwright/test');

describe('Sponsor Dashboard E2E Tests', () => {
  let browser;
  let context;
  let page;
  let sponsorCredentials;

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.DEBUG ? 100 : 0
    });

    // Set up test sponsor account
    sponsorCredentials = {
      email: 'sponsor@testcompany.com',
      password: 'SponsorPassword123!',
      companyName: 'Test Company Inc.'
    };
  });

  beforeEach(async () => {
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    page = await context.newPage();
    
    // Login as sponsor
    await page.goto(process.env.SPONSOR_APP_URL || 'http://localhost:3000/sponsor');
    await loginAsSponsor();
  });

  afterEach(async () => {
    await context.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  async function loginAsSponsor() {
    await page.click('[data-testid="sponsor-login"]');
    await page.fill('[data-testid="email-input"]', sponsorCredentials.email);
    await page.fill('[data-testid="password-input"]', sponsorCredentials.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="sponsor-dashboard"]')).toBeVisible();
  }

  describe('Dashboard Overview and Navigation', () => {
    test('should display comprehensive dashboard overview', async () => {
      // Check main dashboard elements
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="company-name"]')).toContainText(sponsorCredentials.companyName);
      
      // Verify key metrics are displayed
      await expect(page.locator('[data-testid="total-campaigns"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-spend"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-impressions"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-roas"]')).toBeVisible();

      // Check recent activity feed
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      
      // Verify performance charts are loaded
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="spend-chart"]')).toBeVisible();

      // Test navigation menu
      const navItems = [
        'dashboard',
        'campaigns', 
        'analytics',
        'audiences',
        'creatives',
        'billing',
        'settings'
      ];

      for (const item of navItems) {
        await expect(page.locator(`[data-testid="nav-${item}"]`)).toBeVisible();
      }

      // Test quick actions
      await expect(page.locator('[data-testid="create-campaign-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="view-analytics-button"]')).toBeVisible();
    });

    test('should provide real-time data updates', async () => {
      // Check initial metrics
      const initialImpressions = await page.textContent('[data-testid="total-impressions"]');
      const initialSpend = await page.textContent('[data-testid="total-spend"]');

      // Wait for auto-refresh or trigger manual refresh
      await page.click('[data-testid="refresh-data"]');
      await page.waitForTimeout(2000);

      // Verify data has been updated (in real scenario, would check for actual changes)
      await expect(page.locator('[data-testid="last-updated"]')).toBeVisible();
      
      // Check real-time notifications
      await expect(page.locator('[data-testid="notification-center"]')).toBeVisible();
    });

    test('should handle responsive dashboard layout', async () => {
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();
      await page.click('[data-testid="mobile-nav-toggle"]');
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();

      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check mobile-optimized dashboard cards
      await expect(page.locator('[data-testid="mobile-dashboard-cards"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-quick-actions"]')).toBeVisible();
    });
  });

  describe('Campaign Management Flow', () => {
    test('should create campaign with comprehensive setup', async () => {
      // Navigate to campaign creation
      await page.click('[data-testid="create-campaign-button"]');
      await page.waitForLoadState('networkidle');

      // Step 1: Campaign basics
      await expect(page.locator('[data-testid="campaign-setup-step-1"]')).toBeVisible();
      
      await page.fill('[data-testid="campaign-name"]', 'E2E Test Campaign');
      await page.selectOption('[data-testid="campaign-type"]', 'sponsored_content');
      await page.fill('[data-testid="campaign-description"]', 'Test campaign for E2E testing');

      await page.click('[data-testid="next-step"]');

      // Step 2: Budget and scheduling
      await expect(page.locator('[data-testid="campaign-setup-step-2"]')).toBeVisible();
      
      await page.fill('[data-testid="total-budget"]', '5000');
      await page.fill('[data-testid="daily-budget"]', '250');
      
      // Set campaign dates
      await page.click('[data-testid="start-date"]');
      await page.click('[data-testid="date-tomorrow"]'); // Tomorrow
      
      await page.click('[data-testid="end-date"]');
      await page.click('[data-testid="date-next-month"]'); // Next month

      await page.click('[data-testid="next-step"]');

      // Step 3: Audience targeting
      await expect(page.locator('[data-testid="campaign-setup-step-3"]')).toBeVisible();
      
      // Demographics
      await page.selectOption('[data-testid="age-min"]', '25');
      await page.selectOption('[data-testid="age-max"]', '45');
      await page.check('[data-testid="gender-all"]');

      // Location targeting
      await page.click('[data-testid="add-location"]');
      await page.fill('[data-testid="location-search"]', 'United States');
      await page.click('[data-testid="location-united-states"]');

      // Interest targeting
      const interests = ['technology', 'business', 'innovation'];
      for (const interest of interests) {
        await page.click(`[data-testid="interest-${interest}"]`);
      }

      await page.click('[data-testid="next-step"]');

      // Step 4: Creative assets
      await expect(page.locator('[data-testid="campaign-setup-step-4"]')).toBeVisible();
      
      // Upload banner
      await page.setInputFiles('[data-testid="banner-upload"]', {
        name: 'banner.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-banner-data')
      });

      await expect(page.locator('[data-testid="banner-preview"]')).toBeVisible();

      // Add ad copy
      await page.fill('[data-testid="headline"]', 'Revolutionary Business Solution');
      await page.fill('[data-testid="description"]', 'Transform your workflow with our cutting-edge platform');
      await page.fill('[data-testid="cta-text"]', 'Learn More');
      await page.fill('[data-testid="landing-url"]', 'https://testcompany.com/landing');

      await page.click('[data-testid="next-step"]');

      // Step 5: Review and launch
      await expect(page.locator('[data-testid="campaign-setup-step-5"]')).toBeVisible();
      
      // Review campaign details
      await expect(page.locator('[data-testid="review-name"]')).toContainText('E2E Test Campaign');
      await expect(page.locator('[data-testid="review-budget"]')).toContainText('$5,000');
      await expect(page.locator('[data-testid="review-targeting"]')).toContainText('United States');

      // Launch campaign
      await page.click('[data-testid="launch-campaign"]');
      
      // Verify success
      await expect(page.locator('[data-testid="campaign-created-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="campaign-status"]')).toContainText('Active');
    });

    test('should manage existing campaigns effectively', async () => {
      // Navigate to campaigns list
      await page.click('[data-testid="nav-campaigns"]');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="campaigns-list"]')).toBeVisible();

      // Test campaign filtering
      await page.selectOption('[data-testid="status-filter"]', 'active');
      await page.waitForTimeout(1000);

      const activeCampaigns = await page.locator('.campaign-card[data-status="active"]').count();
      expect(activeCampaigns).toBeGreaterThan(0);

      // Test campaign search
      await page.fill('[data-testid="campaign-search"]', 'Test Campaign');
      await page.waitForTimeout(1000);

      await expect(page.locator('.campaign-card')).toContainText('Test Campaign');

      // View campaign details
      await page.click('.campaign-card:first-child [data-testid="view-details"]');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="campaign-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();

      // Test campaign actions
      await page.click('[data-testid="campaign-actions"]');
      await expect(page.locator('[data-testid="action-menu"]')).toBeVisible();

      // Pause campaign
      await page.click('[data-testid="pause-campaign"]');
      await expect(page.locator('[data-testid="pause-confirmation"]')).toBeVisible();
      
      await page.fill('[data-testid="pause-reason"]', 'Pausing for optimization');
      await page.click('[data-testid="confirm-pause"]');

      await expect(page.locator('[data-testid="campaign-status"]')).toContainText('Paused');

      // Resume campaign
      await page.click('[data-testid="resume-campaign"]');
      await expect(page.locator('[data-testid="campaign-status"]')).toContainText('Active');
    });

    test('should handle campaign optimization workflow', async () => {
      // Navigate to active campaign
      await page.goto('/sponsor/campaigns/active-campaign-id');
      await page.waitForLoadState('networkidle');

      // Check optimization suggestions
      await expect(page.locator('[data-testid="optimization-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="optimization-suggestions"]')).toBeVisible();

      // Apply audience optimization
      await page.click('[data-testid="optimize-audience"]');
      await expect(page.locator('[data-testid="audience-optimization-modal"]')).toBeVisible();

      await page.check('[data-testid="expand-age-range"]');
      await page.check('[data-testid="add-similar-interests"]');
      
      await page.click('[data-testid="apply-optimization"]');
      await expect(page.locator('[data-testid="optimization-applied"]')).toBeVisible();

      // Test A/B testing setup
      await page.click('[data-testid="create-ab-test"]');
      await expect(page.locator('[data-testid="ab-test-setup"]')).toBeVisible();

      await page.fill('[data-testid="test-name"]', 'Headline A/B Test');
      await page.fill('[data-testid="variant-a-headline"]', 'Original Headline');
      await page.fill('[data-testid="variant-b-headline"]', 'Optimized Headline');

      await page.click('[data-testid="start-ab-test"]');
      await expect(page.locator('[data-testid="ab-test-running"]')).toBeVisible();
    });
  });

  describe('Analytics and Reporting Interface', () => {
    test('should display comprehensive analytics dashboard', async () => {
      // Navigate to analytics
      await page.click('[data-testid="nav-analytics"]');
      await page.waitForLoadState('networkidle');

      // Check analytics overview
      await expect(page.locator('[data-testid="analytics-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-selector"]')).toBeVisible();

      // Test date range selection
      await page.click('[data-testid="date-range-selector"]');
      await page.click('[data-testid="last-30-days"]');
      await page.waitForTimeout(2000);

      // Verify charts update
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="audience-breakdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="conversion-funnel"]')).toBeVisible();

      // Test metric drill-downs
      await page.click('[data-testid="impressions-metric"]');
      await expect(page.locator('[data-testid="impressions-detail"]')).toBeVisible();

      // Check demographic insights
      await page.click('[data-testid="demographics-tab"]');
      await expect(page.locator('[data-testid="age-breakdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="gender-breakdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="location-heatmap"]')).toBeVisible();

      // Test custom report creation
      await page.click('[data-testid="create-custom-report"]');
      await expect(page.locator('[data-testid="report-builder"]')).toBeVisible();

      await page.check('[data-testid="metric-impressions"]');
      await page.check('[data-testid="metric-clicks"]');
      await page.check('[data-testid="metric-conversions"]');

      await page.selectOption('[data-testid="dimension-select"]', 'campaign');
      await page.selectOption('[data-testid="date-granularity"]', 'daily');

      await page.click('[data-testid="generate-report"]');
      await expect(page.locator('[data-testid="custom-report-results"]')).toBeVisible();
    });

    test('should provide real-time campaign monitoring', async () => {
      // Navigate to real-time monitoring
      await page.click('[data-testid="nav-analytics"]');
      await page.click('[data-testid="real-time-tab"]');
      await page.waitForLoadState('networkidle');

      // Check real-time metrics
      await expect(page.locator('[data-testid="live-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-users"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-impressions"]')).toBeVisible();

      // Test auto-refresh functionality
      const initialValue = await page.textContent('[data-testid="current-impressions"]');
      await page.waitForTimeout(5000); // Wait for auto-refresh
      
      // Verify timestamp updates
      await expect(page.locator('[data-testid="last-updated"]')).toBeVisible();

      // Test alerts and notifications
      await expect(page.locator('[data-testid="performance-alerts"]')).toBeVisible();
      
      // Check campaign performance warnings
      const alerts = await page.locator('.alert-item').count();
      if (alerts > 0) {
        await page.click('.alert-item:first-child');
        await expect(page.locator('[data-testid="alert-details"]')).toBeVisible();
      }
    });

    test('should handle data export and sharing', async () => {
      await page.click('[data-testid="nav-analytics"]');
      await page.waitForLoadState('networkidle');

      // Test data export
      await page.click('[data-testid="export-data"]');
      await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();

      await page.selectOption('[data-testid="export-format"]', 'csv');
      await page.selectOption('[data-testid="date-range"]', 'last_month');
      await page.check('[data-testid="include-demographics"]');

      await page.click('[data-testid="download-export"]');
      
      // Verify download initiated
      await expect(page.locator('[data-testid="download-initiated"]')).toBeVisible();

      // Test report scheduling
      await page.click('[data-testid="schedule-reports"]');
      await expect(page.locator('[data-testid="schedule-modal"]')).toBeVisible();

      await page.selectOption('[data-testid="frequency"]', 'weekly');
      await page.fill('[data-testid="recipient-emails"]', 'team@testcompany.com');
      await page.selectOption('[data-testid="report-type"]', 'performance_summary');

      await page.click('[data-testid="schedule-report"]');
      await expect(page.locator('[data-testid="schedule-confirmed"]')).toBeVisible();

      // Test dashboard sharing
      await page.click('[data-testid="share-dashboard"]');
      await expect(page.locator('[data-testid="share-options"]')).toBeVisible();

      await page.click('[data-testid="generate-share-link"]');
      await expect(page.locator('[data-testid="share-link"]')).toBeVisible();
    });
  });

  describe('Audience Management and Targeting', () => {
    test('should create and manage custom audiences', async () => {
      // Navigate to audiences
      await page.click('[data-testid="nav-audiences"]');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="audiences-list"]')).toBeVisible();

      // Create new custom audience
      await page.click('[data-testid="create-audience"]');
      await expect(page.locator('[data-testid="audience-builder"]')).toBeVisible();

      await page.fill('[data-testid="audience-name"]', 'Tech Professionals 25-40');
      await page.fill('[data-testid="audience-description"]', 'Technology professionals aged 25-40');

      // Set demographic criteria
      await page.selectOption('[data-testid="age-min"]', '25');
      await page.selectOption('[data-testid="age-max"]', '40');

      // Add interest targeting
      await page.click('[data-testid="add-interests"]');
      const interests = ['technology', 'software', 'innovation'];
      for (const interest of interests) {
        await page.fill('[data-testid="interest-search"]', interest);
        await page.click(`[data-testid="interest-${interest}"]`);
      }

      // Add behavioral targeting
      await page.click('[data-testid="add-behaviors"]');
      await page.check('[data-testid="tech-early-adopters"]');
      await page.check('[data-testid="business-decision-makers"]');

      // Preview audience size
      await page.click('[data-testid="preview-audience"]');
      await expect(page.locator('[data-testid="audience-size-estimate"]')).toBeVisible();

      const audienceSize = await page.textContent('[data-testid="estimated-reach"]');
      expect(parseInt(audienceSize.replace(/,/g, ''))).toBeGreaterThan(0);

      await page.click('[data-testid="save-audience"]');
      await expect(page.locator('[data-testid="audience-saved"]')).toBeVisible();
    });

    test('should analyze audience insights and performance', async () => {
      // Select existing audience
      await page.click('[data-testid="nav-audiences"]');
      await page.click('.audience-card:first-child');
      await page.waitForLoadState('networkidle');

      // Check audience analytics
      await expect(page.locator('[data-testid="audience-insights"]')).toBeVisible();
      await expect(page.locator('[data-testid="engagement-metrics"]')).toBeVisible();

      // View demographic breakdown
      await page.click('[data-testid="demographics-analysis"]');
      await expect(page.locator('[data-testid="age-distribution"]')).toBeVisible();
      await expect(page.locator('[data-testid="location-analysis"]')).toBeVisible();

      // Check interest affinity
      await page.click('[data-testid="interest-affinity"]');
      await expect(page.locator('[data-testid="interest-scores"]')).toBeVisible();

      // Test lookalike audience creation
      await page.click('[data-testid="create-lookalike"]');
      await expect(page.locator('[data-testid="lookalike-setup"]')).toBeVisible();

      await page.selectOption('[data-testid="similarity-level"]', '80');
      await page.selectOption('[data-testid="target-size"]', '100000');

      await page.click('[data-testid="create-lookalike-audience"]');
      await expect(page.locator('[data-testid="lookalike-created"]')).toBeVisible();
    });
  });

  describe('Billing and Payment Management', () => {
    test('should handle comprehensive billing interface', async () => {
      // Navigate to billing
      await page.click('[data-testid="nav-billing"]');
      await page.waitForLoadState('networkidle');

      // Check billing overview
      await expect(page.locator('[data-testid="billing-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-balance"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-methods"]')).toBeVisible();

      // View billing history
      await page.click('[data-testid="billing-history-tab"]');
      await expect(page.locator('[data-testid="invoice-list"]')).toBeVisible();

      // Test invoice download
      if (await page.locator('.invoice-item').count() > 0) {
        await page.click('.invoice-item:first-child [data-testid="download-invoice"]');
        // Verify download (would need file system check in real test)
      }

      // Add new payment method
      await page.click('[data-testid="payment-methods-tab"]');
      await page.click('[data-testid="add-payment-method"]');
      
      await expect(page.locator('[data-testid="payment-method-form"]')).toBeVisible();
      
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="expiry-date"]', '12/25');
      await page.fill('[data-testid="cvc"]', '123');
      await page.fill('[data-testid="cardholder-name"]', 'Test Company');

      await page.click('[data-testid="save-payment-method"]');
      await expect(page.locator('[data-testid="payment-method-added"]')).toBeVisible();

      // Set billing alerts
      await page.click('[data-testid="billing-settings-tab"]');
      await page.check('[data-testid="budget-alerts"]');
      await page.fill('[data-testid="alert-threshold"]', '80');
      await page.fill('[data-testid="alert-email"]', 'billing@testcompany.com');

      await page.click('[data-testid="save-billing-settings"]');
      await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
    });

    test('should handle spend tracking and budget management', async () => {
      await page.click('[data-testid="nav-billing"]');
      await page.click('[data-testid="spend-tracking-tab"]');
      await page.waitForLoadState('networkidle');

      // Check spend visualization
      await expect(page.locator('[data-testid="spend-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="budget-utilization"]')).toBeVisible();

      // Test budget adjustments
      await page.click('[data-testid="adjust-budget"]');
      await expect(page.locator('[data-testid="budget-adjustment-modal"]')).toBeVisible();

      await page.fill('[data-testid="new-budget-amount"]', '7500');
      await page.selectOption('[data-testid="budget-period"]', 'monthly');

      await page.click('[data-testid="apply-budget-change"]');
      await expect(page.locator('[data-testid="budget-updated"]')).toBeVisible();

      // Check spend by campaign
      await page.click('[data-testid="spend-by-campaign"]');
      await expect(page.locator('[data-testid="campaign-spend-breakdown"]')).toBeVisible();
    });
  });

  describe('Settings and Account Management', () => {
    test('should provide comprehensive account settings', async () => {
      // Navigate to settings
      await page.click('[data-testid="nav-settings"]');
      await page.waitForLoadState('networkidle');

      // Company profile settings
      await expect(page.locator('[data-testid="company-profile"]')).toBeVisible();
      
      await page.click('[data-testid="edit-company-profile"]');
      await page.fill('[data-testid="company-description"]', 'Updated company description');
      await page.fill('[data-testid="company-website"]', 'https://updatedcompany.com');

      await page.click('[data-testid="save-company-profile"]');
      await expect(page.locator('[data-testid="profile-updated"]')).toBeVisible();

      // Notification preferences
      await page.click('[data-testid="notifications-tab"]');
      await page.check('[data-testid="campaign-alerts"]');
      await page.check('[data-testid="performance-reports"]');
      await page.uncheck('[data-testid="promotional-emails"]');

      await page.click('[data-testid="save-notifications"]');
      await expect(page.locator('[data-testid="notifications-saved"]')).toBeVisible();

      // API settings
      await page.click('[data-testid="api-tab"]');
      await page.click('[data-testid="generate-api-key"]');
      
      await expect(page.locator('[data-testid="api-key-generated"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-key-display"]')).toBeVisible();

      // Team management
      await page.click('[data-testid="team-tab"]');
      await page.click('[data-testid="invite-team-member"]');
      
      await page.fill('[data-testid="member-email"]', 'newmember@testcompany.com');
      await page.selectOption('[data-testid="member-role"]', 'analyst');
      
      await page.click('[data-testid="send-invitation"]');
      await expect(page.locator('[data-testid="invitation-sent"]')).toBeVisible();
    });
  });

  describe('Performance and Accessibility', () => {
    test('should maintain optimal dashboard performance', async () => {
      // Test navigation speed
      const navigationStart = Date.now();
      
      await page.click('[data-testid="nav-campaigns"]');
      await page.waitForLoadState('networkidle');
      
      await page.click('[data-testid="nav-analytics"]');
      await page.waitForLoadState('networkidle');
      
      await page.click('[data-testid="nav-audiences"]');
      await page.waitForLoadState('networkidle');
      
      const navigationTime = Date.now() - navigationStart;
      expect(navigationTime).toBeLessThan(8000);

      // Test data loading performance
      await page.click('[data-testid="refresh-all-data"]');
      const refreshStart = Date.now();
      
      await page.waitForSelector('[data-testid="data-refreshed"]');
      const refreshTime = Date.now() - refreshStart;
      expect(refreshTime).toBeLessThan(5000);
    });

    test('should support keyboard navigation', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();

      // Navigate through main menu with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Test form navigation
      await page.goto('/sponsor/campaigns/create');
      await page.keyboard.press('Tab');
      await page.keyboard.type('Keyboard Test Campaign');
      
      await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowDown'); // Select dropdown option
      await page.keyboard.press('Enter');
    });
  });
});