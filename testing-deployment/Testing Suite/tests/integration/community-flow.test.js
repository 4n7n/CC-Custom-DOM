const request = require('supertest');
const app = require('../../src/app');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/database-helper');
const { createTestUser, createTestStory, createTestCommunity } = require('../helpers/test-data-helper');

describe('Community Flow Integration Tests', () => {
  let testUser;
  let testCommunity;
  let authToken;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'testuser@example.com',
      username: 'testuser',
      displayName: 'Test User'
    });

    testCommunity = await createTestCommunity({
      name: 'Test Community',
      description: 'A community for testing',
      ownerId: testUser.id,
      isPublic: true
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'testpassword123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('User Registration and Onboarding Flow', () => {
    test('should complete full user registration and community join flow', async () => {
      // Step 1: Register new user
      const registrationData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'securepassword123',
        displayName: 'New User',
        preferences: {
          emailNotifications: true,
          pushNotifications: false,
          contentCategories: ['technology', 'science']
        }
      };

      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registrationResponse.body.user.email).toBe('newuser@example.com');
      expect(registrationResponse.body.user.username).toBe('newuser');
      expect(registrationResponse.body.token).toBeDefined();

      const newUserToken = registrationResponse.body.token;
      const newUserId = registrationResponse.body.user.id;

      // Step 2: Complete profile setup
      const profileData = {
        bio: 'Technology enthusiast and story lover',
        location: 'San Francisco, CA',
        website: 'https://newuser.dev',
        interests: ['AI', 'Machine Learning', 'Creative Writing'],
        avatar: 'https://example.com/avatar.jpg'
      };

      const profileResponse = await request(app)
        .put(`/api/users/${newUserId}/profile`)
        .set('Authorization', `Bearer ${newUserToken}`)
        .send(profileData)
        .expect(200);

      expect(profileResponse.body.bio).toBe(profileData.bio);
      expect(profileResponse.body.interests).toEqual(profileData.interests);

      // Step 3: Discover and join communities
      const discoverResponse = await request(app)
        .get('/api/communities/discover')
        .set('Authorization', `Bearer ${newUserToken}`)
        .query({
          interests: 'technology,science',
          limit: 10
        })
        .expect(200);

      expect(discoverResponse.body.communities).toBeInstanceOf(Array);
      expect(discoverResponse.body.communities.length).toBeGreaterThan(0);

      // Step 4: Join recommended community
      const joinResponse = await request(app)
        .post(`/api/communities/${testCommunity.id}/join`)
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(joinResponse.body.member.userId).toBe(newUserId);
      expect(joinResponse.body.member.communityId).toBe(testCommunity.id);
      expect(joinResponse.body.member.role).toBe('member');

      // Step 5: Verify user appears in community members
      const membersResponse = await request(app)
        .get(`/api/communities/${testCommunity.id}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const newMember = membersResponse.body.members.find(m => m.userId === newUserId);
      expect(newMember).toBeDefined();
      expect(newMember.joinedAt).toBeDefined();

      // Step 6: Complete onboarding tutorial
      const tutorialResponse = await request(app)
        .post('/api/users/complete-tutorial')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({
          completedSteps: ['profile_setup', 'community_join', 'first_story_read'],
          feedback: 'Great onboarding experience!'
        })
        .expect(200);

      expect(tutorialResponse.body.onboardingCompleted).toBe(true);
    });

    test('should handle email verification in registration flow', async () => {
      const registrationData = {
        email: 'verify@example.com',
        username: 'verifyuser',
        password: 'password123',
        displayName: 'Verify User'
      };

      // Register user (should require email verification)
      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registrationResponse.body.user.emailVerified).toBe(false);
      expect(registrationResponse.body.requiresEmailVerification).toBe(true);

      // Simulate email verification
      const verificationToken = 'mock_verification_token_123';
      const verificationResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: verificationToken,
          email: 'verify@example.com'
        })
        .expect(200);

      expect(verificationResponse.body.emailVerified).toBe(true);
      expect(verificationResponse.body.message).toContain('verified');
    });

    test('should handle registration validation errors', async () => {
      // Test duplicate email
      const duplicateEmailData = {
        email: 'testuser@example.com', // Already exists
        username: 'newuser',
        password: 'password123',
        displayName: 'New User'
      };

      await request(app)
        .post('/api/auth/register')
        .send(duplicateEmailData)
        .expect(409);

      // Test invalid email format
      const invalidEmailData = {
        email: 'invalid-email',
        username: 'newuser',
        password: 'password123',
        displayName: 'New User'
      };

      await request(app)
        .post('/api/auth/register')
        .send(invalidEmailData)
        .expect(400);

      // Test weak password
      const weakPasswordData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: '123', // Too weak
        displayName: 'New User'
      };

      await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);
    });
  });

  describe('Story Creation and Sharing Flow', () => {
    test('should handle complete story creation and publication flow', async () => {
      // Step 1: Create draft story
      const storyDraftData = {
        title: 'My First Story',
        content: 'This is the beginning of an amazing story...',
        category: 'technology',
        tags: ['AI', 'future', 'innovation'],
        status: 'draft',
        settings: {
          allowComments: true,
          allowSharing: true,
          monetizationEnabled: false
        }
      };

      const draftResponse = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(storyDraftData)
        .expect(201);

      const storyId = draftResponse.body.id;
      expect(draftResponse.body.status).toBe('draft');
      expect(draftResponse.body.title).toBe(storyDraftData.title);

      // Step 2: Save multiple drafts/edits
      const editData = {
        content: 'This is the beginning of an amazing story... [UPDATED WITH MORE CONTENT]',
        lastEditReason: 'Added more content to introduction'
      };

      const editResponse = await request(app)
        .put(`/api/stories/${storyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(editData)
        .expect(200);

      expect(editResponse.body.content).toContain('[UPDATED WITH MORE CONTENT]');
      expect(editResponse.body.version).toBe(2);

      // Step 3: Add story to community
      const addToCommunityResponse = await request(app)
        .post(`/api/stories/${storyId}/communities`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          communityId: testCommunity.id,
          featured: false
        })
        .expect(200);

      expect(addToCommunityResponse.body.communityId).toBe(testCommunity.id);

      // Step 4: Publish story
      const publishResponse = await request(app)
        .put(`/api/stories/${storyId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          publishAt: new Date().toISOString(),
          notifyFollowers: true,
          crossPost: {
            communities: [testCommunity.id],
            socialMedia: ['twitter']
          }
        })
        .expect(200);

      expect(publishResponse.body.status).toBe('published');
      expect(publishResponse.body.publishedAt).toBeDefined();

      // Step 5: Verify story appears in community feed
      const communityFeedResponse = await request(app)
        .get(`/api/communities/${testCommunity.id}/feed`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const publishedStory = communityFeedResponse.body.stories.find(s => s.id === storyId);
      expect(publishedStory).toBeDefined();
      expect(publishedStory.status).toBe('published');

      // Step 6: Verify story analytics start tracking
      const analyticsResponse = await request(app)
        .get(`/api/stories/${storyId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(analyticsResponse.body.views).toBeDefined();
      expect(analyticsResponse.body.engagementMetrics).toBeDefined();
    });

    test('should handle collaborative story creation', async () => {
      // Create collaborator user
      const collaborator = await createTestUser({
        email: 'collaborator@example.com',
        username: 'collaborator',
        displayName: 'Collaborator User'
      });

      const collabLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'collaborator@example.com',
          password: 'testpassword123'
        });

      const collabToken = collabLoginResponse.body.token;

      // Step 1: Create collaborative story
      const collaborativeStoryData = {
        title: 'Collaborative Story Project',
        content: 'Chapter 1: The Beginning...',
        category: 'fiction',
        collaborationSettings: {
          allowCollaborators: true,
          collaboratorPermissions: ['edit', 'comment'],
          maxCollaborators: 3
        }
      };

      const storyResponse = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(collaborativeStoryData)
        .expect(201);

      const storyId = storyResponse.body.id;

      // Step 2: Invite collaborator
      const inviteResponse = await request(app)
        .post(`/api/stories/${storyId}/collaborators/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: collaborator.id,
          permissions: ['edit', 'comment'],
          message: 'Would you like to collaborate on this story?'
        })
        .expect(200);

      expect(inviteResponse.body.invitationSent).toBe(true);

      // Step 3: Accept collaboration invitation
      const acceptResponse = await request(app)
        .post(`/api/stories/${storyId}/collaborators/accept`)
        .set('Authorization', `Bearer ${collabToken}`)
        .send({
          invitationId: inviteResponse.body.invitationId
        })
        .expect(200);

      expect(acceptResponse.body.collaborator.userId).toBe(collaborator.id);
      expect(acceptResponse.body.collaborator.permissions).toContain('edit');

      // Step 4: Collaborator makes edits
      const collaboratorEditData = {
        content: 'Chapter 1: The Beginning...\n\nChapter 2: The collaborator continues the story...',
        lastEditReason: 'Added Chapter 2'
      };

      const collaboratorEditResponse = await request(app)
        .put(`/api/stories/${storyId}`)
        .set('Authorization', `Bearer ${collabToken}`)
        .send(collaboratorEditData)
        .expect(200);

      expect(collaboratorEditResponse.body.content).toContain('Chapter 2');
      expect(collaboratorEditResponse.body.lastEditedBy).toBe(collaborator.id);

      // Step 5: Track collaboration history
      const historyResponse = await request(app)
        .get(`/api/stories/${storyId}/collaboration-history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.edits).toHaveLength(2); // Original + collaborator edit
      expect(historyResponse.body.edits[1].editorId).toBe(collaborator.id);
    });

    test('should handle story moderation and reporting', async () => {
      // Create a story that violates community guidelines
      const problematicStoryData = {
        title: 'Problematic Content',
        content: 'This story contains inappropriate content that should be reported...',
        category: 'general',
        tags: ['inappropriate'],
        status: 'published'
      };

      const storyResponse = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(problematicStoryData)
        .expect(201);

      const storyId = storyResponse.body.id;

      // Create another user to report the story
      const reporter = await createTestUser({
        email: 'reporter@example.com',
        username: 'reporter',
        displayName: 'Reporter User'
      });

      const reporterLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'reporter@example.com',
          password: 'testpassword123'
        });

      const reporterToken = reporterLoginResponse.body.token;

      // Report the story
      const reportResponse = await request(app)
        .post(`/api/stories/${storyId}/report`)
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          reason: 'inappropriate_content',
          description: 'This story contains content that violates community guidelines',
          category: 'content_violation'
        })
        .expect(200);

      expect(reportResponse.body.reportId).toBeDefined();
      expect(reportResponse.body.status).toBe('submitted');

      // Verify report was logged
      const reportsResponse = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${authToken}`) // Assuming admin privileges
        .expect(200);

      const report = reportsResponse.body.reports.find(r => r.storyId === storyId);
      expect(report).toBeDefined();
      expect(report.reason).toBe('inappropriate_content');
    });
  });

  describe('Community Interaction Flow', () => {
    test('should handle community discussions and engagement', async () => {
      // Create a story in the community
      const story = await createTestStory({
        title: 'Community Discussion Story',
        content: 'Let\'s discuss this interesting topic...',
        authorId: testUser.id,
        communityId: testCommunity.id,
        status: 'published'
      });

      // Step 1: Add comment to story
      const commentData = {
        content: 'This is a very insightful story!',
        parentId: null
      };

      const commentResponse = await request(app)
        .post(`/api/stories/${story.id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      const commentId = commentResponse.body.id;
      expect(commentResponse.body.content).toBe(commentData.content);

      // Step 2: Reply to comment
      const replyData = {
        content: 'I agree with your perspective!',
        parentId: commentId
      };

      const replyResponse = await request(app)
        .post(`/api/stories/${story.id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(replyData)
        .expect(201);

      expect(replyResponse.body.parentId).toBe(commentId);

      // Step 3: Like the story
      const likeResponse = await request(app)
        .post(`/api/stories/${story.id}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(likeResponse.body.liked).toBe(true);

      // Step 4: Share story
      const shareResponse = await request(app)
        .post(`/api/stories/${story.id}/share`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'internal',
          message: 'Check out this amazing story!'
        })
        .expect(200);

      expect(shareResponse.body.shareId).toBeDefined();

      // Step 5: Follow the author
      const followResponse = await request(app)
        .post(`/api/users/${testUser.id}/follow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(followResponse.body.following).toBe(true);
    });

    test('should handle community events and activities', async () => {
      // Step 1: Create community event
      const eventData = {
        title: 'Monthly Writing Challenge',
        description: 'Join us for our monthly writing challenge!',
        type: 'writing_challenge',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
        rules: {
          wordLimit: 1000,
          theme: 'Future Technology',
          allowCollaboration: false
        },
        prizes: {
          first: 'Featured story placement',
          second: 'Community badge',
          third: 'Recognition mention'
        }
      };

      const eventResponse = await request(app)
        .post(`/api/communities/${testCommunity.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      const eventId = eventResponse.body.id;
      expect(eventResponse.body.title).toBe(eventData.title);

      // Step 2: Join event
      const joinEventResponse = await request(app)
        .post(`/api/communities/${testCommunity.id}/events/${eventId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(joinEventResponse.body.participant.userId).toBe(testUser.id);

      // Step 3: Submit entry
      const entryData = {
        title: 'My Future Tech Story',
        content: 'In the year 2050, artificial intelligence had become...',
        category: 'science_fiction',
        tags: ['AI', 'future', 'technology']
      };

      const entryResponse = await request(app)
        .post(`/api/communities/${testCommunity.id}/events/${eventId}/submissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(entryData)
        .expect(201);

      expect(entryResponse.body.submissionId).toBeDefined();
      expect(entryResponse.body.eventId).toBe(eventId);
    });
  });

  describe('Content Discovery and Recommendation Flow', () => {
    test('should provide personalized content recommendations', async () => {
      // Create multiple stories with different categories
      const stories = await Promise.all([
        createTestStory({
          title: 'AI Revolution',
          content: 'The future of artificial intelligence...',
          authorId: testUser.id,
          category: 'technology',
          tags: ['AI', 'technology'],
          status: 'published'
        }),
        createTestStory({
          title: 'Space Adventure',
          content: 'Journey to the stars...',
          authorId: testUser.id,
          category: 'science_fiction',
          tags: ['space', 'adventure'],
          status: 'published'
        }),
        createTestStory({
          title: 'Cooking Tips',
          content: 'How to make the perfect pasta...',
          authorId: testUser.id,
          category: 'lifestyle',
          tags: ['cooking', 'food'],
          status: 'published'
        })
      ]);

      // Update user preferences
      const preferencesResponse = await request(app)
        .put(`/api/users/${testUser.id}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contentCategories: ['technology', 'science_fiction'],
          tags: ['AI', 'space', 'technology'],
          contentTypes: ['stories', 'discussions'],
          notificationSettings: {
            newStories: true,
            comments: true,
            likes: false
          }
        })
        .expect(200);

      expect(preferencesResponse.body.contentCategories).toContain('technology');

      // Get personalized recommendations
      const recommendationsResponse = await request(app)
        .get('/api/users/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          type: 'stories',
          limit: 10
        })
        .expect(200);

      expect(recommendationsResponse.body.stories).toBeInstanceOf(Array);
      
      // Should prioritize tech and sci-fi stories
      const techStories = recommendationsResponse.body.stories.filter(
        s => s.category === 'technology' || s.category === 'science_fiction'
      );
      expect(techStories.length).toBeGreaterThan(0);
    });

    test('should handle trending content discovery', async () => {
      // Get trending stories
      const trendingResponse = await request(app)
        .get('/api/stories/trending')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          timeframe: '24h',
          category: 'all',
          limit: 20
        })
        .expect(200);

      expect(trendingResponse.body.stories).toBeInstanceOf(Array);
      expect(trendingResponse.body.metadata.timeframe).toBe('24h');

      // Get trending communities
      const trendingCommunitiesResponse = await request(app)
        .get('/api/communities/trending')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          timeframe: '7d',
          limit: 10
        })
        .expect(200);

      expect(trendingCommunitiesResponse.body.communities).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle unauthorized access attempts', async () => {
      // Try to access protected endpoint without token
      await request(app)
        .get('/api/users/profile')
        .expect(401);

      // Try with invalid token
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    test('should handle rate limiting', async () => {
      // Simulate rapid requests (assuming rate limit of 10 per minute)
      const promises = Array.from({ length: 15 }, (_, i) => 
        request(app)
          .get('/api/stories/trending')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should handle database connection errors gracefully', async () => {
      // This would require mocking database connection failures
      // Implementation depends on your specific database setup
      
      // Mock database error scenario
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Test that app handles database errors gracefully
      // This is a placeholder - actual implementation would depend on your error handling
    });
  });
});