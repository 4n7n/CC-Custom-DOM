const request = require('supertest');
const app = require('../../src/app');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/database-helper');
const { createTestSponsor, createTestCampaign, createTestUser } = require('../helpers/test-data-helper');
const { mockPaymentProcessor } = require('../helpers/payment-mocks');

describe('Sponsor Integration Tests', () => {
  let testSponsor;
  let sponsorToken;
  let testUser;
  let userToken;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Create test sponsor
    testSponsor = await createTestSponsor({
      companyName: 'Tech Corp',
      email: 'sponsor@techcorp.com',
      industry: 'Technology',
      website: 'https://techcorp.com',
      tier: 'premium'
    });

    // Login sponsor
    const sponsorLoginResponse = await request(app)
      .post('/api/sponsor/auth/login')
      .send({
        email: 'sponsor@techcorp.com',
        password: 'sponsorpassword123'
      });

    sponsorToken = sponsorLoginResponse.body.token;

    // Create test user for audience targeting
    testUser = await createTestUser({
      email: 'user@example.com',
      username: 'testuser',
      interests: ['technology', 'gaming', 'innovation']
    });

    const userLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'testpassword123'
      });

    userToken = userLoginResponse.body.token;
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Sponsor Onboarding Flow', () => {
    test('should complete full sponsor registration and verification process', async () => {
      // Step 1: Register new sponsor
      const registrationData = {
        companyName: 'New Sponsor Inc',
        email: 'newsponsor@example.com',
        password: 'securepassword123',
        contactPerson: {
          firstName: 'John',
          lastName: 'Sponsor',
          title: 'Marketing Director',
          phone: '+1-555-0123'
        },
        companyDetails: {
          industry: 'E-commerce',
          website: 'https://newsponsor.com',
          description: 'Leading e-commerce platform for small businesses',
          size: '100-500',
          founded: 2015,
          headquarters: 'San Francisco, CA'
        },
        marketingGoals: {
          primaryObjective: 'brand_awareness',
          targetAudience: 'small_business_owners',
          monthlyBudget: 15000,
          expectedROI: 3.5
        }
      };

      const registrationResponse = await request(app)
        .post('/api/sponsor/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registrationResponse.body.sponsor.companyName).toBe('New Sponsor Inc');
      expect(registrationResponse.body.sponsor.status).toBe('pending_verification');
      expect(registrationResponse.body.verificationRequired).toBe(true);

      const newSponsorId = registrationResponse.body.sponsor.id;
      const newSponsorToken = registrationResponse.body.token;

      // Step 2: Upload verification documents
      const documentUploadResponse = await request(app)
        .post(`/api/sponsor/${newSponsorId}/verification/documents`)
        .set('Authorization', `Bearer ${newSponsorToken}`)
        .attach('businessLicense', Buffer.from('mock-business-license'), 'business-license.pdf')
        .attach('taxDocument', Buffer.from('mock-tax-document'), 'tax-document.pdf')
        .field('documentType', 'business_verification')
        .expect(200);

      expect(documentUploadResponse.body.documentsUploaded).toBe(true);
      expect(documentUploadResponse.body.verificationStatus).toBe('under_review');

      // Step 3: Set up payment method
      const paymentMethodData = {
        type: 'credit_card',
        cardToken: 'tok_visa_test_123',
        billingAddress: {
          street: '123 Business Ave',
          city: 'San Francisco',
          state: 'CA',
          zip: '94105',
          country: 'US'
        },
        isDefault: true
      };

      const paymentMethodResponse = await request(app)
        .post(`/api/sponsor/${newSponsorId}/payment-methods`)
        .set('Authorization', `Bearer ${newSponsorToken}`)
        .send(paymentMethodData)
        .expect(201);

      expect(paymentMethodResponse.body.paymentMethod.type).toBe('credit_card');
      expect(paymentMethodResponse.body.paymentMethod.isDefault).toBe(true);

      // Step 4: Complete onboarding survey
      const onboardingSurveyData = {
        previousAdvertisingExperience: 'moderate',
        preferredCampaignTypes: ['story_sponsorship', 'banner_ads'],
        contentCategories: ['technology', 'business', 'innovation'],
        budgetDistribution: {
          content_creation: 0.3,
          media_placement: 0.5,
          analytics: 0.2
        },
        goals: {
          brandAwareness: 8,
          leadGeneration: 6,
          sales: 7,
          engagement: 9
        }
      };

      const surveyResponse = await request(app)
        .post(`/api/sponsor/${newSponsorId}/onboarding/survey`)
        .set('Authorization', `Bearer ${newSponsorToken}`)
        .send(onboardingSurveyData)
        .expect(200);

      expect(surveyResponse.body.surveyCompleted).toBe(true);

      // Step 5: Simulate verification approval (admin action)
      const verificationApprovalResponse = await request(app)
        .put(`/api/admin/sponsor/${newSponsorId}/verification`)
        .set('Authorization', 'Bearer admin-token-mock') // Mock admin token
        .send({
          status: 'approved',
          approvedBy: 'admin-123',
          notes: 'All documents verified successfully'
        })
        .expect(200);

      expect(verificationApprovalResponse.body.verificationStatus).toBe('approved');

      // Step 6: Get updated sponsor profile
      const profileResponse = await request(app)
        .get(`/api/sponsor/${newSponsorId}/profile`)
        .set('Authorization', `Bearer ${newSponsorToken}`)
        .expect(200);

      expect(profileResponse.body.status).toBe('active');
      expect(profileResponse.body.canCreateCampaigns).toBe(true);
    });

    test('should handle verification rejection and resubmission', async () => {
      const sponsorId = testSponsor.id;

      // Simulate verification rejection
      const rejectionResponse = await request(app)
        .put(`/api/admin/sponsor/${sponsorId}/verification`)
        .set('Authorization', 'Bearer admin-token-mock')
        .send({
          status: 'rejected',
          rejectionReason: 'incomplete_documentation',
          requiredActions: [
            'Upload clear business license',
            'Provide additional tax documentation'
          ],
          notes: 'Business license image is unclear'
        })
        .expect(200);

      expect(rejectionResponse.body.verificationStatus).toBe('rejected');

      // Resubmit with corrected documents
      const resubmissionResponse = await request(app)
        .post(`/api/sponsor/${sponsorId}/verification/resubmit`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .attach('businessLicense', Buffer.from('mock-clear-business-license'), 'clear-business-license.pdf')
        .attach('additionalTaxDoc', Buffer.from('mock-additional-tax'), 'additional-tax.pdf')
        .field('resubmissionNotes', 'Uploaded higher quality documents as requested')
        .expect(200);

      expect(resubmissionResponse.body.resubmissionReceived).toBe(true);
      expect(resubmissionResponse.body.verificationStatus).toBe('under_review');
    });
  });

  describe('Campaign Creation and Management Flow', () => {
    test('should create and manage complete campaign lifecycle', async () => {
      // Step 1: Create campaign
      const campaignData = {
        name: 'Tech Product Launch Campaign',
        description: 'Promoting our new AI-powered productivity tool',
        type: 'story_sponsorship',
        budget: {
          total: 25000,
          daily: 1000,
          currency: 'USD'
        },
        duration: {
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        targeting: {
          demographics: {
            ageRange: { min: 25, max: 45 },
            gender: 'all',
            location: {
              countries: ['US', 'CA', 'GB'],
              states: ['CA', 'NY', 'TX'],
              cities: ['San Francisco', 'New York', 'Austin']
            }
          },
          interests: ['technology', 'productivity', 'business'],
          behaviors: ['tech_early_adopters', 'frequent_app_users'],
          contentCategories: ['technology', 'business', 'innovation']
        },
        creativeAssets: [
          {
            type: 'banner',
            size: '728x90',
            url: 'https://assets.techcorp.com/banner-728x90.jpg',
            altText: 'AI Productivity Tool - Boost Your Efficiency'
          },
          {
            type: 'video',
            duration: 30,
            url: 'https://assets.techcorp.com/product-demo-30s.mp4',
            thumbnail: 'https://assets.techcorp.com/video-thumbnail.jpg'
          }
        ],
        objectives: {
          primary: 'brand_awareness',
          secondary: 'lead_generation',
          kpis: ['impressions', 'clicks', 'conversions', 'brand_lift']
        }
      };

      const campaignResponse = await request(app)
        .post('/api/sponsor/campaigns')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send(campaignData)
        .expect(201);

      const campaignId = campaignResponse.body.id;
      expect(campaignResponse.body.name).toBe(campaignData.name);
      expect(campaignResponse.body.status).toBe('draft');
      expect(campaignResponse.body.targeting.interests).toEqual(campaignData.targeting.interests);

      // Step 2: Review and approve creative assets
      const assetReviewResponse = await request(app)
        .post(`/api/sponsor/campaigns/${campaignId}/assets/review`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          assetIds: campaignResponse.body.creativeAssets.map(asset => asset.id),
          reviewNotes: 'Assets look great, ready for approval'
        })
        .expect(200);

      expect(assetReviewResponse.body.assetsReviewed).toBe(true);

      // Step 3: Set up campaign tracking
      const trackingSetupResponse = await request(app)
        .post(`/api/sponsor/campaigns/${campaignId}/tracking`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          conversionPixel: 'https://techcorp.com/pixel.js',
          customEvents: [
            { name: 'signup_started', value: 0 },
            { name: 'trial_activated', value: 50 },
            { name: 'subscription_created', value: 99 }
          ],
          utmParameters: {
            source: 'story_platform',
            medium: 'sponsored_content',
            campaign: 'ai_tool_launch'
          }
        })
        .expect(200);

      expect(trackingSetupResponse.body.trackingConfigured).toBe(true);

      // Step 4: Submit campaign for approval
      const submissionResponse = await request(app)
        .post(`/api/sponsor/campaigns/${campaignId}/submit`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          submissionNotes: 'Campaign ready for review and launch',
          urgency: 'normal'
        })
        .expect(200);

      expect(submissionResponse.body.status).toBe('pending_approval');
      expect(submissionResponse.body.submittedAt).toBeDefined();

      // Step 5: Simulate admin approval
      const approvalResponse = await request(app)
        .put(`/api/admin/campaigns/${campaignId}/approve`)
        .set('Authorization', 'Bearer admin-token-mock')
        .send({
          approvedBy: 'admin-123',
          approvalNotes: 'Campaign meets all guidelines and requirements',
          scheduledLaunch: true
        })
        .expect(200);

      expect(approvalResponse.body.status).toBe('approved');

      // Step 6: Launch campaign
      const launchResponse = await request(app)
        .post(`/api/sponsor/campaigns/${campaignId}/launch`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(launchResponse.body.status).toBe('active');
      expect(launchResponse.body.launchedAt).toBeDefined();

      // Step 7: Monitor real-time metrics
      const metricsResponse = await request(app)
        .get(`/api/sponsor/campaigns/${campaignId}/metrics/realtime`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(metricsResponse.body.impressions).toBeDefined();
      expect(metricsResponse.body.clicks).toBeDefined();
      expect(metricsResponse.body.spend).toBeDefined();

      // Step 8: Pause campaign for optimization
      const pauseResponse = await request(app)
        .post(`/api/sponsor/campaigns/${campaignId}/pause`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          reason: 'optimization_needed',
          notes: 'Pausing to adjust targeting based on performance data'
        })
        .expect(200);

      expect(pauseResponse.body.status).toBe('paused');

      // Step 9: Update campaign settings
      const updateResponse = await request(app)
        .put(`/api/sponsor/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          targeting: {
            ...campaignData.targeting,
            interests: ['technology', 'productivity', 'business', 'startups'] // Added 'startups'
          },
          budget: {
            ...campaignData.budget,
            daily: 1200 // Increased daily budget
          }
        })
        .expect(200);

      expect(updateResponse.body.targeting.interests).toContain('startups');
      expect(updateResponse.body.budget.daily).toBe(1200);

      // Step 10: Resume campaign
      const resumeResponse = await request(app)
        .post(`/api/sponsor/campaigns/${campaignId}/resume`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(resumeResponse.body.status).toBe('active');
    });

    test('should handle campaign budget management and billing', async () => {
      // Create test campaign
      const testCampaign = await createTestCampaign({
        sponsorId: testSponsor.id,
        name: 'Budget Test Campaign',
        budget: { total: 10000, daily: 500 },
        status: 'active'
      });

      // Step 1: Track campaign spend
      const spendData = {
        impressions: 50000,
        clicks: 1250,
        conversions: 125,
        spend: 450.00,
        timestamp: new Date().toISOString()
      };

      const spendTrackingResponse = await request(app)
        .post(`/api/sponsor/campaigns/${testCampaign.id}/spend`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send(spendData)
        .expect(200);

      expect(spendTrackingResponse.body.spendRecorded).toBe(true);

      // Step 2: Get budget utilization
      const budgetResponse = await request(app)
        .get(`/api/sponsor/campaigns/${testCampaign.id}/budget`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(budgetResponse.body.totalBudget).toBe(10000);
      expect(budgetResponse.body.spentAmount).toBe(450);
      expect(budgetResponse.body.remainingBudget).toBe(9550);
      expect(budgetResponse.body.utilizationPercentage).toBe(4.5);

      // Step 3: Set budget alerts
      const alertResponse = await request(app)
        .post(`/api/sponsor/campaigns/${testCampaign.id}/budget/alerts`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          thresholds: [
            { percentage: 50, type: 'warning' },
            { percentage: 80, type: 'urgent' },
            { percentage: 95, type: 'critical' }
          ],
          notifications: {
            email: true,
            dashboard: true,
            webhook: 'https://techcorp.com/webhooks/budget-alert'
          }
        })
        .expect(200);

      expect(alertResponse.body.alertsConfigured).toBe(true);

      // Step 4: Process payment for campaign spend
      mockPaymentProcessor.mockResolvedValue({
        id: 'payment-campaign-123',
        status: 'succeeded',
        amount: 450.00
      });

      const paymentResponse = await request(app)
        .post(`/api/sponsor/campaigns/${testCampaign.id}/payment`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          amount: 450.00,
          paymentMethodId: 'pm_test_card',
          invoiceId: 'inv-campaign-123'
        })
        .expect(200);

      expect(paymentResponse.body.paymentProcessed).toBe(true);

      // Step 5: Get billing history
      const billingResponse = await request(app)
        .get(`/api/sponsor/billing/history`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200);

      expect(billingResponse.body.transactions).toBeInstanceOf(Array);
      expect(billingResponse.body.totalAmount).toBeGreaterThan(0);
    });
  });

  describe('Audience Targeting and Analytics Flow', () => {
    test('should handle sophisticated audience targeting and optimization', async () => {
      // Step 1: Analyze audience insights
      const audienceInsightsResponse = await request(app)
        .get('/api/sponsor/audience/insights')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          interests: 'technology,gaming',
          demographics: JSON.stringify({
            ageRange: { min: 18, max: 35 },
            location: { countries: ['US'] }
          })
        })
        .expect(200);

      expect(audienceInsightsResponse.body.potentialReach).toBeDefined();
      expect(audienceInsightsResponse.body.demographics).toBeDefined();
      expect(audienceInsightsResponse.body.engagementPredictions).toBeDefined();

      // Step 2: Create custom audience
      const customAudienceData = {
        name: 'Tech Enthusiasts 18-35',
        description: 'Young tech enthusiasts interested in gaming and innovation',
        criteria: {
          demographics: {
            ageRange: { min: 18, max: 35 },
            interests: ['technology', 'gaming', 'innovation'],
            behaviors: ['tech_early_adopters', 'gaming_enthusiasts']
          },
          engagement: {
            minStoriesRead: 5,
            lastActiveWithin: 30, // days
            avgReadTime: { min: 120 } // seconds
          }
        },
        exclusions: {
          recentlyTargeted: true,
          competitorEngaged: true
        }
      };

      const customAudienceResponse = await request(app)
        .post('/api/sponsor/audiences/custom')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send(customAudienceData)
        .expect(201);

      const audienceId = customAudienceResponse.body.id;
      expect(customAudienceResponse.body.name).toBe(customAudienceData.name);
      expect(customAudienceResponse.body.estimatedSize).toBeGreaterThan(0);

      // Step 3: Test audience with A/B campaign
      const abTestCampaignData = {
        name: 'Audience A/B Test Campaign',
        type: 'ab_test',
        variants: [
          {
            name: 'Variant A - Custom Audience',
            audienceId: audienceId,
            creative: {
              headline: 'Revolutionary Tech for Early Adopters',
              description: 'Be the first to experience cutting-edge innovation'
            },
            budget: { percentage: 50 }
          },
          {
            name: 'Variant B - Broad Audience',
            targeting: {
              interests: ['technology'],
              demographics: { ageRange: { min: 18, max: 65 } }
            },
            creative: {
              headline: 'Amazing Technology for Everyone',
              description: 'Discover the future of technology today'
            },
            budget: { percentage: 50 }
          }
        ],
        budget: { total: 5000, testDuration: 7 },
        successMetrics: ['ctr', 'conversion_rate', 'cpa']
      };

      const abTestResponse = await request(app)
        .post('/api/sponsor/campaigns/ab-test')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send(abTestCampaignData)
        .expect(201);

      expect(abTestResponse.body.variants).toHaveLength(2);
      expect(abTestResponse.body.testStatus).toBe('scheduled');

      // Step 4: Launch A/B test
      const launchAbTestResponse = await request(app)
        .post(`/api/sponsor/campaigns/${abTestResponse.body.id}/launch`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(launchAbTestResponse.body.testStatus).toBe('running');

      // Step 5: Monitor A/B test results
      const abTestResultsResponse = await request(app)
        .get(`/api/sponsor/campaigns/${abTestResponse.body.id}/ab-results`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(abTestResultsResponse.body.variants).toHaveLength(2);
      expect(abTestResultsResponse.body.statisticalSignificance).toBeDefined();

      // Step 6: Create lookalike audience based on top performers
      const lookalikeSeedData = {
        name: 'Lookalike - High Value Users',
        sourceAudience: {
          type: 'custom',
          audienceId: audienceId
        },
        similarity: 0.8, // 80% similarity
        filters: {
          minEngagementScore: 0.7,
          excludeExistingCustomers: true
        },
        targetSize: 100000
      };

      const lookaalikeResponse = await request(app)
        .post('/api/sponsor/audiences/lookalike')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send(lookalikeSeedData)
        .expect(201);

      expect(lookaalikeResponse.body.estimatedSize).toBeGreaterThan(0);
      expect(lookaalikeResponse.body.similarity).toBe(0.8);
    });

    test('should provide comprehensive campaign analytics and reporting', async () => {
      // Create test campaign with performance data
      const testCampaign = await createTestCampaign({
        sponsorId: testSponsor.id,
        name: 'Analytics Test Campaign',
        status: 'active',
        hasPerformanceData: true
      });

      // Step 1: Get campaign overview analytics
      const overviewResponse = await request(app)
        .get(`/api/sponsor/campaigns/${testCampaign.id}/analytics/overview`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          dateRange: 'last_30_days'
        })
        .expect(200);

      expect(overviewResponse.body.impressions).toBeDefined();
      expect(overviewResponse.body.clicks).toBeDefined();
      expect(overviewResponse.body.conversions).toBeDefined();
      expect(overviewResponse.body.ctr).toBeDefined();
      expect(overviewResponse.body.roas).toBeDefined();

      // Step 2: Get detailed performance breakdown
      const performanceResponse = await request(app)
        .get(`/api/sponsor/campaigns/${testCampaign.id}/analytics/performance`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          groupBy: 'day',
          metrics: 'impressions,clicks,conversions,spend'
        })
        .expect(200);

      expect(performanceResponse.body.data).toBeInstanceOf(Array);
      expect(performanceResponse.body.data[0]).toHaveProperty('date');
      expect(performanceResponse.body.data[0]).toHaveProperty('impressions');

      // Step 3: Get audience demographics breakdown
      const demographicsResponse = await request(app)
        .get(`/api/sponsor/campaigns/${testCampaign.id}/analytics/demographics`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(demographicsResponse.body.age).toBeDefined();
      expect(demographicsResponse.body.gender).toBeDefined();
      expect(demographicsResponse.body.location).toBeDefined();

      // Step 4: Get conversion funnel analysis
      const funnelResponse = await request(app)
        .get(`/api/sponsor/campaigns/${testCampaign.id}/analytics/funnel`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(funnelResponse.body.stages).toBeInstanceOf(Array);
      expect(funnelResponse.body.conversionRates).toBeDefined();
      expect(funnelResponse.body.dropoffPoints).toBeDefined();

      // Step 5: Generate custom report
      const reportData = {
        name: 'Monthly Performance Report',
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        metrics: [
          'impressions', 'clicks', 'conversions', 'spend', 
          'ctr', 'conversion_rate', 'cpa', 'roas'
        ],
        dimensions: ['date', 'campaign', 'audience_segment'],
        format: 'pdf',
        includeCharts: true,
        schedule: {
          frequency: 'monthly',
          recipients: ['sponsor@techcorp.com']
        }
      };

      const reportResponse = await request(app)
        .post('/api/sponsor/reports/generate')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send(reportData)
        .expect(201);

      expect(reportResponse.body.reportId).toBeDefined();
      expect(reportResponse.body.status).toBe('generating');

      // Step 6: Download generated report
      const downloadResponse = await request(app)
        .get(`/api/sponsor/reports/${reportResponse.body.reportId}/download`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(downloadResponse.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('Content Sponsorship and Collaboration Flow', () => {
    test('should handle content sponsorship and creator collaboration', async () => {
      // Create test content creator
      const creator = await createTestUser({
        email: 'creator@example.com',
        username: 'contentcreator',
        creatorProfile: {
          followers: 50000,
          avgViews: 5000,
          categories: ['technology', 'reviews'],
          engagementRate: 0.08
        }
      });

      // Step 1: Discover potential creators
      const creatorDiscoveryResponse = await request(app)
        .get('/api/sponsor/creators/discover')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          categories: 'technology,reviews',
          minFollowers: 10000,
          minEngagementRate: 0.05,
          location: 'US'
        })
        .expect(200);

      expect(creatorDiscoveryResponse.body.creators).toBeInstanceOf(Array);
      expect(creatorDiscoveryResponse.body.creators.length).toBeGreaterThan(0);

      // Step 2: Send collaboration proposal
      const collaborationProposal = {
        creatorId: creator.id,
        campaignType: 'sponsored_story',
        proposal: {
          contentType: 'product_review',
          deliverables: [
            'One in-depth story review (1500+ words)',
            'Social media promotion (Twitter, LinkedIn)',
            'Email newsletter mention'
          ],
          compensation: {
            amount: 2500,
            currency: 'USD',
            type: 'flat_fee'
          },
          timeline: {
            proposalDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            contentDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            publishDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
          },
          requirements: {
            mandatoryMentions: ['AI-powered features', 'productivity benefits'],
            prohibitedContent: ['competitor comparisons', 'negative language'],
            brandGuidelines: 'https://techcorp.com/brand-guidelines.pdf'
          }
        },
        message: 'We\'d love to collaborate on showcasing our new AI productivity tool to your tech-savvy audience.'
      };

      const proposalResponse = await request(app)
        .post('/api/sponsor/collaborations/propose')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send(collaborationProposal)
        .expect(201);

      const collaborationId = proposalResponse.body.id;
      expect(proposalResponse.body.status).toBe('pending');
      expect(proposalResponse.body.creatorId).toBe(creator.id);

      // Step 3: Creator accepts collaboration (simulate creator login)
      const creatorLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'creator@example.com',
          password: 'testpassword123'
        });

      const creatorToken = creatorLoginResponse.body.token;

      const acceptanceResponse = await request(app)
        .put(`/api/creators/collaborations/${collaborationId}/respond`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          response: 'accepted',
          message: 'Excited to work together! The product looks amazing.',
          negotiation: {
            timeline: {
              contentDeadline: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString()
            },
            additionalRequests: ['Product trial access for 30 days']
          }
        })
        .expect(200);

      expect(acceptanceResponse.body.status).toBe('accepted');

      // Step 4: Sponsor approves final terms
      const finalApprovalResponse = await request(app)
        .put(`/api/sponsor/collaborations/${collaborationId}/finalize`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          approvedTerms: acceptanceResponse.body.terms,
          contractGenerated: true,
          additionalNotes: 'Trial access granted for 30 days'
        })
        .expect(200);

      expect(finalApprovalResponse.body.status).toBe('active');
      expect(finalApprovalResponse.body.contractUrl).toBeDefined();

      // Step 5: Creator submits content for review
      const contentSubmissionResponse = await request(app)
        .post(`/api/creators/collaborations/${collaborationId}/content/submit`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          contentType: 'story_draft',
          title: 'Revolutionizing Productivity: My Experience with TechCorp\'s AI Tool',
          content: 'After using TechCorp\'s new AI productivity tool for two weeks...',
          wordCount: 1650,
          submissionNotes: 'First draft ready for review. Included all mandatory mentions.',
          metadata: {
            readTime: 7,
            targetKeywords: ['AI productivity', 'workflow automation'],
            callToAction: 'Try the 14-day free trial'
          }
        })
        .expect(201);

      expect(contentSubmissionResponse.body.submitted).toBe(true);
      expect(contentSubmissionResponse.body.status).toBe('under_review');

      // Step 6: Sponsor reviews and approves content
      const contentReviewResponse = await request(app)
        .put(`/api/sponsor/collaborations/${collaborationId}/content/review`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          decision: 'approved',
          feedback: 'Excellent content! Perfectly captures our product benefits.',
          minorRevisions: [],
          approvedForPublication: true
        })
        .expect(200);

      expect(contentReviewResponse.body.contentApproved).toBe(true);

      // Step 7: Creator publishes content
      const publishResponse = await request(app)
        .post(`/api/creators/collaborations/${collaborationId}/content/publish`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          publishSettings: {
            scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
            tags: ['technology', 'productivity', 'AI', 'review'],
            socialPromotion: {
              twitter: true,
              linkedin: true,
              newsletter: true
            }
          }
        })
        .expect(200);

      expect(publishResponse.body.published).toBe(true);
      expect(publishResponse.body.storyUrl).toBeDefined();

      // Step 8: Track collaboration performance
      const performanceResponse = await request(app)
        .get(`/api/sponsor/collaborations/${collaborationId}/performance`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(performanceResponse.body.metrics).toBeDefined();
      expect(performanceResponse.body.metrics.views).toBeDefined();
      expect(performanceResponse.body.metrics.engagement).toBeDefined();

      // Step 9: Process creator payment
      const paymentResponse = await request(app)
        .post(`/api/sponsor/collaborations/${collaborationId}/payment`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          amount: 2500,
          paymentMethod: 'bank_transfer',
          paymentNote: 'Payment for excellent content collaboration'
        })
        .expect(200);

      expect(paymentResponse.body.paymentProcessed).toBe(true);
    });

    test('should handle content amplification and promotion', async () => {
      // Create sponsored content
      const sponsoredStory = await createTestStory({
        title: 'Sponsored: The Future of AI in Business',
        content: 'Exploring how AI is transforming modern business...',
        authorId: testUser.id,
        sponsorId: testSponsor.id,
        isSponsored: true,
        status: 'published'
      });

      // Step 1: Set up content amplification campaign
      const amplificationData = {
        contentId: sponsoredStory.id,
        amplificationType: 'multi_channel',
        channels: {
          platform_feed: {
            enabled: true,
            prominence: 'featured',
            targeting: {
              interests: ['business', 'AI', 'technology'],
              demographics: { ageRange: { min: 25, max: 55 } }
            },
            budget: 5000
          },
          email_newsletter: {
            enabled: true,
            placement: 'top_story',
            segments: ['tech_subscribers', 'business_subscribers'],
            budget: 2000
          },
          social_media: {
            enabled: true,
            platforms: ['twitter', 'linkedin'],
            postCount: 3,
            budget: 1500
          }
        },
        duration: 7, // days
        objectives: {
          primary: 'reach',
          secondary: 'engagement',
          targets: {
            totalViews: 100000,
            uniqueReach: 75000,
            engagementRate: 0.12
          }
        }
      };

      const amplificationResponse = await request(app)
        .post('/api/sponsor/content/amplify')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send(amplificationData)
        .expect(201);

      const amplificationId = amplificationResponse.body.id;
      expect(amplificationResponse.body.status).toBe('scheduled');

      // Step 2: Launch amplification campaign
      const launchResponse = await request(app)
        .post(`/api/sponsor/amplification/${amplificationId}/launch`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(launchResponse.body.status).toBe('active');
      expect(launchResponse.body.launchedAt).toBeDefined();

      // Step 3: Monitor amplification performance
      const monitoringResponse = await request(app)
        .get(`/api/sponsor/amplification/${amplificationId}/metrics`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .expect(200);

      expect(monitoringResponse.body.reach).toBeDefined();
      expect(monitoringResponse.body.impressions).toBeDefined();
      expect(monitoringResponse.body.channelBreakdown).toBeDefined();

      // Step 4: Optimize based on performance
      const optimizationResponse = await request(app)
        .put(`/api/sponsor/amplification/${amplificationId}/optimize`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          channelAdjustments: {
            platform_feed: { budgetAdjustment: 1.2 }, // Increase by 20%
            email_newsletter: { budgetAdjustment: 0.8 }, // Decrease by 20%
            social_media: { budgetAdjustment: 1.5 } // Increase by 50%
          },
          targetingRefinements: {
            platform_feed: {
              interests: ['business', 'AI', 'technology', 'innovation'] // Added 'innovation'
            }
          }
        })
        .expect(200);

      expect(optimizationResponse.body.optimizationApplied).toBe(true);
    });
  });

  describe('ROI Measurement and Attribution Flow', () => {
    test('should provide comprehensive ROI tracking and attribution', async () => {
      // Create campaign with conversion tracking
      const testCampaign = await createTestCampaign({
        sponsorId: testSponsor.id,
        name: 'ROI Tracking Campaign',
        status: 'active',
        conversionTracking: true
      });

      // Step 1: Set up conversion tracking
      const conversionSetupResponse = await request(app)
        .post(`/api/sponsor/campaigns/${testCampaign.id}/conversions/setup`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          conversionEvents: [
            {
              name: 'page_view',
              value: 0,
              category: 'awareness'
            },
            {
              name: 'signup',
              value: 25,
              category: 'lead'
            },
            {
              name: 'trial_start',
              value: 50,
              category: 'activation'
            },
            {
              name: 'subscription',
              value: 99,
              category: 'revenue'
            }
          ],
          attributionWindow: {
            click: 30, // days
            view: 7 // days
          },
          trackingMethods: ['pixel', 'postback', 'utm']
        })
        .expect(200);

      expect(conversionSetupResponse.body.trackingConfigured).toBe(true);
      expect(conversionSetupResponse.body.pixelCode).toBeDefined();

      // Step 2: Record conversion events
      const conversionEvents = [
        { eventType: 'page_view', userId: 'user-123', timestamp: new Date(), value: 0 },
        { eventType: 'signup', userId: 'user-123', timestamp: new Date(), value: 25 },
        { eventType: 'trial_start', userId: 'user-456', timestamp: new Date(), value: 50 },
        { eventType: 'subscription', userId: 'user-789', timestamp: new Date(), value: 99 }
      ];

      for (const event of conversionEvents) {
        const eventResponse = await request(app)
          .post(`/api/sponsor/campaigns/${testCampaign.id}/conversions/track`)
          .set('Authorization', `Bearer ${sponsorToken}`)
          .send(event)
          .expect(200);

        expect(eventResponse.body.eventRecorded).toBe(true);
      }

      // Step 3: Get attribution analysis
      const attributionResponse = await request(app)
        .get(`/api/sponsor/campaigns/${testCampaign.id}/attribution`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          model: 'last_click',
          dateRange: 'last_30_days'
        })
        .expect(200);

      expect(attributionResponse.body.conversions).toBeDefined();
      expect(attributionResponse.body.revenue).toBeDefined();
      expect(attributionResponse.body.attributionPaths).toBeDefined();

      // Step 4: Compare attribution models
      const modelComparisonResponse = await request(app)
        .get(`/api/sponsor/campaigns/${testCampaign.id}/attribution/compare`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          models: 'first_click,last_click,linear,time_decay'
        })
        .expect(200);

      expect(modelComparisonResponse.body.models).toHaveLength(4);
      expect(modelComparisonResponse.body.recommendations).toBeDefined();

      // Step 5: Calculate comprehensive ROI metrics
      const roiResponse = await request(app)
        .get(`/api/sponsor/campaigns/${testCampaign.id}/roi`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          includeLifetimeValue: true,
          attributionModel: 'time_decay'
        })
        .expect(200);

      expect(roiResponse.body.roas).toBeDefined();
      expect(roiResponse.body.roi).toBeDefined();
      expect(roiResponse.body.cpa).toBeDefined();
      expect(roiResponse.body.ltv).toBeDefined();
      expect(roiResponse.body.paybackPeriod).toBeDefined();

      // Step 6: Set up automated ROI reporting
      const reportingSetupResponse = await request(app)
        .post(`/api/sponsor/campaigns/${testCampaign.id}/roi/reporting`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          frequency: 'weekly',
          recipients: ['sponsor@techcorp.com', 'marketing@techcorp.com'],
          metrics: ['roas', 'roi', 'cpa', 'ltv'],
          thresholds: {
            roas: { min: 3.0, alert: true },
            cpa: { max: 75, alert: true }
          },
          format: 'dashboard_link'
        })
        .expect(200);

      expect(reportingSetupResponse.body.reportingConfigured).toBe(true);
    });

    test('should handle cross-channel attribution and unified reporting', async () => {
      // Create multiple campaigns across different channels
      const campaigns = [];
      const channelTypes = ['display', 'content_sponsorship', 'influencer', 'social'];

      for (const channelType of channelTypes) {
        const campaign = await createTestCampaign({
          sponsorId: testSponsor.id,
          name: `${channelType} Campaign`,
          channelType: channelType,
          status: 'active'
        });
        campaigns.push(campaign);
      }

      // Step 1: Set up cross-channel tracking
      const crossChannelSetupResponse = await request(app)
        .post('/api/sponsor/attribution/cross-channel/setup')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          campaignIds: campaigns.map(c => c.id),
          userIdMapping: {
            email: true,
            deviceId: true,
            customerId: true
          },
          touchpointTracking: {
            impressions: true,
            clicks: true,
            views: true,
            engagements: true
          },
          attributionSettings: {
            lookbackWindow: 90, // days
            weightDecay: 0.8,
            positionBased: {
              firstTouch: 0.4,
              lastTouch: 0.4,
              middle: 0.2
            }
          }
        })
        .expect(200);

      expect(crossChannelSetupResponse.body.crossChannelTrackingEnabled).toBe(true);

      // Step 2: Generate unified performance report
      const unifiedReportResponse = await request(app)
        .get('/api/sponsor/reports/unified')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          campaignIds: campaigns.map(c => c.id).join(','),
          dateRange: 'last_30_days',
          groupBy: 'channel,campaign',
          metrics: 'impressions,clicks,conversions,spend,roas'
        })
        .expect(200);

      expect(unifiedReportResponse.body.channelPerformance).toBeDefined();
      expect(unifiedReportResponse.body.crossChannelInsights).toBeDefined();
      expect(unifiedReportResponse.body.recommendedOptimizations).toBeDefined();

      // Step 3: Analyze customer journey
      const journeyAnalysisResponse = await request(app)
        .get('/api/sponsor/attribution/customer-journey')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          campaignIds: campaigns.map(c => c.id).join(','),
          segmentBy: 'conversion_value'
        })
        .expect(200);

      expect(journeyAnalysisResponse.body.journeyPaths).toBeDefined();
      expect(journeyAnalysisResponse.body.touchpointEffectiveness).toBeDefined();
      expect(journeyAnalysisResponse.body.optimizationOpportunities).toBeDefined();

      // Step 4: Get budget allocation recommendations
      const budgetRecommendationResponse = await request(app)
        .get('/api/sponsor/optimization/budget-allocation')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .query({
          totalBudget: 50000,
          optimizeFor: 'roas',
          constraints: JSON.stringify({
            minChannelBudget: 5000,
            maxChannelBudget: 25000
          })
        })
        .expect(200);

      expect(budgetRecommendationResponse.body.recommendations).toBeDefined();
      expect(budgetRecommendationResponse.body.projectedROAS).toBeDefined();
      expect(budgetRecommendationResponse.body.confidenceLevel).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle campaign creation with insufficient budget', async () => {
      const insufficientBudgetCampaign = {
        name: 'Low Budget Campaign',
        budget: { total: 10, daily: 1 }, // Very low budget
        targeting: { interests: ['technology'] }
      };

      const response = await request(app)
        .post('/api/sponsor/campaigns')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send(insufficientBudgetCampaign)
        .expect(400);

      expect(response.body.error).toContain('budget');
      expect(response.body.minimumBudget).toBeDefined();
    });

    test('should handle invalid targeting parameters', async () => {
      const invalidTargetingCampaign = {
        name: 'Invalid Targeting Campaign',
        budget: { total: 5000, daily: 200 },
        targeting: {
          demographics: {
            ageRange: { min: 65, max: 25 } // Invalid age range
          },
          interests: ['nonexistent_interest']
        }
      };

      const response = await request(app)
        .post('/api/sponsor/campaigns')
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send(invalidTargetingCampaign)
        .expect(400);

      expect(response.body.validationErrors).toBeDefined();
      expect(response.body.validationErrors.length).toBeGreaterThan(0);
    });

    test('should handle payment failures gracefully', async () => {
      const testCampaign = await createTestCampaign({
        sponsorId: testSponsor.id,
        name: 'Payment Failure Test',
        status: 'active'
      });

      // Mock payment failure
      mockPaymentProcessor.mockRejectedValue(new Error('Payment declined'));

      const response = await request(app)
        .post(`/api/sponsor/campaigns/${testCampaign.id}/payment`)
        .set('Authorization', `Bearer ${sponsorToken}`)
        .send({
          amount: 1000,
          paymentMethodId: 'pm_declined_card'
        })
        .expect(402);

      expect(response.body.paymentFailed).toBe(true);
      expect(response.body.retryOptions).toBeDefined();
    });
  });
});