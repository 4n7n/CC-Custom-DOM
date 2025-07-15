const { SponsorDashboard } = require('../../src/dashboard/sponsor-dashboard');
const { AnalyticsService } = require('../../src/services/analytics-service');
const { PaymentService } = require('../../src/services/payment-service');
const { CampaignService } = require('../../src/services/campaign-service');

describe('Sponsor Dashboard', () => {
  let sponsorDashboard;
  let mockAnalyticsService;
  let mockPaymentService;
  let mockCampaignService;

  beforeEach(() => {
    mockAnalyticsService = {
      getEngagementMetrics: jest.fn(),
      getAudienceInsights: jest.fn(),
      getROIAnalysis: jest.fn(),
      getPerformanceReports: jest.fn(),
      getRealtimeMetrics: jest.fn(),
      exportData: jest.fn(),
      getNotifications: jest.fn()
    };

    mockPaymentService = {
      processPayment: jest.fn(),
      getPaymentHistory: jest.fn(),
      getBillingInfo: jest.fn(),
      updatePaymentMethod: jest.fn(),
      generateInvoice: jest.fn()
    };

    mockCampaignService = {
      createCampaign: jest.fn(),
      updateCampaign: jest.fn(),
      getCampaigns: jest.fn(),
      getCampaignPerformance: jest.fn(),
      pauseCampaign: jest.fn(),
      resumeCampaign: jest.fn(),
      deleteCampaign: jest.fn()
    };

    sponsorDashboard = new SponsorDashboard(
      mockAnalyticsService,
      mockPaymentService,
      mockCampaignService
    );
  });

  describe('Dashboard Initialization', () => {
    test('should initialize with sponsor data', async () => {
      const sponsorId = 'sponsor-123';
      const mockSponsorData = {
        id: sponsorId,
        name: 'Tech Corp',
        industry: 'Technology',
        tier: 'premium',
        activeCampaigns: 5,
        totalSpend: 50000,
        joinDate: '2023-01-01'
      };

      mockCampaignService.getCampaigns.mockResolvedValue([
        { id: 'camp-1', name: 'Summer Sale', status: 'active' },
        { id: 'camp-2', name: 'Product Launch', status: 'active' }
      ]);

      mockAnalyticsService.getEngagementMetrics.mockResolvedValue({
        totalImpressions: 1000000,
        totalClicks: 25000,
        totalConversions: 2500,
        ctr: 2.5,
        conversionRate: 10.0
      });

      const dashboard = await sponsorDashboard.initialize(sponsorId);

      expect(dashboard.sponsorInfo).toBeDefined();
      expect(dashboard.campaigns).toHaveLength(2);
      expect(dashboard.metrics).toBeDefined();
      expect(mockCampaignService.getCampaigns).toHaveBeenCalledWith(sponsorId);
    });

    test('should handle initialization errors gracefully', async () => {
      const sponsorId = 'invalid-sponsor';

      mockCampaignService.getCampaigns.mockRejectedValue(new Error('Sponsor not found'));

      await expect(sponsorDashboard.initialize(sponsorId)).rejects.toThrow('Sponsor not found');
    });
  });

  describe('Campaign Management', () => {
    test('should create new campaign successfully', async () => {
      const campaignData = {
        name: 'Holiday Campaign',
        budget: 10000,
        duration: 30,
        targetAudience: {
          ageRange: '25-45',
          interests: ['technology', 'gaming'],
          location: 'US'
        },
        creativeAssets: [
          { type: 'banner', url: 'https://example.com/banner.jpg' },
          { type: 'video', url: 'https://example.com/video.mp4' }
        ]
      };

      const mockCampaign = {
        id: 'camp-new',
        ...campaignData,
        status: 'draft',
        createdAt: new Date(),
        performance: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          spend: 0
        }
      };

      mockCampaignService.createCampaign.mockResolvedValue(mockCampaign);

      const result = await sponsorDashboard.createCampaign(campaignData);

      expect(result).toEqual(mockCampaign);
      expect(mockCampaignService.createCampaign).toHaveBeenCalledWith(campaignData);
    });

    test('should update existing campaign', async () => {
      const campaignId = 'camp-123';
      const updates = {
        budget: 15000,
        duration: 45,
        targetAudience: {
          ageRange: '18-65',
          interests: ['technology', 'gaming', 'entertainment']
        }
      };

      const updatedCampaign = {
        id: campaignId,
        name: 'Updated Campaign',
        ...updates,
        status: 'active',
        updatedAt: new Date()
      };

      mockCampaignService.updateCampaign.mockResolvedValue(updatedCampaign);

      const result = await sponsorDashboard.updateCampaign(campaignId, updates);

      expect(result).toEqual(updatedCampaign);
      expect(mockCampaignService.updateCampaign).toHaveBeenCalledWith(campaignId, updates);
    });

    test('should pause and resume campaigns', async () => {
      const campaignId = 'camp-active';

      mockCampaignService.pauseCampaign.mockResolvedValue({
        id: campaignId,
        status: 'paused',
        pausedAt: new Date()
      });

      mockCampaignService.resumeCampaign.mockResolvedValue({
        id: campaignId,
        status: 'active',
        resumedAt: new Date()
      });

      const pausedCampaign = await sponsorDashboard.pauseCampaign(campaignId);
      expect(pausedCampaign.status).toBe('paused');

      const resumedCampaign = await sponsorDashboard.resumeCampaign(campaignId);
      expect(resumedCampaign.status).toBe('active');
    });

    test('should handle campaign deletion with confirmation', async () => {
      const campaignId = 'camp-delete';
      const confirmationCode = 'DELETE-CONFIRM-123';

      mockCampaignService.deleteCampaign.mockResolvedValue({
        success: true,
        deletedAt: new Date(),
        campaignId: campaignId
      });

      const result = await sponsorDashboard.deleteCampaign(campaignId, confirmationCode);

      expect(result.success).toBe(true);
      expect(mockCampaignService.deleteCampaign).toHaveBeenCalledWith(campaignId, confirmationCode);
    });
  });

  describe('Analytics and Reporting', () => {
    test('should retrieve comprehensive campaign analytics', async () => {
      const campaignId = 'camp-analytics';
      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const mockAnalytics = {
        overview: {
          impressions: 500000,
          clicks: 12500,
          conversions: 1250,
          spend: 8500,
          ctr: 2.5,
          conversionRate: 10.0,
          cpa: 6.8,
          roas: 4.2
        },
        demographics: {
          age: {
            '18-24': 15,
            '25-34': 35,
            '35-44': 30,
            '45-54': 15,
            '55+': 5
          },
          gender: {
            male: 55,
            female: 43,
            other: 2
          },
          location: {
            'US': 70,
            'CA': 15,
            'UK': 10,
            'Other': 5
          }
        },
        performance: {
          daily: [
            { date: '2024-01-01', impressions: 16129, clicks: 403, conversions: 40 },
            { date: '2024-01-02', impressions: 15876, clicks: 397, conversions: 38 }
          ],
          hourly: [
            { hour: 0, impressions: 1000, clicks: 25, conversions: 2 },
            { hour: 1, impressions: 800, clicks: 20, conversions: 2 }
          ]
        },
        engagement: {
          avgTimeOnPage: 185,
          bounceRate: 35.5,
          pagesPerSession: 2.8,
          socialShares: 450,
          comments: 120,
          likes: 2300
        }
      };

      mockAnalyticsService.getEngagementMetrics.mockResolvedValue(mockAnalytics);

      const result = await sponsorDashboard.getCampaignAnalytics(campaignId, dateRange);

      expect(result).toEqual(mockAnalytics);
      expect(result.overview.roas).toBe(4.2);
      expect(result.demographics.age['25-34']).toBe(35);
    });

    test('should generate performance reports', async () => {
      const reportParams = {
        campaignIds: ['camp-1', 'camp-2'],
        metrics: ['impressions', 'clicks', 'conversions', 'spend'],
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        format: 'detailed'
      };

      const mockReport = {
        id: 'report-123',
        generatedAt: new Date(),
        timeRange: reportParams.dateRange,
        campaigns: [
          {
            id: 'camp-1',
            name: 'Campaign 1',
            metrics: {
              impressions: 250000,
              clicks: 6250,
              conversions: 625,
              spend: 4250
            },
            performance: {
              ctr: 2.5,
              conversionRate: 10.0,
              cpa: 6.8
            }
          },
          {
            id: 'camp-2',
            name: 'Campaign 2',
            metrics: {
              impressions: 300000,
              clicks: 7500,
              conversions: 750,
              spend: 5100
            },
            performance: {
              ctr: 2.5,
              conversionRate: 10.0,
              cpa: 6.8
            }
          }
        ],
        summary: {
          totalImpressions: 550000,
          totalClicks: 13750,
          totalConversions: 1375,
          totalSpend: 9350,
          avgCTR: 2.5,
          avgConversionRate: 10.0,
          avgCPA: 6.8
        }
      };

      mockAnalyticsService.getPerformanceReports.mockResolvedValue(mockReport);

      const result = await sponsorDashboard.generatePerformanceReport(reportParams);

      expect(result).toEqual(mockReport);
      expect(result.campaigns).toHaveLength(2);
      expect(result.summary.totalSpend).toBe(9350);
    });

    test('should provide real-time metrics', async () => {
      const campaignId = 'camp-realtime';

      const mockRealTimeMetrics = {
        timestamp: new Date(),
        live: {
          activeUsers: 1250,
          currentImpressions: 850,
          currentClicks: 21,
          currentConversions: 2,
          revenueToday: 145.50
        },
        trends: {
          impressionsTrend: 'increasing',
          clicksTrend: 'stable',
          conversionsTrend: 'increasing'
        },
        alerts: [
          {
            type: 'budget',
            message: 'Campaign approaching daily budget limit',
            severity: 'warning'
          }
        ]
      };

      mockAnalyticsService.getRealtimeMetrics.mockResolvedValue(mockRealTimeMetrics);

      const result = await sponsorDashboard.getRealTimeMetrics(campaignId);

      expect(result).toEqual(mockRealTimeMetrics);
      expect(result.live.activeUsers).toBe(1250);
      expect(result.alerts).toHaveLength(1);
    });
  });

  describe('Payment Management', () => {
    test('should process campaign payment successfully', async () => {
      const paymentData = {
        campaignId: 'camp-payment',
        amount: 5000,
        currency: 'USD',
        paymentMethod: {
          type: 'credit_card',
          lastFour: '1234',
          brand: 'visa'
        },
        billingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US'
        }
      };

      const mockPaymentResult = {
        id: 'payment-123',
        status: 'succeeded',
        amount: 5000,
        currency: 'USD',
        transactionId: 'tx_abc123',
        processedAt: new Date(),
        receipt: {
          url: 'https://example.com/receipt/payment-123',
          email: 'sponsor@example.com'
        }
      };

      mockPaymentService.processPayment.mockResolvedValue(mockPaymentResult);

      const result = await sponsorDashboard.processPayment(paymentData);

      expect(result).toEqual(mockPaymentResult);
      expect(result.status).toBe('succeeded');
      expect(mockPaymentService.processPayment).toHaveBeenCalledWith(paymentData);
    });

    test('should handle payment failures', async () => {
      const paymentData = {
        campaignId: 'camp-fail',
        amount: 1000,
        currency: 'USD',
        paymentMethod: {
          type: 'credit_card',
          lastFour: '0000'
        }
      };

      const mockFailedPayment = {
        id: 'payment-fail',
        status: 'failed',
        error: {
          code: 'card_declined',
          message: 'Your card was declined',
          suggestion: 'Please try a different payment method'
        }
      };

      mockPaymentService.processPayment.mockResolvedValue(mockFailedPayment);

      const result = await sponsorDashboard.processPayment(paymentData);

      expect(result.status).toBe('failed');
      expect(result.error.code).toBe('card_declined');
    });

    test('should retrieve payment history', async () => {
      const sponsorId = 'sponsor-123';
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        status: 'succeeded'
      };

      const mockPaymentHistory = [
        {
          id: 'payment-1',
          amount: 5000,
          currency: 'USD',
          status: 'succeeded',
          campaignId: 'camp-1',
          campaignName: 'Summer Sale',
          processedAt: '2024-01-15T10:30:00Z'
        },
        {
          id: 'payment-2',
          amount: 3000,
          currency: 'USD',
          status: 'succeeded',
          campaignId: 'camp-2',
          campaignName: 'Product Launch',
          processedAt: '2024-01-20T14:15:00Z'
        }
      ];

      mockPaymentService.getPaymentHistory.mockResolvedValue(mockPaymentHistory);

      const result = await sponsorDashboard.getPaymentHistory(sponsorId, filters);

      expect(result).toEqual(mockPaymentHistory);
      expect(result).toHaveLength(2);
    });

    test('should update payment method', async () => {
      const sponsorId = 'sponsor-123';
      const newPaymentMethod = {
        type: 'credit_card',
        token: 'pm_abc123',
        brand: 'mastercard',
        lastFour: '5678',
        expiryMonth: 12,
        expiryYear: 2025
      };

      const mockUpdatedMethod = {
        id: 'pm_new123',
        ...newPaymentMethod,
        isDefault: true,
        addedAt: new Date()
      };

      mockPaymentService.updatePaymentMethod.mockResolvedValue(mockUpdatedMethod);

      const result = await sponsorDashboard.updatePaymentMethod(sponsorId, newPaymentMethod);

      expect(result).toEqual(mockUpdatedMethod);
      expect(result.isDefault).toBe(true);
    });
  });

  describe('Audience Insights', () => {
    test('should provide detailed audience analysis', async () => {
      const campaignId = 'camp-audience';

      const mockAudienceInsights = {
        totalReach: 750000,
        uniqueUsers: 500000,
        demographics: {
          age: {
            '18-24': { count: 75000, percentage: 15, engagement: 'high' },
            '25-34': { count: 175000, percentage: 35, engagement: 'very high' },
            '35-44': { count: 150000, percentage: 30, engagement: 'medium' },
            '45-54': { count: 75000, percentage: 15, engagement: 'low' },
            '55+': { count: 25000, percentage: 5, engagement: 'very low' }
          },
          interests: [
            { category: 'Technology', affinity: 0.85, reach: 425000 },
            { category: 'Gaming', affinity: 0.72, reach: 360000 },
            { category: 'Entertainment', affinity: 0.68, reach: 340000 }
          ],
          behavior: {
            deviceTypes: {
              mobile: 65,
              desktop: 30,
              tablet: 5
            },
            timeOfDay: {
              morning: 20,
              afternoon: 35,
              evening: 30,
              night: 15
            },
            dayOfWeek: {
              monday: 12,
              tuesday: 14,
              wednesday: 15,
              thursday: 16,
              friday: 18,
              saturday: 14,
              sunday: 11
            }
          }
        },
        lookalike: {
          available: true,
          potentialReach: 1200000,
          similarity: 0.78,
          recommendedBudget: 8500
        }
      };

      mockAnalyticsService.getAudienceInsights.mockResolvedValue(mockAudienceInsights);

      const result = await sponsorDashboard.getAudienceInsights(campaignId);

      expect(result).toEqual(mockAudienceInsights);
      expect(result.demographics.age['25-34'].engagement).toBe('very high');
      expect(result.lookalike.available).toBe(true);
    });
  });

  describe('ROI Analysis', () => {
    test('should calculate comprehensive ROI metrics', async () => {
      const campaignId = 'camp-roi';
      const period = '30d';

      const mockROIAnalysis = {
        period: period,
        investment: {
          totalSpend: 10000,
          breakdown: {
            media: 8500,
            creative: 1000,
            management: 500
          }
        },
        returns: {
          totalRevenue: 45000,
          directRevenue: 35000,
          attributedRevenue: 10000,
          conversionValue: 42000
        },
        metrics: {
          roas: 4.5,
          roi: 350,
          cpa: 8.33,
          ltv: 125,
          paybackPeriod: 2.2
        },
        comparison: {
          previousPeriod: {
            roas: 3.8,
            roi: 280,
            improvement: '+18.4%'
          },
          industryBenchmark: {
            roas: 3.2,
            roi: 220,
            performance: 'above average'
          }
        },
        projections: {
          nextMonth: {
            estimatedSpend: 12000,
            projectedRevenue: 52000,
            expectedROI: 333
          },
          nextQuarter: {
            estimatedSpend: 35000,
            projectedRevenue: 148000,
            expectedROI: 323
          }
        }
      };

      mockAnalyticsService.getROIAnalysis.mockResolvedValue(mockROIAnalysis);

      const result = await sponsorDashboard.getROIAnalysis(campaignId, period);

      expect(result).toEqual(mockROIAnalysis);
      expect(result.metrics.roas).toBe(4.5);
      expect(result.comparison.previousPeriod.improvement).toBe('+18.4%');
    });
  });

  describe('Dashboard Widgets', () => {
    test('should load dashboard widgets data', async () => {
      const sponsorId = 'sponsor-123';

      const mockWidgetData = {
        summary: {
          activeCampaigns: 5,
          totalSpend: 50000,
          totalImpressions: 2500000,
          totalConversions: 12500,
          avgROAS: 4.2
        },
        recentActivity: [
          { type: 'campaign_created', campaign: 'Holiday Sale', timestamp: '2024-01-15T10:00:00Z' },
          { type: 'payment_processed', amount: 5000, timestamp: '2024-01-14T15:30:00Z' },
          { type: 'campaign_paused', campaign: 'Summer Sale', timestamp: '2024-01-13T09:45:00Z' }
        ],
        topPerformers: [
          { campaignId: 'camp-1', name: 'Tech Launch', roas: 5.2, spend: 8000 },
          { campaignId: 'camp-2', name: 'Product Demo', roas: 4.8, spend: 6000 },
          { campaignId: 'camp-3', name: 'Brand Awareness', roas: 3.9, spend: 12000 }
        ],
        alerts: [
          { type: 'budget', message: 'Campaign approaching budget limit', severity: 'warning' },
          { type: 'performance', message: 'ROI below target for Campaign X', severity: 'info' }
        ],
        upcomingEvents: [
          { type: 'campaign_end', campaign: 'Holiday Sale', date: '2024-01-31' },
          { type: 'budget_renewal', amount: 10000, date: '2024-02-01' }
        ]
      };

      mockCampaignService.getCampaigns.mockResolvedValue(mockWidgetData.topPerformers);
      mockAnalyticsService.getEngagementMetrics.mockResolvedValue(mockWidgetData.summary);

      const result = await sponsorDashboard.getDashboardWidgets(sponsorId);

      expect(result.summary.activeCampaigns).toBe(5);
      expect(result.topPerformers).toHaveLength(3);
      expect(result.alerts).toHaveLength(2);
    });
  });

  describe('Export Functionality', () => {
    test('should export campaign data to CSV', async () => {
      const exportParams = {
        campaignIds: ['camp-1', 'camp-2'],
        format: 'csv',
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        metrics: ['impressions', 'clicks', 'conversions', 'spend']
      };

      const mockExportData = {
        filename: 'campaign-export-2024-01-31.csv',
        url: 'https://example.com/exports/campaign-export-2024-01-31.csv',
        size: '2.5MB',
        rows: 1250,
        generatedAt: new Date()
      };

      mockAnalyticsService.exportData.mockResolvedValue(mockExportData);

      const result = await sponsorDashboard.exportCampaignData(exportParams);

      expect(result).toEqual(mockExportData);
      expect(result.filename).toContain('.csv');
    });
  });

  describe('Notification Management', () => {
    test('should retrieve sponsor notifications', async () => {
      const sponsorId = 'sponsor-123';

      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'campaign_performance',
          title: 'Campaign Performance Alert',
          message: 'Your campaign ROI has improved by 25%',
          timestamp: '2024-01-15T10:00:00Z',
          read: false,
          priority: 'medium'
        },
        {
          id: 'notif-2',
          type: 'payment_confirmation',
          title: 'Payment Processed',
          message: 'Your payment of $5,000 has been processed successfully',
          timestamp: '2024-01-14T15:30:00Z',
          read: true,
          priority: 'low'
        }
      ];

      mockAnalyticsService.getNotifications.mockResolvedValue(mockNotifications);

      const result = await sponsorDashboard.getNotifications(sponsorId);

      expect(result).toEqual(mockNotifications);
      expect(result[0].read).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle analytics service failures', async () => {
      const campaignId = 'camp-error';

      mockAnalyticsService.getEngagementMetrics.mockRejectedValue(new Error('Analytics service unavailable'));

      await expect(sponsorDashboard.getCampaignAnalytics(campaignId))
        .rejects.toThrow('Analytics service unavailable');
    });

    test('should handle payment service errors', async () => {
      const paymentData = {
        campaignId: 'camp-payment',
        amount: 5000,
        currency: 'USD'
      };

      mockPaymentService.processPayment.mockRejectedValue(new Error('Payment gateway error'));

      await expect(sponsorDashboard.processPayment(paymentData))
        .rejects.toThrow('Payment gateway error');
    });

    test('should handle campaign service failures', async () => {
      const campaignData = {
        name: 'Test Campaign',
        budget: 1000
      };

      mockCampaignService.createCampaign.mockRejectedValue(new Error('Invalid campaign data'));

      await expect(sponsorDashboard.createCampaign(campaignData))
        .rejects.toThrow('Invalid campaign data');
    });
  });

  describe('Performance Tests', () => {
    test('should handle multiple concurrent requests', async () => {
      const sponsorId = 'sponsor-123';
      const campaignId = 'camp-123';

      // Setup mocks for concurrent operations
      mockAnalyticsService.getEngagementMetrics.mockResolvedValue({ metrics: 'data' });
      mockPaymentService.getPaymentHistory.mockResolvedValue([]);
      mockCampaignService.getCampaigns.mockResolvedValue([]);

      const promises = [
        sponsorDashboard.getDashboardWidgets(sponsorId),
        sponsorDashboard.getPaymentHistory(sponsorId),
        sponsorDashboard.getCampaignAnalytics(campaignId)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockAnalyticsService.getEngagementMetrics).toHaveBeenCalled();
      expect(mockPaymentService.getPaymentHistory).toHaveBeenCalled();
    });

    test('should handle large dataset processing', async () => {
      const largeCampaignList = Array.from({ length: 100 }, (_, i) => ({
        id: `camp-${i}`,
        name: `Campaign ${i}`,
        status: 'active'
      }));

      mockCampaignService.getCampaigns.mockResolvedValue(largeCampaignList);

      const startTime = Date.now();
      const result = await sponsorDashboard.initialize('sponsor-large');
      const endTime = Date.now();

      expect(result.campaigns).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should process within 5 seconds
    });
  });
});