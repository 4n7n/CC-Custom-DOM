const { StoryEngine } = require('../../src/core/story-engine');
const { StoryGenerator } = require('../../src/generators/story-generator');
const { ContentValidator } = require('../../src/validators/content-validator');

describe('Story Engine', () => {
  let storyEngine;
  let mockStoryGenerator;
  let mockContentValidator;

  beforeEach(() => {
    mockStoryGenerator = {
      generateStory: jest.fn(),
      generateChapter: jest.fn(),
      generateCharacter: jest.fn(),
      generatePlot: jest.fn()
    };

    mockContentValidator = {
      validateContent: jest.fn(),
      validateStoryStructure: jest.fn(),
      validateCharacterConsistency: jest.fn(),
      validatePlotCoherence: jest.fn()
    };

    storyEngine = new StoryEngine(mockStoryGenerator, mockContentValidator);
  });

  describe('Story Generation', () => {
    test('should generate a complete story with valid parameters', async () => {
      const storyParams = {
        genre: 'fantasy',
        length: 'short',
        tone: 'adventure',
        characters: ['hero', 'villain'],
        setting: 'medieval'
      };

      const expectedStory = {
        id: 'story-123',
        title: 'The Dragon\'s Quest',
        chapters: [
          { id: 'ch1', title: 'Beginning', content: 'Once upon a time...' },
          { id: 'ch2', title: 'Middle', content: 'The hero faced challenges...' },
          { id: 'ch3', title: 'End', content: 'And they lived happily...' }
        ],
        characters: [
          { name: 'Hero', role: 'protagonist', traits: ['brave', 'kind'] },
          { name: 'Villain', role: 'antagonist', traits: ['evil', 'cunning'] }
        ],
        metadata: {
          genre: 'fantasy',
          wordCount: 1500,
          estimatedReadTime: 6
        }
      };

      mockStoryGenerator.generateStory.mockResolvedValue(expectedStory);
      mockContentValidator.validateContent.mockResolvedValue({ isValid: true });

      const result = await storyEngine.createStory(storyParams);

      expect(mockStoryGenerator.generateStory).toHaveBeenCalledWith(storyParams);
      expect(mockContentValidator.validateContent).toHaveBeenCalledWith(expectedStory);
      expect(result).toEqual(expectedStory);
    });

    test('should handle story generation with custom prompts', async () => {
      const customPrompt = 'Create a story about a time-traveling scientist';
      const storyParams = {
        customPrompt,
        genre: 'sci-fi',
        length: 'medium'
      };

      const mockStory = {
        id: 'story-456',
        title: 'The Time Traveler',
        content: 'Dr. Smith discovered time travel...',
        customPromptUsed: true
      };

      mockStoryGenerator.generateStory.mockResolvedValue(mockStory);
      mockContentValidator.validateContent.mockResolvedValue({ isValid: true });

      const result = await storyEngine.createStory(storyParams);

      expect(result.customPromptUsed).toBe(true);
      expect(mockStoryGenerator.generateStory).toHaveBeenCalledWith(storyParams);
    });

    test('should retry generation on validation failure', async () => {
      const storyParams = { genre: 'mystery', length: 'short' };
      const invalidStory = { id: 'story-789', content: 'Invalid content' };
      const validStory = { id: 'story-790', content: 'Valid mystery story' };

      mockStoryGenerator.generateStory
        .mockResolvedValueOnce(invalidStory)
        .mockResolvedValueOnce(validStory);

      mockContentValidator.validateContent
        .mockResolvedValueOnce({ isValid: false, errors: ['Content too short'] })
        .mockResolvedValueOnce({ isValid: true });

      const result = await storyEngine.createStory(storyParams);

      expect(mockStoryGenerator.generateStory).toHaveBeenCalledTimes(2);
      expect(result).toEqual(validStory);
    });
  });

  describe('Character Management', () => {
    test('should create consistent characters', async () => {
      const characterParams = {
        name: 'Alice',
        role: 'protagonist',
        personality: ['brave', 'curious'],
        backstory: 'Grew up in a small village'
      };

      const expectedCharacter = {
        id: 'char-001',
        name: 'Alice',
        role: 'protagonist',
        personality: ['brave', 'curious'],
        backstory: 'Grew up in a small village',
        relationships: [],
        characterArc: {
          beginning: 'Naive village girl',
          middle: 'Discovers inner strength',
          end: 'Becomes a leader'
        }
      };

      mockStoryGenerator.generateCharacter.mockResolvedValue(expectedCharacter);
      mockContentValidator.validateCharacterConsistency.mockResolvedValue({ isValid: true });

      const result = await storyEngine.createCharacter(characterParams);

      expect(result).toEqual(expectedCharacter);
      expect(mockContentValidator.validateCharacterConsistency).toHaveBeenCalledWith(expectedCharacter);
    });

    test('should handle character relationships', async () => {
      const mainCharacter = { id: 'char-001', name: 'Alice' };
      const relationshipParams = {
        characterId: 'char-001',
        relatedCharacterId: 'char-002',
        relationshipType: 'friend',
        backstory: 'Met in childhood'
      };

      const updatedCharacter = {
        ...mainCharacter,
        relationships: [
          {
            characterId: 'char-002',
            type: 'friend',
            backstory: 'Met in childhood',
            strength: 'strong'
          }
        ]
      };

      mockStoryGenerator.generateCharacter.mockResolvedValue(updatedCharacter);

      const result = await storyEngine.addCharacterRelationship(relationshipParams);

      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].type).toBe('friend');
    });
  });

  describe('Plot Development', () => {
    test('should generate coherent plot structure', async () => {
      const plotParams = {
        genre: 'adventure',
        conflict: 'man vs nature',
        resolution: 'heroic victory',
        pacing: 'fast'
      };

      const expectedPlot = {
        id: 'plot-001',
        structure: {
          exposition: 'Hero begins journey',
          risingAction: 'Encounters obstacles',
          climax: 'Final confrontation',
          fallingAction: 'Consequences unfold',
          resolution: 'Peace restored'
        },
        conflicts: [
          { type: 'external', description: 'Battle with nature' },
          { type: 'internal', description: 'Self-doubt' }
        ],
        themes: ['courage', 'perseverance', 'growth']
      };

      mockStoryGenerator.generatePlot.mockResolvedValue(expectedPlot);
      mockContentValidator.validatePlotCoherence.mockResolvedValue({ isValid: true });

      const result = await storyEngine.createPlot(plotParams);

      expect(result).toEqual(expectedPlot);
      expect(mockContentValidator.validatePlotCoherence).toHaveBeenCalledWith(expectedPlot);
    });

    test('should handle plot modifications', async () => {
      const plotId = 'plot-001';
      const modifications = {
        addSubplot: {
          type: 'romance',
          characters: ['char-001', 'char-002'],
          timeline: 'parallel'
        }
      };

      const modifiedPlot = {
        id: plotId,
        mainPlot: { /* existing plot */ },
        subplots: [
          {
            id: 'subplot-001',
            type: 'romance',
            characters: ['char-001', 'char-002'],
            timeline: 'parallel'
          }
        ]
      };

      mockStoryGenerator.generatePlot.mockResolvedValue(modifiedPlot);

      const result = await storyEngine.modifyPlot(plotId, modifications);

      expect(result.subplots).toHaveLength(1);
      expect(result.subplots[0].type).toBe('romance');
    });
  });

  describe('Chapter Generation', () => {
    test('should generate chapters with proper flow', async () => {
      const chapterParams = {
        storyId: 'story-001',
        chapterNumber: 1,
        plotPoints: ['introduction', 'inciting incident'],
        characterFocus: ['char-001']
      };

      const expectedChapter = {
        id: 'ch-001',
        number: 1,
        title: 'The Beginning',
        content: 'The story begins with our hero...',
        plotPoints: ['introduction', 'inciting incident'],
        characterMoments: [
          { characterId: 'char-001', moment: 'first appearance' }
        ],
        wordCount: 800,
        estimatedReadTime: 3
      };

      mockStoryGenerator.generateChapter.mockResolvedValue(expectedChapter);
      mockContentValidator.validateContent.mockResolvedValue({ isValid: true });

      const result = await storyEngine.createChapter(chapterParams);

      expect(result).toEqual(expectedChapter);
      expect(result.number).toBe(1);
    });

    test('should maintain story continuity across chapters', async () => {
      const previousChapter = {
        id: 'ch-001',
        endingState: {
          characters: { 'char-001': { location: 'forest', mood: 'determined' } },
          plot: { tension: 'high', nextEvent: 'confrontation' }
        }
      };

      const nextChapterParams = {
        storyId: 'story-001',
        chapterNumber: 2,
        previousChapter: previousChapter
      };

      const expectedChapter = {
        id: 'ch-002',
        number: 2,
        title: 'The Confrontation',
        content: 'Continuing from the forest...',
        continuityCheck: {
          charactersConsistent: true,
          plotConsistent: true,
          settingConsistent: true
        }
      };

      mockStoryGenerator.generateChapter.mockResolvedValue(expectedChapter);
      mockContentValidator.validateStoryStructure.mockResolvedValue({ isValid: true });

      const result = await storyEngine.createChapter(nextChapterParams);

      expect(result.continuityCheck.charactersConsistent).toBe(true);
      expect(result.continuityCheck.plotConsistent).toBe(true);
    });
  });

  describe('Story Validation', () => {
    test('should validate complete story structure', async () => {
      const completeStory = {
        id: 'story-complete',
        title: 'Complete Adventure',
        chapters: [
          { id: 'ch1', title: 'Start', content: 'Beginning...' },
          { id: 'ch2', title: 'Middle', content: 'Development...' },
          { id: 'ch3', title: 'End', content: 'Conclusion...' }
        ],
        characters: [
          { id: 'char-001', name: 'Hero' },
          { id: 'char-002', name: 'Villain' }
        ],
        plot: {
          structure: 'three-act',
          conflicts: ['external'],
          resolution: 'happy'
        }
      };

      mockContentValidator.validateStoryStructure.mockResolvedValue({
        isValid: true,
        score: 95,
        feedback: 'Excellent story structure'
      });

      const result = await storyEngine.validateStory(completeStory);

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(95);
    });

    test('should identify story structure issues', async () => {
      const incompleteStory = {
        id: 'story-incomplete',
        title: 'Incomplete Story',
        chapters: [
          { id: 'ch1', title: 'Start', content: 'Beginning...' }
        ],
        characters: [],
        plot: null
      };

      mockContentValidator.validateStoryStructure.mockResolvedValue({
        isValid: false,
        errors: [
          'Missing characters',
          'Incomplete plot structure',
          'Insufficient chapter count'
        ],
        suggestions: [
          'Add at least one main character',
          'Develop plot structure',
          'Create additional chapters'
        ]
      });

      const result = await storyEngine.validateStory(incompleteStory);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.suggestions).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    test('should handle generation failures gracefully', async () => {
      const storyParams = { genre: 'horror', length: 'long' };

      mockStoryGenerator.generateStory.mockRejectedValue(new Error('Generation failed'));

      await expect(storyEngine.createStory(storyParams)).rejects.toThrow('Generation failed');
    });

    test('should handle validation timeouts', async () => {
      const storyParams = { genre: 'fantasy', length: 'medium' };
      const mockStory = { id: 'story-timeout', content: 'Test story' };

      mockStoryGenerator.generateStory.mockResolvedValue(mockStory);
      mockContentValidator.validateContent.mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const result = await storyEngine.createStory(storyParams, { timeout: 1000 });

      expect(result).toEqual(mockStory); // Should return without validation
    });
  });

  describe('Performance Tests', () => {
    test('should generate stories within time limits', async () => {
      const storyParams = { genre: 'mystery', length: 'short' };
      const startTime = Date.now();

      mockStoryGenerator.generateStory.mockResolvedValue({
        id: 'story-perf',
        content: 'Performance test story'
      });
      mockContentValidator.validateContent.mockResolvedValue({ isValid: true });

      await storyEngine.createStory(storyParams);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    test('should handle multiple concurrent story generations', async () => {
      const storyParams = { genre: 'adventure', length: 'short' };
      const promises = [];

      for (let i = 0; i < 5; i++) {
        mockStoryGenerator.generateStory.mockResolvedValue({
          id: `story-${i}`,
          content: `Story ${i}`
        });
        promises.push(storyEngine.createStory(storyParams));
      }

      mockContentValidator.validateContent.mockResolvedValue({ isValid: true });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.id).toBe(`story-${index}`);
      });
    });
  });
});