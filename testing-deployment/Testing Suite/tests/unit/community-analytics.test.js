const { CommunityAnalytics } = require('../../src/analytics/community-analytics');
const { UserEngagementService } = require('../../src/services/user-engagement-service');
const { ContentMetricsService } = require('../../src/services/content-metrics-service');
const { SocialInsightsService } = require('../../src/services/social-insights-service');

describe('Community Analytics', () => {
  let communityAnalytics;
  let mockUserEngagementService;
  let mockContentMetricsService;
  let mockSocialInsightsService;

  beforeEach(() => {
    mockUserEngagementService = {
      getUserActivity: jest.fn(),
      getEngagementTrends: jest.fn(),
      getRetentionMetrics: jest.fn(),
      getActiveUsers: jest.fn(),
      getUserSegmentation: jest.fn(),
      getChurnAnalysis: jest.fn()
    };

    mockContentMetricsService = {
      getContentPerformance: jest.fn(),
      getPopularContent: jest.fn(),
      getContentEngagement: jest.fn(),
      getContentTrends: jest.fn(),
      getReadingPatterns: jest.fn(),
      getContentCategories: jest.fn()
    };

    mockSocialInsightsService = {
      getSocialMetrics: jest.fn(),
      getShareAnalysis: jest.fn(),
      getInfluencerMetrics: jest.fn(),
      getSentimentAnalysis: jest.fn(),
      getViralityScores: jest.fn(),
      getCommunityGrowth: jest.fn()
    };

    communityAnalytics = new CommunityAnalytics(
      mockUserEngagementService,
      mockContentMetricsService,
      mockSocialInsightsService
    );
  });

  describe('User Engagement Analytics', () => {
    test('should analyze user engagement patterns', async () => {
      const timeRange = { startDate: '2024-01-01', endDate: '2024-01-31' };
      
      const mockEngagementData = {
        totalUsers: 50000,
        activeUsers: {
          daily: 12000,
          weekly: 28000,
          monthly: 45000
        },
        engagement: {
          averageSessionDuration: 485,
          pagesPerSession: 3.2,
          bounceRate: 0.35,
          returnVisitorRate: 0.68
        },
        activities: {
          storiesRead: 125000,
          storiesShared: 8500,
          commentsPosted: 15000,
          likesGiven: 45000,
          profileViews: 32000
        },
        trends: {
          dailyActive: [
            { date: '2024-01-01', count: 11500 },
            { date: '2024-01-02', count: 12200 },
            { date: '2024-01-03', count: 11800 }
          ],
          weeklyActive: [
            { week: 1, count: 26500 },
            { week: 2, count: 27800 },
            { week: 3, count: 28200 },
            { week: 4, count: 28900 }
          ]
        },
        segmentation: {
          newUsers: 8500,
          returningUsers: 36500,
          powerUsers: 5000,
          churnRisk: 2800
        }
      };

      mockUserEngagementService.getEngagementTrends.mockResolvedValue(mockEngagementData);

      const result = await communityAnalytics.getUserEngagement(timeRange);

      expect(result).toEqual(mockEngagementData);
      expect(result.activeUsers.daily).toBe(12000);
      expect(result.segmentation.powerUsers).toBe(5000);
    });

    test('should calculate user retention metrics', async () => {
      const cohortParams = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        cohortType: 'registration'
      };

      const mockRetentionData = {
        cohorts: [
          {
            cohortDate: '2024-01-01',
            initialUsers: 1000,
            retention: {
              day1: 0.85,
              day7: 0.65,
              day30: 0.45,
              day90: 0.32
            }
          },
          {
            cohortDate: '2024-01-08',
            initialUsers: 1200,
            retention: {
              day1: 0.87,
              day7: 0.68,
              day30: 0.48,
              day90: 0.35
            }
          }
        ],
        averageRetention: {
          day1: 0.86,
          day7: 0.665,
          day30: 0.465,
          day90: 0.335
        },
        churnAnalysis: {
          churnRate: 0.12,
          churnReasons: [
            { reason: 'lack_of_content', percentage: 35 },
            { reason: 'poor_ui_experience', percentage: 25 },
            { reason: 'competition', percentage: 20 },
            { reason: 'pricing', percentage: 15 },
            { reason: 'other', percentage: 5 }
          ],
          atRiskUsers: 2800,
          recoveredUsers: 450
        }
      };

      mockUserEngagementService.getRetentionMetrics.mockResolvedValue(mockRetentionData);

      const result = await communityAnalytics.getRetentionAnalysis(cohortParams);

      expect(result).toEqual(mockRetentionData);
      expect(result.averageRetention.day30).toBe(0.465);
      expect(result.churnAnalysis.churnRate).toBe(0.12);
    });

    test('should segment users by behavior patterns', async () => {
      const segmentationParams = {
        timeRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        criteria: ['activity_level', 'content_preference', 'engagement_type']
      };

      const mockSegmentationData = {
        segments: [
          {
            name: 'Power Readers',
            size: 5000,
            characteristics: {
              averageStoriesPerWeek: 25,
              averageTimePerStory: 6.5,
              shareRate: 0.15,
              commentRate: 0.08
            },
            demographics: {
              ageRange: '25-45',
              primaryInterests: ['technology', 'science', 'business']
            }
          },
          {
            name: 'Social Sharers',
            size: 8500,
            characteristics: {
              averageStoriesPerWeek: 12,
              averageTimePerStory: 4.2,
              shareRate: 0.35,
              commentRate: 0.25
            },
            demographics: {
              ageRange: '18-35',
              primaryInterests: ['entertainment', 'lifestyle', 'social']
            }
          },
          {
            name: 'Casual Browsers',
            size: 32000,
            characteristics: {
              averageStoriesPerWeek: 6,
              averageTimePerStory: 3.8,
              shareRate: 0.05,
              commentRate: 0.02
            },
            demographics: {
              ageRange: '35-65',
              primaryInterests: ['news', 'general', 'health']
            }
          }
        ],
        insights: {
          highValueSegments: ['Power Readers', 'Social Sharers'],
          growthOpportunities: ['Casual Browsers'],
          targetingRecommendations: [
            'Focus retention efforts on Power Readers',
            'Encourage social features for Social Sharers',
            'Improve onboarding for Casual Browsers'
          ]
        }
      };

      mockUserEngagementService.getUserSegmentation.mockResolvedValue(mockSegmentationData);

      const result = await communityAnalytics.getUserSegmentation(segmentationParams);

      expect(result).toEqual(mockSegmentationData);
      expect(result.segments).toHaveLength(3);
      expect(result.insights.highValueSegments).toContain('Power Readers');
    });
  });

  describe('Content Performance Analytics', () => {
    test('should analyze content performance metrics', async () => {
      const contentParams = {
        timeRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        categories: ['technology', 'entertainment', 'education'],
        metrics: ['views', 'shares', 'comments', 'likes']
      };

      const mockContentPerformance = {
        overview: {
          totalStories: 2500,
          totalViews: 1250000,
          totalShares: 85000,
          totalComments: 42000,
          totalLikes: 180000,
          averageEngagementRate: 0.245
        },
        topPerformers: [
          {
            id: 'story-1',
            title: 'The Future of AI',
            category: 'technology',
            metrics: {
              views: 45000,
              shares: 2800,
              comments: 450,
              likes: 3200,
              engagementRate: 0.156
            },
            performance: {
              viralityScore: 0.85,
              qualityScore: 0.92,
              sentimentScore: 0.78
            }
          },
          {
            id: 'story-2',
            title: 'Space Exploration Update',
            category: 'science',
            metrics: {
              views: 38000,
              shares: 2200,
              comments: 380,
              likes: 2800,
              engagementRate: 0.142
            },
            performance: {
              viralityScore: 0.72,
              qualityScore: 0.88,
              sentimentScore: 0.85
            }
          }
        ],
        categoryBreakdown: {
          technology: {
            storyCount: 850,
            totalViews: 425000,
            averageEngagement: 0.28,
            topTags: ['AI', 'blockchain', 'startup']
          },
          entertainment: {
            storyCount: 650,
            totalViews: 320000,
            averageEngagement: 0.35,
            topTags: ['movies', 'music', 'celebrity']
          },
          education: {
            storyCount: 450,
            totalViews: 180000,
            averageEngagement: 0.22,
            topTags: ['learning', 'tutorial', 'tips']
          }
        },
        trends: {
          dailyViews: [
            { date: '2024-01-01', views: 38000 },
            { date: '2024-01-02', views: 42000 },
            { date: '2024-01-03', views: 39500 }
          ],
          engagementTrends: {
            shares: { trend: 'increasing', change: '+12%' },
            comments: { trend: 'stable', change: '+2%' },
            likes: { trend: 'increasing', change: '+8%' }
          }
        }
      };

      mockContentMetricsService.getContentPerformance.mockResolvedValue(mockContentPerformance);

      const result = await communityAnalytics.getContentPerformance(contentParams);

      expect(result).toEqual(mockContentPerformance);
      expect(result.topPerformers).toHaveLength(2);
      expect(result.categoryBreakdown.technology.averageEngagement).toBe(0.28);
    });

    test('should analyze reading patterns and preferences', async () => {
      const readingParams = {
        timeRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        userSegments: ['all']
      };

      const mockReadingPatterns = {
        readingBehavior: {
          averageReadingTime: 4.5,
          completionRate: 0.68,
          skipRate: 0.15,
          bookmarkRate: 0.12,
          shareAfterReading: 0.08
        },
        timePatterns: {
          peakHours: [
            { hour: 8, activity: 0.85 },
            { hour: 12, activity: 0.92 },
            { hour: 19, activity: 0.88 },
            { hour: 22, activity: 0.76 }
          ],
          peakDays: [
            { day: 'Monday', activity: 0.78 },
            { day: 'Tuesday', activity: 0.85 },
            { day: 'Wednesday', activity: 0.92 },
            { day: 'Thursday', activity: 0.88 },
            { day: 'Friday', activity: 0.82 },
            { day: 'Saturday', activity: 0.65 },
            { day: 'Sunday', activity: 0.71 }
          ]
        },
        preferences: {
          contentLength: {
            short: { preference: 0.45, avgTime: 2.5 },
            medium: { preference: 0.35, avgTime: 4.8 },
            long: { preference: 0.20, avgTime: 8.2 }
          },
          contentTypes: {
            narrative: 0.38,
            informational: 0.32,
            entertainment: 0.20,
            educational: 0.10
          },
          devicePreference: {
            mobile: 0.68,
            desktop: 0.25,
            tablet: 0.07
          }
        },
        engagement: {
          scrollDepth: {
            '25%': 0.85,
            '50%': 0.68,
            '75%': 0.45,
            '100%': 0.32
          },
          interactionPoints: [
            { position: 'beginning', interactions: 0.15 },
            { position: 'middle', interactions: 0.08 },
            { position: 'end', interactions: 0.25 }
          ]
        }
      };

      mockContentMetricsService.getReadingPatterns.mockResolvedValue(mockReadingPatterns);

      const result = await communityAnalytics.getReadingPatterns(readingParams);

      expect(result).toEqual(mockReadingPatterns);
      expect(result.readingBehavior.completionRate).toBe(0.68);
      expect(result.preferences.devicePreference.mobile).toBe(0.68);
    });
  });

  describe('Social Insights Analytics', () => {
    test('should analyze social sharing patterns', async () => {
      const socialParams = {
        timeRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        platforms: ['twitter', 'facebook', 'linkedin', 'instagram']
      };

      const mockSocialInsights = {
        overview: {
          totalShares: 85000,
          totalReach: 2500000,
          totalEngagement: 320000,
          viralCoefficient: 1.35,
          averageSharesPerUser: 1.7
        },
        platformBreakdown: {
          twitter: {
            shares: 35000,
            reach: 1200000,
            engagement: 145000,
            averageEngagementRate: 0.12,
            topHashtags: ['#storytelling', '#community', '#tech']
          },
          facebook: {
            shares: 28000,
            reach: 800000,
            engagement: 110000,
            averageEngagementRate: 0.14,
            topReactions: ['like', 'love', 'wow']
          },
          linkedin: {
            shares: 15000,
            reach: 350000,
            engagement: 42000,
            averageEngagementRate: 0.12,
            topIndustries: ['technology', 'business', 'education']
          },
          instagram: {
            shares: 7000,
            reach: 150000,
            engagement: 23000,
            averageEngagementRate: 0.15,
            topStoryFormats: ['story', 'reel', 'post']
          }
        },
        influencerMetrics: {
          topInfluencers: [
            {
              id: 'inf-1',
              name: 'TechGuru',
              platform: 'twitter',
              followers: 150000,
              shares: 450,
              reach: 95000,
              engagement: 12500
            },
            {
              id: 'inf-2',
              name: 'StoryTeller',
              platform: 'facebook',
              followers: 85000,
              shares: 320,
              reach: 68000,
              engagement: 8500
            }
          ],
          influencerImpact: {
            totalReach: 500000,
            totalEngagement: 65000,
            conversionRate: 0.08
          }
        },
        viralityAnalysis: {
          viralStories: [
            {
              id: 'story-viral-1',
              title: 'Breaking Tech News',
              viralityScore: 0.92,
              shareVelocity: 450,
              peakReach: 280000,
              lifespan: 72
            }
          ],
          viralityFactors: [
            { factor: 'timing', importance: 0.25 },
            { factor: 'content_quality', importance: 0.30 },
            { factor: 'audience_fit', importance: 0.20 },
            { factor: 'influencer_boost', importance: 0.15 },
            { factor: 'platform_algorithm', importance: 0.10 }
          ]
        }
      };

      mockSocialInsightsService.getSocialMetrics.mockResolvedValue(mockSocialInsights);

      const result = await communityAnalytics.getSocialInsights(socialParams);

      expect(result).toEqual(mockSocialInsights);
      expect(result.platformBreakdown.twitter.shares).toBe(35000);
      expect(result.influencerMetrics.topInfluencers).toHaveLength(2);
    });

    test('should perform sentiment analysis on community content', async () => {
      const sentimentParams = {
        timeRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        sources: ['comments', 'shares', 'reviews']
      };

      const mockSentimentAnalysis = {
        overall: {
          positive: 0.65,
          neutral: 0.25,
          negative: 0.10,
          averageScore: 0.775,
          totalAnalyzed: 125000
        },
        trends: {
          daily: [
            { date: '2024-01-01', positive: 0.68, neutral: 0.22, negative: 0.10 },
            { date: '2024-01-02', positive: 0.72, neutral: 0.18, negative: 0.10 },
            { date: '2024-01-03', positive: 0.69, neutral: 0.21, negative: 0.10 }
          ],
          weekly: [
            { week: 1, sentiment: 0.78 },
            { week: 2, sentiment: 0.82 },
            { week: 3, sentiment: 0.75 },
            { week: 4, sentiment: 0.79 }
          ]
        },
        topics: {
          positive: [
            { topic: 'story quality', mentions: 15000, sentiment: 0.85 },
            { topic: 'user experience', mentions: 12000, sentiment: 0.78 },
            { topic: 'community features', mentions: 8500, sentiment: 0.82 }
          ],
          negative: [
            { topic: 'loading speed', mentions: 3500, sentiment: 0.25 },
            { topic: 'mobile app', mentions: 2800, sentiment: 0.30 },
            { topic: 'content discovery', mentions: 2200, sentiment: 0.28 }
          ]
        },
        emotions: {
          joy: 0.35,
          trust: 0.25,
          anticipation: 0.15,
          surprise: 0.10,
          anger: 0.05,
          sadness: 0.03,
          fear: 0.02,
          disgust: 0.05
        },
        actionableInsights: [
          'Focus on improving mobile app experience',
          'Leverage positive sentiment around story quality',
          'Address loading speed concerns'
        ]
      };

      mockSocialInsightsService.getSentimentAnalysis.mockResolvedValue(mockSentimentAnalysis);

      const result = await communityAnalytics.getSentimentAnalysis(sentimentParams);

      expect(result).toEqual(mockSentimentAnalysis);
      expect(result.overall.positive).toBe(0.65);
      expect(result.emotions.joy).toBe(0.35);
    });
  });

  describe('Community Growth Analytics', () => {
    test('should analyze community growth metrics', async () => {
      const growthParams = {
        timeRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        granularity: 'daily'
      };

      const mockGrowthMetrics = {
        userGrowth: {
          newUsers: 8500,
          totalUsers: 58500,
          growthRate: 0.17,
          retentionRate: 0.68,
          churnRate: 0.12
        },
        acquisitionChannels: {
          organic: { users: 3400, percentage: 40, cost: 0 },
          social: { users: 2550, percentage: 30, cost: 2500 },
          referral: { users: 1700, percentage: 20, cost: 0 },
          paid: { users: 850, percentage: 10, cost: 8500 }
        },
        engagement: {
          dailyActiveUsers: 12000,
          weeklyActiveUsers: 28000,
          monthlyActiveUsers: 45000,
          stickinessRatio: 0.267
        },
        contentGrowth: {
          newStories: 450,
          totalStories: 15250,
          averageStoriesPerDay: 14.5,
          qualityScore: 0.82
        },
        trends: {
          userGrowth: [
            { date: '2024-01-01', newUsers: 275, totalUsers: 50000 },
            { date: '2024-01-02', newUsers: 310, totalUsers: 50310 },
            { date: '2024-01-03', newUsers: 285, totalUsers: 50595 }
          ],
          engagementGrowth: [
            { date: '2024-01-01', dau: 11500, wau: 26800, mau: 43500 },
            { date: '2024-01-02', dau: 12100, wau: 27200, mau: 44100 }
          ]
        },
        projections: {
          nextMonth: {
            expectedNewUsers: 9200,
            expectedTotalUsers: 67700,
            confidenceInterval: { min: 65000, max: 70400 }
          },
          nextQuarter: {
            expectedNewUsers: 28500,
            expectedTotalUsers: 87000,
            confidenceInterval: { min: 82000, max: 92000 }
          }
        }
      };

      mockSocialInsightsService.getCommunityGrowth.mockResolvedValue(mockGrowthMetrics);

      const result = await communityAnalytics.getCommunityGrowth(growthParams);

      expect(result).toEqual(mockGrowthMetrics);
      expect(result.userGrowth.growthRate).toBe(0.17);
      expect(result.acquisitionChannels.organic.percentage).toBe(40);
    });
  });

  describe('Advanced Analytics Features', () => {
    test('should perform cohort analysis', async () => {
      const cohortParams = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        cohortType: 'monthly',
        metric: 'retention'
      };

      const mockCohortAnalysis = {
        cohorts: [
          {
            cohortPeriod: '2024-01',
            userCount: 8500,
            retentionRates: {
              month0: 1.00,
              month1: 0.65,
              month2: 0.45,
              month3: 0.32
            }
          },
          {
            cohortPeriod: '2023-12',
            userCount: 7800,
            retentionRates: {
              month0: 1.00,
              month1: 0.68,
              month2: 0.48,
              month3: 0.35,
              month4: 0.28
            }
          }
        ],
        insights: {
          bestPerformingCohort: '2023-12',
          averageRetentionAtMonth1: 0.665,
          retentionTrend: 'improving',
          recommendations: [
            'Focus on month 1 onboarding experience',
            'Implement re-engagement campaigns for month 2-3 users'
          ]
        }
      };

      mockUserEngagementService.getRetentionMetrics.mockResolvedValue(mockCohortAnalysis);

      const result = await communityAnalytics.getCohortAnalysis(cohortParams);

      expect(result.cohorts).toHaveLength(2);
      expect(result.insights.bestPerformingCohort).toBe('2023-12');
    });

    test('should analyze user journey and funnel metrics', async () => {
      const funnelParams = {
        timeRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        steps: ['landing', 'signup', 'first_story', 'first_share', 'weekly_active']
      };

      const mockFunnelAnalysis = {
        funnel: [
          { step: 'landing', users: 100000, conversionRate: 1.00 },
          { step: 'signup', users: 15000, conversionRate: 0.15 },
          { step: 'first_story', users: 12000, conversionRate: 0.80 },
          { step: 'first_share', users: 6000, conversionRate: 0.50 },
          { step: 'weekly_active', users: 4200, conversionRate: 0.70 }
        ],
        dropoffAnalysis: {
          biggestDropoff: { from: 'landing', to: 'signup', dropoff: 0.85 },
          improvementOpportunities: [
            { step: 'signup', recommendation: 'Simplify registration process' },
            { step: 'first_share', recommendation: 'Improve sharing UX' }
          ]
        },
        journeyPatterns: {
          averageTimeToFirstStory: 24, // hours
          averageTimeToFirstShare: 72, // hours
          averageStoriesToFirstShare: 3.2,
          powerUserPath: ['signup', 'first_story', 'multiple_stories', 'first_share', 'weekly_active']
        }
      };

      mockUserEngagementService.getUserActivity.mockResolvedValue(mockFunnelAnalysis);

      const result = await communityAnalytics.getFunnelAnalysis(funnelParams);

      expect(result.funnel).toHaveLength(5);
      expect(result.dropoffAnalysis.biggestDropoff.dropoff).toBe(0.85);
    });

    test('should generate predictive analytics insights', async () => {
      const predictionParams = {
        timeRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        metrics: ['user_growth', 'content_engagement', 'churn_risk']
      };

      const mockPredictiveInsights = {
        userGrowthPrediction: {
          nextMonth: {
            predicted: 9200,
            confidence: 0.85,
            factors: ['historical_growth', 'seasonal_trends', 'marketing_campaigns']
          },
          nextQuarter: {
            predicted: 28500,
            confidence: 0.72,
            factors: ['market_conditions', 'competitive_landscape', 'product_updates']
          }
        },
        churnPrediction: {
          atRiskUsers: 2800,
          churnProbability: 0.15,
          topRiskFactors: [
            { factor: 'low_engagement', weight: 0.35 },
            { factor: 'infrequent_visits', weight: 0.25 },
            { factor: 'no_social_activity', weight: 0.20 },
            { factor: 'old_account', weight: 0.20 }
          ],
          interventionRecommendations: [
            'Send personalized content recommendations',
            'Trigger re-engagement email campaign',
            'Offer premium features trial'
          ]
        },
        contentPerformancePrediction: {
          trendingTopics: [
            { topic: 'AI advancements', probability: 0.78, timeframe: '7_days' },
            { topic: 'sustainable living', probability: 0.65, timeframe: '14_days' }
          ],
          optimalPublishingTimes: [
            { day: 'Wednesday', hour: 14, engagement_multiplier: 1.25 },
            { day: 'Sunday', hour: 19, engagement_multiplier: 1.18 }
          ]
        }
      };

      const result = await communityAnalytics.getPredictiveInsights(predictionParams);

      expect(result.userGrowthPrediction.nextMonth.predicted).toBe(9200);
      expect(result.churnPrediction.atRiskUsers).toBe(2800);
    });
  });

  describe('Real-time Analytics', () => {
    test('should provide real-time community metrics', async () => {
      const mockRealTimeMetrics = {
        timestamp: new Date(),
        liveUsers: 1250,
        currentActivity: {
          storiesBeingRead: 850,
          activeCommenters: 45,
          activeSharers: 28,
          newSignups: 12
        },
        trending: {
          stories: [
            { id: 'story-trending-1', title: 'Breaking News', views: 2500, velocity: 125 },
            { id: 'story-trending-2', title: 'Tech Update', views: 1800, velocity: 95 }
          ],
          topics: ['technology', 'science', 'entertainment'],
          hashtags: ['#breaking', '#tech', '#innovation']
        },
        alerts: [
          {
            type: 'viral_content',
            message: 'Story "Breaking News" showing viral potential',
            timestamp: new Date(),
            severity: 'info'
          }
        ],
        performance: {
          avgResponseTime: 245,
          serverLoad: 0.68,
          errorRate: 0.002
        }
      };

      mockUserEngagementService.getActiveUsers.mockResolvedValue(mockRealTimeMetrics);

      const result = await communityAnalytics.getRealTimeMetrics();

      expect(result).toEqual(mockRealTimeMetrics);
      expect(result.liveUsers).toBe(1250);
      expect(result.trending.stories).toHaveLength(2);
    });
  });

  describe('Export and Reporting', () => {
    test('should generate comprehensive analytics reports', async () => {
      const reportParams = {
        timeRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        sections: ['overview', 'user_engagement', 'content_performance', 'social_insights'],
        format: 'detailed'
      };

      const mockAnalyticsReport = {
        reportId: 'report-analytics-2024-01',
        generatedAt: new Date(),
        timeRange: reportParams.timeRange,
        summary: {
          totalUsers: 58500,
          newUsers: 8500,
          activeUsers: 45000,
          totalContent: 15250,
          totalEngagements: 320000
        },
        sections: {
          overview: {
            keyMetrics: {
              userGrowthRate: 0.17,
              engagementRate: 0.245,
              contentGrowthRate: 0.03,
              retentionRate: 0.68
            },
            highlights: [
              'User growth exceeded target by 15%',
              'Engagement rate improved by 8%',
              'Social sharing increased by 12%'
            ]
          },
          userEngagement: {
            // Previous engagement data structure
          },
          contentPerformance: {
            // Previous content performance data structure
          },
          socialInsights: {
            // Previous social insights data structure
          }
        },
        recommendations: [
          'Focus on mobile user experience improvements',
          'Expand content categories with high engagement',
          'Implement advanced social sharing features'
        ],
        nextSteps: [
          'Monitor Q2 user growth trends',
          'A/B test new content recommendation algorithm',
          'Launch influencer partnership program'
        ]
      };

      const result = await communityAnalytics.generateAnalyticsReport(reportParams);

      expect(result.reportId).toContain('report-analytics');
      expect(result.sections.overview.keyMetrics.userGrowthRate).toBe(0.17);
      expect(result.recommendations).toHaveLength(3);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing data gracefully', async () => {
      const timeRange = { startDate: '2024-01-01', endDate: '2024-01-31' };

      mockUserEngagementService.getEngagementTrends.mockRejectedValue(new Error('Data not available'));

      await expect(communityAnalytics.getUserEngagement(timeRange))
        .rejects.toThrow('Data not available');
    });

    test('should handle invalid date ranges', async () => {
      const invalidTimeRange = { startDate: '2024-01-31', endDate: '2024-01-01' };

      await expect(communityAnalytics.getUserEngagement(invalidTimeRange))
        .rejects.toThrow('Invalid date range');
    });

    test('should provide fallback data when external services fail', async () => {
      const timeRange = { startDate: '2024-01-01', endDate: '2024-01-31' };

      mockUserEngagementService.getEngagementTrends.mockResolvedValue(null);
      mockContentMetricsService.getContentPerformance.mockResolvedValue(null);

      const fallbackData = {
        message: 'Some analytics services are temporarily unavailable',
        partialData: true,
        availableMetrics: ['basic_user_count', 'content_count']
      };

      const result = await communityAnalytics.getUserEngagement(timeRange);

      expect(result.partialData).toBe(true);
    });
  });
});