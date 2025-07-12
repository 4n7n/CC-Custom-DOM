const request = require('supertest');
const app = require('../../src/app');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/database-helper');
const { generateTestData, cleanupTestData } = require('../helpers/test-data-helper');

describe('Full User Journey Integration Tests', () => {
  let testEnvironment;

  beforeAll(async () => {
    await setupTestDatabase();
    testEnvironment = await generateTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestDatabase();
  });

  describe('Complete User Lifecycle Journey', () => {
    test('should handle full user journey from registration to premium subscription', async () => {
      // Step 1: User Discovery and Registration
      const discoveryResponse = await request(app)
        .get('/api/public/preview')
        .query({
          category: 'technology',
          limit: 3
        })
        .expect(200);

      expect(discoveryResponse.body.stories).toHaveLength(3);
      expect(discoveryResponse.body.registrationPrompt).toBeTruthy();

      // User decides to register after preview
      const registrationData = {
        email: 'newjourney@example.com',
        username: 'journeyuser',
        password: 'securepassword123',
        displayName: 'Journey User',
        referralSource: 'story_preview',
        interests: ['technology', 'science', 'innovation']
      };

      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      const userId = registrationResponse.body.user.id;
      const authToken = registrationResponse.body.token;

      expect(registrationResponse.body.user.email).toBe('newjourney@example.com');
      expect(registrationResponse.body.onboardingRequired).toBe(true);

      // Step 2: Complete Onboarding Process
      const onboardingSteps = [
        {
          step: 'interests_selection',
          data: {
            interests: ['technology', 'science', 'innovation', 'startups'],
            contentTypes: ['articles', 'tutorials', 'news'],
            readingGoals: 'stay_informed'
          }
        },
        {
          step: 'reading_preferences',
          data: {
            preferredLength: 'medium',
            readingTime: 'evening',
            frequency: 'daily',
            difficulty: 'intermediate'
          }
        },
        {
          step: 'community_selection',
          data: {
            autoJoinRecommended: true,
            communityTypes: ['technology', 'innovation'],
            participationLevel: 'active_reader'
          }
        }
      ];

      for (const step of onboardingSteps) {
        const stepResponse = await request(app)
          .post(`/api/users/${userId}/onboarding/${step.step}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(step.data)
          .expect(200);

        expect(stepResponse.body.stepCompleted).toBe(true);
      }

      // Complete onboarding
      const onboardingCompleteResponse = await request(app)
        .post(`/api/users/${userId}/onboarding/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(onboardingCompleteResponse.body.onboardingCompleted).toBe(true);
      expect(onboardingCompleteResponse.body.recommendedContent).toBeDefined();

      // Step 3: First Content Consumption Phase
      const personalizedFeedResponse = await request(app)
        .get('/api/feed/personalized')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 10,
          includeOnboarding: true
        })
        .expect(200);

      expect(personalizedFeedResponse.body.stories).toHaveLength(10);
      expect(personalizedFeedResponse.body.personalizationScore).toBeGreaterThan(0);

      // User reads several stories
      const readingActivities = [];
      for (let i = 0; i < 5; i++) {
        const story = personalizedFeedResponse.body.stories[i];
        
        const readResponse = await request(app)
          .post(`/api/stories/${story.id}/read`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            readTime: Math.floor(Math.random() * 300) + 60, // 60-360 seconds
            completionPercentage: Math.floor(Math.random() * 40) + 60, // 60-100%
            device: 'desktop',
            source: 'personalized_feed'
          })
          .expect(200);

        readingActivities.push({
          storyId: story.id,
          readTime: readResponse.body.readTime,
          engagement: readResponse.body.engagement
        });

        // Sometimes like or bookmark
        if (Math.random() > 0.6) {
          await request(app)
            .post(`/api/stories/${story.id}/like`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        }

        if (Math.random() > 0.8) {
          await request(app)
            .post(`/api/stories/${story.id}/bookmark`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        }
      }

      // Step 4: Social Engagement Phase
      // Follow some authors
      const authorsToFollow = personalizedFeedResponse.body.stories
        .slice(0, 3)
        .map(story => story.authorId);

      for (const authorId of authorsToFollow) {
        const followResponse = await request(app)
          .post(`/api/users/${authorId}/follow`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(followResponse.body.following).toBe(true);
      }

      // Join communities
      const communityDiscoveryResponse = await request(app)
        .get('/api/communities/discover')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          interests: 'technology,innovation',
          limit: 5
        })
        .expect(200);

      const communityToJoin = communityDiscoveryResponse.body.communities[0];
      
      const joinCommunityResponse = await request(app)
        .post(`/api/communities/${communityToJoin.id}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(joinCommunityResponse.body.member.userId).toBe(userId);

      // Participate in community discussions
      const discussionResponse = await request(app)
        .post(`/api/communities/${communityToJoin.id}/discussions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'What are your thoughts on AI in everyday apps?',
          content: 'I\'ve been noticing AI features in more apps lately. What has been your experience?',
          category: 'discussion',
          tags: ['AI', 'user-experience', 'technology']
        })
        .expect(201);

      const discussionId = discussionResponse.body.id;

      // Step 5: Content Creation Phase
      const firstStoryData = {
        title: 'My Journey into Tech: A Beginner\'s Perspective',
        content: 'Starting my journey in the tech world has been both exciting and overwhelming...',
        category: 'technology',
        tags: ['beginner', 'career', 'learning'],
        status: 'draft',
        settings: {
          allowComments: true,
          allowSharing: true,
          monetizationEnabled: false
        }
      };

      const storyCreationResponse = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(firstStoryData)
        .expect(201);

      const userStoryId = storyCreationResponse.body.id;
      expect(storyCreationResponse.body.status).toBe('draft');

      // Edit and refine the story
      const storyEditResponse = await request(app)
        .put(`/api/stories/${userStoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: firstStoryData.content + '\n\nUPDATE: Added more details about my learning process...',
          tags: [...firstStoryData.tags, 'personal-growth']
        })
        .expect(200);

      // Publish the story
      const publishResponse = await request(app)
        .put(`/api/stories/${userStoryId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          publishAt: new Date().toISOString(),
          notifyFollowers: true,
          crossPost: {
            communities: [communityToJoin.id]
          }
        })
        .expect(200);

      expect(publishResponse.body.status).toBe('published');

      // Step 6: Engagement and Growth Phase
      // Get followers from story publication
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for async processing

      const profileStatsResponse = await request(app)
        .get(`/api/users/${userId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileStatsResponse.body.storiesPublished).toBe(1);
      expect(profileStatsResponse.body.communitiesJoined).toBeGreaterThan(0);

      // Check for notifications
      const notificationsResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 10,
          unreadOnly: true
        })
        .expect(200);

      expect(notificationsResponse.body.notifications).toBeInstanceOf(Array);

      // Step 7: Premium Feature Discovery
      // User hits free tier limits
      const limitsResponse = await request(app)
        .get(`/api/users/${userId}/limits`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(limitsResponse.body.tier).toBe('free');
      expect(limitsResponse.body.currentUsage).toBeDefined();

      // User tries to access premium features
      const premiumFeatureResponse = await request(app)
        .get('/api/analytics/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(402); // Payment required

      expect(premiumFeatureResponse.body.upgradeRequired).toBe(true);
      expect(premiumFeatureResponse.body.availablePlans).toBeDefined();

      // Step 8: Subscription Upgrade Process
      // View available plans
      const plansResponse = await request(app)
        .get('/api/subscription/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(plansResponse.body.plans).toBeInstanceOf(Array);
      expect(plansResponse.body.plans.length).toBeGreaterThan(1);

      const premiumPlan = plansResponse.body.plans.find(plan => plan.name === 'Premium');
      expect(premiumPlan).toBeDefined();

      // Add payment method
      const paymentMethodData = {
        type: 'credit_card',
        cardToken: 'tok_visa_test_4242',
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zip: '90210',
          country: 'US'
        }
      };

      const paymentMethodResponse = await request(app)
        .post(`/api/users/${userId}/payment-methods`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentMethodData)
        .expect(201);

      const paymentMethodId = paymentMethodResponse.body.id;

      // Subscribe to premium plan
      const subscriptionData = {
        planId: premiumPlan.id,
        paymentMethodId: paymentMethodId,
        billingCycle: 'monthly',
        promoCode: 'WELCOME20' // 20% off first month
      };

      const subscriptionResponse = await request(app)
        .post('/api/subscription/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(201);

      expect(subscriptionResponse.body.subscription.status).toBe('active');
      expect(subscriptionResponse.body.subscription.planId).toBe(premiumPlan.id);

      // Step 9: Premium Features Usage
      // Access advanced analytics
      const advancedAnalyticsResponse = await request(app)
        .get('/api/analytics/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(advancedAnalyticsResponse.body.detailedMetrics).toBeDefined();
      expect(advancedAnalyticsResponse.body.demographicBreakdown).toBeDefined();

      // Use premium story features
      const premiumStoryData = {
        title: 'Advanced Analytics: What I Learned in My First Month',
        content: 'Now that I have access to premium features, here\'s what I discovered...',
        category: 'technology',
        tags: ['analytics', 'premium', 'insights'],
        premiumFeatures: {
          scheduledPublishing: {
            publishAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          advancedEditor: true,
          customStyling: {
            theme: 'professional',
            font: 'serif'
          },
          seoOptimization: {
            metaDescription: 'Insights from my first month using premium analytics',
            keywords: ['analytics', 'data', 'insights', 'premium']
          }
        }
      };

      const premiumStoryResponse = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(premiumStoryData)
        .expect(201);

      expect(premiumStoryResponse.body.premiumFeatures).toBeDefined();
      expect(premiumStoryResponse.body.scheduledPublish).toBe(true);

      // Step 10: Community Leadership and Engagement
      // Create own community (premium feature)
      const communityCreationData = {
        name: 'Tech Beginners Unite',
        description: 'A supportive community for people starting their tech journey',
        category: 'technology',
        isPublic: true,
        settings: {
          membershipApproval: 'automatic',
          contentModeration: 'community',
          allowDiscussions: true,
          allowEvents: true
        },
        guidelines: [
          'Be respectful and supportive',
          'Share your learning experiences',
          'Help others on their journey',
          'No spam or self-promotion without value'
        ]
      };

      const communityCreationResponse = await request(app)
        .post('/api/communities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(communityCreationData)
        .expect(201);

      const ownCommunityId = communityCreationResponse.body.id;
      expect(communityCreationResponse.body.ownerId).toBe(userId);

      // Invite members to new community
      const inviteData = {
        inviteMethod: 'email',
        emails: ['friend1@example.com', 'friend2@example.com'],
        personalMessage: 'Join my new community for tech beginners!'
      };

      const inviteResponse = await request(app)
        .post(`/api/communities/${ownCommunityId}/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(inviteData)
        .expect(200);

      expect(inviteResponse.body.invitesSent).toBe(2);

      // Step 11: Long-term Engagement and Retention
      // Simulate ongoing activity over time
      const longTermActivities = [
        // Week 2: Regular content consumption
        () => request(app)
          .get('/api/feed/personalized')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200),
        
        // Week 3: Create second story
        () => request(app)
          .post('/api/stories')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'My Second Month: Building Confidence',
            content: 'Reflecting on my progress and building confidence...',
            category: 'personal-development',
            status: 'published'
          })
          .expect(201),
        
        // Week 4: Engage with community
        () => request(app)
          .post(`/api/communities/${ownCommunityId}/discussions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Weekly Check-in: What did you learn this week?',
            content: 'Let\'s share our learning wins and challenges',
            category: 'weekly-checkin'
          })
          .expect(201),
        
        // Month 2: Advanced feature usage
        () => request(app)
          .get(`/api/stories/${userStoryId}/analytics/detailed`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
      ];

      // Execute long-term activities
      for (const activity of longTermActivities) {
        const activityResponse = await activity();
        expect(activityResponse.status).toBeLessThan(400);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between activities
      }

      // Step 12: Final User Profile and Achievement Status
      const finalProfileResponse = await request(app)
        .get(`/api/users/${userId}/profile/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalProfileResponse.body.user.tier).toBe('premium');
      expect(finalProfileResponse.body.user.storiesPublished).toBeGreaterThanOrEqual(2);
      expect(finalProfileResponse.body.user.communitiesOwned).toBe(1);
      expect(finalProfileResponse.body.user.communitiesJoined).toBeGreaterThan(1);
      expect(finalProfileResponse.body.achievements).toBeInstanceOf(Array);
      expect(finalProfileResponse.body.achievements.length).toBeGreaterThan(0);

      // Verify subscription is active
      const subscriptionStatusResponse = await request(app)
        .get('/api/subscription/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(subscriptionStatusResponse.body.status).toBe('active');
      expect(subscriptionStatusResponse.body.plan.name).toBe('Premium');

      // Check overall engagement metrics
      const engagementMetricsResponse = await request(app)
        .get(`/api/users/${userId}/engagement/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(engagementMetricsResponse.body.totalReadTime).toBeGreaterThan(0);
      expect(engagementMetricsResponse.body.storiesLiked).toBeGreaterThan(0);
      expect(engagementMetricsResponse.body.commentsPosted).toBeGreaterThan(0);
      expect(engagementMetricsResponse.body.engagementScore).toBeGreaterThan(0);
    });

    test('should handle user churn prevention and reactivation journey', async () => {
      // Create user who becomes inactive
      const inactiveUserData = {
        email: 'inactive@example.com',
        username: 'inactiveuser',
        password: 'password123',
        displayName: 'Inactive User'
      };

      const inactiveUserResponse = await request(app)
        .post('/api/auth/register')
        .send(inactiveUserData)
        .expect(201);

      const inactiveUserId = inactiveUserResponse.body.user.id;
      const inactiveToken = inactiveUserResponse.body.token;

      // Simulate minimal initial engagement
      await request(app)
        .get('/api/feed/personalized')
        .set('Authorization', `Bearer ${inactiveToken}`)
        .expect(200);

      // Simulate 30 days of inactivity (mock last activity date)
      await request(app)
        .put('/api/test/users/simulate-inactivity')
        .send({
          userId: inactiveUserId,
          inactiveDays: 30
        })
        .expect(200);

      // System detects churn risk
      const churnRiskResponse = await request(app)
        .get('/api/admin/users/churn-risk')
        .query({
          riskLevel: 'high',
          inactiveDays: 30
        })
        .expect(200);

      expect(churnRiskResponse.body.users).toBeInstanceOf(Array);
      const riskUser = churnRiskResponse.body.users.find(u => u.id === inactiveUserId);
      expect(riskUser).toBeDefined();

      // Trigger reactivation campaign
      const reactivationResponse = await request(app)
        .post('/api/admin/users/reactivation-campaign')
        .send({
          userIds: [inactiveUserId],
          campaignType: 'personalized_content_digest'
        })
        .expect(200);

      expect(reactivationResponse.body.campaignTriggered).toBe(true);

      // User returns via email link
      const returnResponse = await request(app)
        .get('/api/reactivation/return')
        .query({
          token: 'reactivation_token_123',
          userId: inactiveUserId
        })
        .expect(200);

      expect(returnResponse.body.welcomeBackContent).toBeDefined();

      // User re-engages with personalized content
      const reengagementFeedResponse = await request(app)
        .get('/api/feed/reactivation')
        .set('Authorization', `Bearer ${inactiveToken}`)
        .expect(200);

      expect(reengagementFeedResponse.body.stories).toBeInstanceOf(Array);
      expect(reengagementFeedResponse.body.personalizedForReturn).toBe(true);

      // Track reactivation success
      const reactivationTrackingResponse = await request(app)
        .post('/api/analytics/reactivation-success')
        .send({
          userId: inactiveUserId,
          campaignId: reactivationResponse.body.campaignId,
          engagementType: 'story_read'
        })
        .expect(200);

      expect(reactivationTrackingResponse.body.reactivationRecorded).toBe(true);
    });
  });

  describe('Content Creator Journey', () => {
    test('should handle complete content creator onboarding and growth', async () => {
      // Step 1: Register as content creator
      const creatorRegistrationData = {
        email: 'creator@example.com',
        username: 'contentcreator',
        password: 'creatorpassword123',
        displayName: 'Content Creator',
        accountType: 'creator',
        creatorProfile: {
          expertise: ['technology', 'programming', 'AI'],
          experience: 'professional',
          goals: ['build_audience', 'monetize_content', 'thought_leadership'],
          socialMedia: {
            twitter: '@contentcreator',
            linkedin: 'linkedin.com/in/contentcreator'
          }
        }
      };

      const creatorRegResponse = await request(app)
        .post('/api/auth/register/creator')
        .send(creatorRegistrationData)
        .expect(201);

      const creatorId = creatorRegResponse.body.user.id;
      const creatorToken = creatorRegResponse.body.token;

      expect(creatorRegResponse.body.user.accountType).toBe('creator');
      expect(creatorRegResponse.body.creatorOnboardingRequired).toBe(true);

      // Step 2: Complete creator-specific onboarding
      const creatorOnboardingData = {
        contentStrategy: {
          publishingFrequency: 'weekly',
          contentTypes: ['tutorials', 'opinion_pieces', 'industry_analysis'],
          targetAudience: 'developers_and_tech_professionals'
        },
        monetizationGoals: {
          enableSponsorship: true,
          enableTipping: true,
          enablePremiumContent: false
        },
        brandingPreferences: {
          colorScheme: 'professional_blue',
          profileTheme: 'minimalist',
          authorBio: 'Senior developer sharing insights on AI and modern tech'
        }
      };

      const creatorOnboardingResponse = await request(app)
        .post(`/api/creators/${creatorId}/onboarding`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send(creatorOnboardingData)
        .expect(200);

      expect(creatorOnboardingResponse.body.creatorProfileComplete).toBe(true);

      // Step 3: Create high-quality content series
      const contentSeries = [
        {
          title: 'AI in Practice: Building Your First ML Model',
          content: 'In this comprehensive guide, we\'ll walk through building your first machine learning model...',
          category: 'technology',
          tags: ['AI', 'machine-learning', 'tutorial', 'beginners'],
          estimatedReadTime: 12,
          contentType: 'tutorial'
        },
        {
          title: 'The Future of Web Development: Trends to Watch',
          content: 'As we look ahead to the next year, several trends are reshaping web development...',
          category: 'technology',
          tags: ['web-development', 'trends', 'future', 'opinion'],
          estimatedReadTime: 8,
          contentType: 'opinion_piece'
        },
        {
          title: 'Code Review Best Practices: A Senior Developer\'s Guide',
          content: 'After years of conducting and receiving code reviews, here are the practices that matter most...',
          category: 'programming',
          tags: ['code-review', 'best-practices', 'development', 'career'],
          estimatedReadTime: 10,
          contentType: 'guide'
        }
      ];

      const createdStories = [];
      for (const storyData of contentSeries) {
        const storyResponse = await request(app)
          .post('/api/stories')
          .set('Authorization', `Bearer ${creatorToken}`)
          .send({
            ...storyData,
            status: 'published',
            settings: {
              allowComments: true,
              allowSharing: true,
              monetizationEnabled: true,
              sponsorshipOpen: true
            }
          })
          .expect(201);

        createdStories.push(storyResponse.body);
        expect(storyResponse.body.status).toBe('published');
      }

      // Step 4: Build audience engagement
      // Simulate audience growth and engagement
      const audienceSimulationResponse = await request(app)
        .post('/api/test/creators/simulate-audience-growth')
        .send({
          creatorId: creatorId,
          storyIds: createdStories.map(s => s.id),
          followers: 500,
          avgEngagement: 0.08,
          timeframe: '30_days'
        })
        .expect(200);

      expect(audienceSimulationResponse.body.simulationComplete).toBe(true);

      // Check creator analytics
      const creatorAnalyticsResponse = await request(app)
        .get(`/api/creators/${creatorId}/analytics`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .query({
          timeframe: 'last_30_days'
        })
        .expect(200);

      expect(creatorAnalyticsResponse.body.followers).toBeGreaterThan(0);
      expect(creatorAnalyticsResponse.body.totalViews).toBeGreaterThan(0);
      expect(creatorAnalyticsResponse.body.engagementRate).toBeGreaterThan(0);

      // Step 5: Monetization activation
      // Enable monetization features
      const monetizationSetupResponse = await request(app)
        .post(`/api/creators/${creatorId}/monetization/setup`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          payoutMethod: 'stripe',
          stripeAccountId: 'acct_test_creator_123',
          sponsorshipRates: {
            perWord: 0.50,
            perView: 0.02,
            fixedRate: 1000
          },
          tippingEnabled: true,
          subscriptionTier: 'creator_plus'
        })
        .expect(200);

      expect(monetizationSetupResponse.body.monetizationActive).toBe(true);

      // Receive sponsorship inquiry
      const sponsorshipInquiryResponse = await request(app)
        .post(`/api/creators/${creatorId}/sponsorship/inquiries`)
        .send({
          sponsorId: testEnvironment.testSponsor.id,
          proposalDetails: {
            contentType: 'sponsored_tutorial',
            compensation: 1500,
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
        .expect(201);

      const inquiryId = sponsorshipInquiryResponse.body.id;

      // Creator accepts sponsorship
      const sponsorshipAcceptanceResponse = await request(app)
        .put(`/api/creators/sponsorship/${inquiryId}/respond`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          response: 'accepted',
          counterProposal: {
            timeline: 'agreed',
            deliverables: 'agreed',
            compensation: 'agreed'
          }
        })
        .expect(200);

      expect(sponsorshipAcceptanceResponse.body.status).toBe('accepted');

      // Step 6: Creator community building
      // Create creator-specific community
      const creatorCommunityResponse = await request(app)
        .post('/api/communities')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          name: 'Tech Insights with Creator',
          description: 'Deep dives into technology trends and development practices',
          category: 'technology',
          creatorCommunity: true,
          membershipType: 'open',
          features: {
            exclusiveContent: true,
            directAccess: true,
            monthlyQA: true
          }
        })
        .expect(201);

      const creatorCommunityId = creatorCommunityResponse.body.id;

      // Host live Q&A session
      const liveSessionResponse = await request(app)
        .post(`/api/communities/${creatorCommunityId}/live-sessions`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          title: 'Ask Me Anything: AI and Career Development',
          scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          duration: 60,
          maxParticipants: 100,
          requiresRegistration: true
        })
        .expect(201);

      expect(liveSessionResponse.body.sessionCreated).toBe(true);

      // Step 7: Creator achievement and recognition
      const achievementsResponse = await request(app)
        .get(`/api/creators/${creatorId}/achievements`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .expect(200);

      expect(achievementsResponse.body.achievements).toBeInstanceOf(Array);
      expect(achievementsResponse.body.creatorLevel).toBeDefined();
      expect(achievementsResponse.body.badgesEarned).toBeInstanceOf(Array);
    });
  });

  describe('Sponsor Journey Integration', () => {
    test('should handle complete sponsor journey from registration to campaign success', async () => {
      // Step 1: Sponsor discovery and registration
      const sponsorRegistrationData = {
        companyName: 'Innovative Tech Solutions',
        email: 'marketing@innovativetech.com',
        password: 'sponsorpassword123',
        contactPerson: {
          firstName: 'Sarah',
          lastName: 'Marketing',
          title: 'Head of Digital Marketing',
          phone: '+1-555-0199'
        },
        companyDetails: {
          industry: 'SaaS',
          website: 'https://innovativetech.com',
          description: 'B2B SaaS platform for project management',
          size: '50-200',
          monthlyMarketingBudget: 25000
        }
      };

      const sponsorRegResponse = await request(app)
        .post('/api/sponsor/auth/register')
        .send(sponsorRegistrationData)
        .expect(201);

      const sponsorId = sponsorRegResponse.body.sponsor.id;
      const sponsorToken = sponsorRegResponse.body.token;

      // Step 2: Sponsor verification and setup
      const verificationResponse = await request(app)
        .put(`/api/admin/sponsor/${sponsorId}/verification`)
        .set('Authorization', 'Bearer admin-token-mock')
        .send({
          status: 'approved',
          approvedBy: 'admin-123'
        })
        .expect(200);

      expect(verificationResponse.body.verificationStatus).toBe('approved');

      // Step 3: Market research and audience analysis
      const marketResearchResponse = await request(app)
        .get('/api/sponsor/market-research')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          industry: 'technology',
          targetAudience: 'project_managers',
          contentCategories: 'business,productivity,technology'
        })
        .expect(200);

      expect(marketResearchResponse.body.audienceInsights).toBeDefined();
      expect(marketResearchResponse.body.competitorAnalysis).toBeDefined();
      expect(marketResearchResponse.body.recommendedStrategy).toBeDefined();

      // Step 4: Campaign creation and optimization
      const campaignData = {
        name: 'Project Management Revolution Campaign',
        type: 'content_sponsorship',
        budget: {
          total: 15000,
          daily: 750,
          currency: 'USD'
        },
        targeting: {
          interests: ['project-management', 'productivity', 'business'],
          demographics: {
            ageRange: { min: 28, max: 50 },
            location: { countries: ['US', 'CA', 'UK'] }
          },
          behaviors: ['business_tool_users', 'management_professionals']
        },
        objectives: {
          primary: 'lead_generation',
          kpis: ['sign_ups', 'trial_conversions', 'demo_requests']
        }
      };

      const campaignResponse = await request(app)
        .post('/api/sponsor/campaigns')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send(campaignData)
        .expect(201);

      const campaignId = campaignResponse.body.id;

      // Step 5: Campaign execution and monitoring
      const launchResponse = await request(app)
        .post(`/api/sponsor/campaigns/${campaignId}/launch`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(launchResponse.body.status).toBe('active');

      // Monitor real-time performance
      const performanceResponse = await request(app)
        .get(`/api/sponsor/campaigns/${campaignId}/performance/realtime`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(performanceResponse.body.currentMetrics).toBeDefined();

      // Step 6: Results analysis and optimization
      const resultsResponse = await request(app)
        .get(`/api/sponsor/campaigns/${campaignId}/results`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          timeframe: 'campaign_duration'
        })
        .expect(200);

      expect(resultsResponse.body.overallROI).toBeDefined();
      expect(resultsResponse.body.leadQuality).toBeDefined();
      expect(resultsResponse.body.brandAwarenessLift).toBeDefined();
    });
  });

  describe('Cross-Platform Journey Integration', () => {
    test('should handle seamless experience across web, mobile, and email', async () => {
      // User starts on web
      const webUserData = {
        email: 'crossplatform@example.com',
        username: 'crossplatformuser',
        password: 'password123',
        displayName: 'Cross Platform User',
        device: 'web'
      };

      const webRegResponse = await request(app)
        .post('/api/auth/register')
        .send(webUserData)
        .expect(201);

      const userId = webRegResponse.body.user.id;
      const authToken = webRegResponse.body.token;

      // User switches to mobile app
      const mobileSessionResponse = await request(app)
        .post('/api/auth/device/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceType: 'mobile',
          deviceId: 'mobile_device_123',
          platform: 'ios',
          syncPreferences: true
        })
        .expect(200);

      expect(mobileSessionResponse.body.sessionSynced).toBe(true);

      // Cross-device reading sync
      const mobileReadingResponse = await request(app)
        .post('/api/stories/story-123/read')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          device: 'mobile',
          readTime: 120,
          completionPercentage: 60,
          syncToWeb: true
        })
        .expect(200);

      // Verify sync on web
      const webSyncCheckResponse = await request(app)
        .get('/api/users/reading-progress/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(webSyncCheckResponse.body.syncedItems).toBeInstanceOf(Array);

      // Email engagement integration
      const emailEngagementResponse = await request(app)
        .post('/api/email/engagement/track')
        .send({
          userId: userId,
          emailType: 'weekly_digest',
          action: 'story_click',
          storyId: 'story-123',
          source: 'email_newsletter'
        })
        .expect(200);

      expect(emailEngagementResponse.body.engagementTracked).toBe(true);
    });
  });
});