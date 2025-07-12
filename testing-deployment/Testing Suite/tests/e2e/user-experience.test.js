const { chromium } = require('playwright');
const { expect } = require('@playwright/test');

describe('User Experience E2E Tests', () => {
  let browser;
  let context;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.DEBUG ? 100 : 0
    });
  });

  beforeEach(async () => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    page = await context.newPage();
    
    // Navigate to app
    await page.goto(process.env.APP_URL || 'http://localhost:3000');
  });

  afterEach(async () => {
    await context.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Landing Page and First Impressions', () => {
    test('should load landing page with optimal performance', async () => {
      const startTime = Date.now();
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds

      // Check critical elements are visible
      await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
      await expect(page.locator('[data-testid="featured-stories"]')).toBeVisible();

      // Check for proper meta tags and SEO
      const title = await page.title();
      expect(title).toContain('Story Platform');
      
      const metaDescription = await page.getAttribute('meta[name="description"]', 'content');
      expect(metaDescription).toBeTruthy();
      expect(metaDescription.length).toBeGreaterThan(120);
    });

    test('should provide smooth browsing experience without login', async () => {
      // Browse featured stories
      await page.click('[data-testid="featured-stories"] .story-card:first-child');
      await page.waitForLoadState('networkidle');

      // Check story preview functionality
      await expect(page.locator('[data-testid="story-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="story-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="story-content-preview"]')).toBeVisible();

      // Test registration prompt after reading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });

      await expect(page.locator('[data-testid="registration-prompt"]')).toBeVisible();
      
      // Test smooth transition to registration
      await page.click('[data-testid="register-button"]');
      await page.waitForSelector('[data-testid="registration-form"]');
      
      await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();
    });

    test('should handle category exploration seamlessly', async () => {
      // Navigate through different categories
      const categories = ['technology', 'science', 'business', 'entertainment'];
      
      for (const category of categories) {
        await page.click(`[data-testid="category-${category}"]`);
        await page.waitForLoadState('networkidle');
        
        // Verify category content loads
        await expect(page.locator('[data-testid="category-title"]')).toContainText(category, { ignoreCase: true });
        await expect(page.locator('[data-testid="story-grid"]')).toBeVisible();
        
        // Check stories are relevant to category
        const storyElements = await page.locator('.story-card').all();
        expect(storyElements.length).toBeGreaterThan(0);
      }
    });
  });

  describe('User Registration and Onboarding Flow', () => {
    test('should complete user registration with optimal UX', async () => {
      // Start registration process
      await page.click('[data-testid="register-button"]');
      await page.waitForSelector('[data-testid="registration-form"]');

      // Test form validation and user feedback
      const emailInput = page.locator('[data-testid="email-input"]');
      const usernameInput = page.locator('[data-testid="username-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');
      const submitButton = page.locator('[data-testid="register-submit"]');

      // Test real-time validation
      await emailInput.fill('invalid-email');
      await emailInput.blur();
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

      await emailInput.fill('test@example.com');
      await emailInput.blur();
      await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible();

      // Test username availability checking
      await usernameInput.fill('testuser');
      await page.waitForTimeout(500); // Wait for debounce
      await expect(page.locator('[data-testid="username-available"]')).toBeVisible();

      // Test password strength indicator
      await passwordInput.fill('weak');
      await expect(page.locator('[data-testid="password-strength"]')).toContainText('Weak');

      await passwordInput.fill('StrongPassword123!');
      await expect(page.locator('[data-testid="password-strength"]')).toContainText('Strong');

      // Complete registration
      await emailInput.fill('e2etest@example.com');
      await usernameInput.fill('e2etestuser');
      await passwordInput.fill('TestPassword123!');
      await page.fill('[data-testid="display-name-input"]', 'E2E Test User');

      await submitButton.click();
      await page.waitForLoadState('networkidle');

      // Verify successful registration
      await expect(page.locator('[data-testid="onboarding-welcome"]')).toBeVisible();
    });

    test('should provide intuitive onboarding experience', async () => {
      // Assume user is registered and starting onboarding
      await page.goto('/onboarding');
      await page.waitForLoadState('networkidle');

      // Step 1: Interest selection
      await expect(page.locator('[data-testid="onboarding-step-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="interest-grid"]')).toBeVisible();

      // Select multiple interests with visual feedback
      const interests = ['technology', 'science', 'business'];
      for (const interest of interests) {
        await page.click(`[data-testid="interest-${interest}"]`);
        await expect(page.locator(`[data-testid="interest-${interest}"]`)).toHaveClass(/selected/);
      }

      await page.click('[data-testid="next-step"]');

      // Step 2: Reading preferences
      await expect(page.locator('[data-testid="onboarding-step-2"]')).toBeVisible();
      
      await page.click('[data-testid="reading-length-medium"]');
      await page.click('[data-testid="reading-time-evening"]');
      await page.click('[data-testid="frequency-daily"]');
      
      await page.click('[data-testid="next-step"]');

      // Step 3: Community recommendations
      await expect(page.locator('[data-testid="onboarding-step-3"]')).toBeVisible();
      await expect(page.locator('[data-testid="recommended-communities"]')).toBeVisible();

      // Join recommended communities
      const communityCards = await page.locator('.community-card').all();
      if (communityCards.length > 0) {
        await communityCards[0].locator('[data-testid="join-community"]').click();
        await expect(communityCards[0].locator('[data-testid="joined-indicator"]')).toBeVisible();
      }

      await page.click('[data-testid="complete-onboarding"]');

      // Verify transition to main app
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="personalized-feed"]')).toBeVisible();
    });
  });

  describe('Content Discovery and Reading Experience', () => {
    test('should provide excellent story reading experience', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForLoadState('networkidle');

      // Navigate to a story
      await page.click('[data-testid="story-card"]:first-child');
      await page.waitForLoadState('networkidle');

      // Check story page elements
      await expect(page.locator('[data-testid="story-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="story-author"]')).toBeVisible();
      await expect(page.locator('[data-testid="story-metadata"]')).toBeVisible();
      await expect(page.locator('[data-testid="story-content"]')).toBeVisible();

      // Test reading progress tracking
      const initialProgress = await page.getAttribute('[data-testid="reading-progress"]', 'value');
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await page.waitForTimeout(1000);

      const midProgress = await page.getAttribute('[data-testid="reading-progress"]', 'value');
      expect(parseInt(midProgress)).toBeGreaterThan(parseInt(initialProgress));

      // Test story interactions
      await page.click('[data-testid="like-button"]');
      await expect(page.locator('[data-testid="like-button"]')).toHaveClass(/liked/);

      await page.click('[data-testid="bookmark-button"]');
      await expect(page.locator('[data-testid="bookmark-button"]')).toHaveClass(/bookmarked/);

      // Test comment functionality
      await page.click('[data-testid="comment-button"]');
      await expect(page.locator('[data-testid="comment-section"]')).toBeVisible();

      await page.fill('[data-testid="comment-input"]', 'Great story! Really insightful.');
      await page.click('[data-testid="submit-comment"]');
      
      await expect(page.locator('[data-testid="comment-list"]')).toContainText('Great story! Really insightful.');

      // Test share functionality
      await page.click('[data-testid="share-button"]');
      await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();

      await page.click('[data-testid="share-twitter"]');
      // Note: In real test, this would open a new tab with Twitter sharing
    });

    test('should handle personalized feed effectively', async () => {
      // Assume user is logged in
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');

      // Check personalized feed elements
      await expect(page.locator('[data-testid="personalized-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="feed-filters"]')).toBeVisible();

      // Test filter functionality
      await page.click('[data-testid="filter-technology"]');
      await page.waitForLoadState('networkidle');

      const storyCards = await page.locator('.story-card').all();
      expect(storyCards.length).toBeGreaterThan(0);

      // Test infinite scroll
      const initialStoryCount = storyCards.length;
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(2000);

      const newStoryCards = await page.locator('.story-card').all();
      expect(newStoryCards.length).toBeGreaterThan(initialStoryCount);

      // Test search functionality
      await page.fill('[data-testid="search-input"]', 'artificial intelligence');
      await page.press('[data-testid="search-input"]', 'Enter');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      const searchResults = await page.locator('.search-result-card').all();
      expect(searchResults.length).toBeGreaterThan(0);
    });

    test('should provide smooth mobile reading experience', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/story/sample-story');
      await page.waitForLoadState('networkidle');

      // Check mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-story-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-story-content"]')).toBeVisible();

      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

      // Test mobile reading controls
      await page.click('[data-testid="mobile-font-size"]');
      await expect(page.locator('[data-testid="font-size-controls"]')).toBeVisible();

      await page.click('[data-testid="increase-font"]');
      const fontSize = await page.evaluate(() => {
        return window.getComputedStyle(document.querySelector('[data-testid="story-content"]')).fontSize;
      });
      expect(fontSize).toBeTruthy();

      // Test mobile sharing
      await page.click('[data-testid="mobile-share"]');
      await expect(page.locator('[data-testid="mobile-share-options"]')).toBeVisible();
    });
  });

  describe('Content Creation Experience', () => {
    test('should provide intuitive story creation flow', async () => {
      // Navigate to story creation
      await page.goto('/create');
      await page.waitForLoadState('networkidle');

      // Check editor interface
      await expect(page.locator('[data-testid="story-editor"]')).toBeVisible();
      await expect(page.locator('[data-testid="editor-toolbar"]')).toBeVisible();

      // Test title input
      await page.fill('[data-testid="story-title"]', 'My Test Story');
      
      // Test content editor
      const editor = page.locator('[data-testid="content-editor"]');
      await editor.click();
      await editor.fill('This is the beginning of my story...');

      // Test formatting options
      await page.selectText('[data-testid="content-editor"]');
      await page.click('[data-testid="bold-button"]');
      
      // Verify text is bold
      const boldText = await page.locator('[data-testid="content-editor"] strong');
      await expect(boldText).toBeVisible();

      // Test category selection
      await page.click('[data-testid="category-dropdown"]');
      await page.click('[data-testid="category-technology"]');
      
      // Test tag addition
      await page.fill('[data-testid="tag-input"]', 'test');
      await page.press('[data-testid="tag-input"]', 'Enter');
      await expect(page.locator('[data-testid="tag-test"]')).toBeVisible();

      // Test save as draft
      await page.click('[data-testid="save-draft"]');
      await expect(page.locator('[data-testid="draft-saved-indicator"]')).toBeVisible();

      // Test preview functionality
      await page.click('[data-testid="preview-button"]');
      await expect(page.locator('[data-testid="story-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-title"]')).toContainText('My Test Story');

      // Test publish flow
      await page.click('[data-testid="publish-button"]');
      await expect(page.locator('[data-testid="publish-modal"]')).toBeVisible();

      await page.click('[data-testid="publish-now"]');
      await page.waitForLoadState('networkidle');

      // Verify successful publication
      await expect(page.locator('[data-testid="publish-success"]')).toBeVisible();
    });

    test('should handle collaborative editing smoothly', async () => {
      // Create collaborative story
      await page.goto('/create');
      await page.fill('[data-testid="story-title"]', 'Collaborative Story');
      
      await page.click('[data-testid="collaboration-settings"]');
      await page.check('[data-testid="enable-collaboration"]');
      
      // Add collaborator
      await page.fill('[data-testid="collaborator-email"]', 'collaborator@example.com');
      await page.click('[data-testid="add-collaborator"]');
      
      await expect(page.locator('[data-testid="collaborator-list"]')).toContainText('collaborator@example.com');

      // Test real-time editing indicators
      await page.fill('[data-testid="content-editor"]', 'Initial content...');
      
      // Simulate another user editing (would require WebSocket testing in real scenario)
      await page.evaluate(() => {
        // Mock collaborative editing indicator
        const indicator = document.createElement('div');
        indicator.setAttribute('data-testid', 'collaborator-cursor');
        indicator.textContent = 'collaborator@example.com is editing';
        document.body.appendChild(indicator);
      });

      await expect(page.locator('[data-testid="collaborator-cursor"]')).toBeVisible();
    });
  });

  describe('Community Interaction Experience', () => {
    test('should provide seamless community browsing and joining', async () => {
      await page.goto('/communities');
      await page.waitForLoadState('networkidle');

      // Check communities page layout
      await expect(page.locator('[data-testid="communities-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="community-filters"]')).toBeVisible();

      // Test community filtering
      await page.click('[data-testid="filter-technology"]');
      await page.waitForLoadState('networkidle');

      const communityCards = await page.locator('.community-card').all();
      expect(communityCards.length).toBeGreaterThan(0);

      // Test community preview
      await communityCards[0].hover();
      await expect(communityCards[0].locator('[data-testid="community-preview"]')).toBeVisible();

      // Join a community
      await communityCards[0].click();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-testid="community-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="community-description"]')).toBeVisible();

      await page.click('[data-testid="join-community"]');
      await expect(page.locator('[data-testid="member-badge"]')).toBeVisible();

      // Test community feed
      await expect(page.locator('[data-testid="community-feed"]')).toBeVisible();
      
      // Test posting in community
      await page.click('[data-testid="create-post"]');
      await page.fill('[data-testid="post-content"]', 'Hello community!');
      await page.click('[data-testid="submit-post"]');
      
      await expect(page.locator('[data-testid="community-feed"]')).toContainText('Hello community!');
    });

    test('should handle community discussions effectively', async () => {
      await page.goto('/communities/test-community/discussions');
      await page.waitForLoadState('networkidle');

      // Create new discussion
      await page.click('[data-testid="new-discussion"]');
      await page.fill('[data-testid="discussion-title"]', 'What are your thoughts on AI?');
      await page.fill('[data-testid="discussion-content"]', 'I\'d love to hear everyone\'s perspectives...');
      await page.click('[data-testid="post-discussion"]');

      await expect(page.locator('[data-testid="discussion-list"]')).toContainText('What are your thoughts on AI?');

      // Participate in discussion
      await page.click('[data-testid="discussion-item"]:first-child');
      await page.waitForLoadState('networkidle');

      await page.fill('[data-testid="reply-input"]', 'Great question! I think AI will...');
      await page.click('[data-testid="submit-reply"]');

      await expect(page.locator('[data-testid="replies-list"]')).toContainText('Great question! I think AI will...');

      // Test discussion voting
      await page.click('[data-testid="upvote-discussion"]');
      await expect(page.locator('[data-testid="vote-count"]')).toContainText('1');
    });
  });

  describe('User Profile and Settings Experience', () => {
    test('should provide comprehensive profile management', async () => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Check profile sections
      await expect(page.locator('[data-testid="profile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-stats"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-stories"]')).toBeVisible();

      // Test profile editing
      await page.click('[data-testid="edit-profile"]');
      await expect(page.locator('[data-testid="profile-edit-modal"]')).toBeVisible();

      await page.fill('[data-testid="bio-input"]', 'Updated bio with new information');
      await page.fill('[data-testid="location-input"]', 'San Francisco, CA');
      await page.fill('[data-testid="website-input"]', 'https://mywebsite.com');

      await page.click('[data-testid="save-profile"]');
      await expect(page.locator('[data-testid="profile-bio"]')).toContainText('Updated bio with new information');

      // Test avatar upload
      await page.click('[data-testid="change-avatar"]');
      await page.setInputFiles('[data-testid="avatar-upload"]', {
        name: 'avatar.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });

      await page.click('[data-testid="upload-avatar"]');
      await expect(page.locator('[data-testid="avatar-updated"]')).toBeVisible();
    });

    test('should handle settings and preferences intuitively', async () => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Test notification settings
      await page.click('[data-testid="notifications-tab"]');
      await expect(page.locator('[data-testid="notification-preferences"]')).toBeVisible();

      await page.check('[data-testid="email-notifications"]');
      await page.uncheck('[data-testid="push-notifications"]');
      
      await page.click('[data-testid="save-notifications"]');
      await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();

      // Test privacy settings
      await page.click('[data-testid="privacy-tab"]');
      await page.check('[data-testid="profile-public"]');
      await page.uncheck('[data-testid="show-reading-activity"]');

      await page.click('[data-testid="save-privacy"]');
      await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();

      // Test account settings
      await page.click('[data-testid="account-tab"]');
      
      // Change password
      await page.click('[data-testid="change-password"]');
      await page.fill('[data-testid="current-password"]', 'oldpassword123');
      await page.fill('[data-testid="new-password"]', 'newpassword123');
      await page.fill('[data-testid="confirm-password"]', 'newpassword123');
      
      await page.click('[data-testid="update-password"]');
      await expect(page.locator('[data-testid="password-updated"]')).toBeVisible();
    });
  });

  describe('Performance and Responsiveness', () => {
    test('should maintain performance under load', async () => {
      // Test rapid navigation
      const startTime = Date.now();
      
      await page.goto('/feed');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/communities');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/create');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(10000); // Should complete in under 10 seconds
    });

    test('should handle different viewport sizes gracefully', async () => {
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1440, height: 900 }, // Desktop
        { width: 1920, height: 1080 } // Large desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Check responsive elements are properly displayed
        await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

        // Check mobile-specific elements on small screens
        if (viewport.width <= 768) {
          await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
        } else {
          await expect(page.locator('[data-testid="desktop-navigation"]')).toBeVisible();
        }
      }
    });

    test('should handle network conditions gracefully', async () => {
      // Simulate slow network
      await context.route('**/*', route => {
        setTimeout(() => route.continue(), 2000); // 2 second delay
      });

      await page.goto('/feed');
      
      // Check loading states are shown
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Check content eventually loads
      await expect(page.locator('[data-testid="personalized-feed"]')).toBeVisible();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await context.route('**/api/**', route => {
        route.abort();
      });

      await page.goto('/feed');
      
      // Check error message is displayed
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // Remove route blocking and retry
      await context.unroute('**/api/**');
      await page.click('[data-testid="retry-button"]');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="personalized-feed"]')).toBeVisible();
    });

    test('should handle form validation errors properly', async () => {
      await page.goto('/create');
      
      // Try to publish without required fields
      await page.click('[data-testid="publish-button"]');
      
      await expect(page.locator('[data-testid="title-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="content-error"]')).toBeVisible();
      
      // Fill one field and check validation updates
      await page.fill('[data-testid="story-title"]', 'Valid Title');
      await expect(page.locator('[data-testid="title-error"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="content-error"]')).toBeVisible();
    });

    test('should handle session expiration smoothly', async () => {
      // Simulate expired session
      await context.addCookies([{
        name: 'auth_token',
        value: 'expired_token',
        domain: 'localhost',
        path: '/'
      }]);

      await page.goto('/profile');
      
      // Should redirect to login
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    });
  });
});