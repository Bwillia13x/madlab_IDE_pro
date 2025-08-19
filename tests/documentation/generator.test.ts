import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DocumentationGenerator } from '../../lib/documentation/generator';
import * as fs from 'fs';
import * as path from 'path';

describe('DocumentationGenerator', () => {
  let generator: DocumentationGenerator;
  let tempOutputDir: string;

  beforeEach(() => {
    tempOutputDir = path.join(__dirname, '../../temp-docs');
    generator = new DocumentationGenerator(tempOutputDir);
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should create output directory if it does not exist', () => {
      expect(fs.existsSync(tempOutputDir)).toBe(true);
    });

    it('should initialize with default documentation sections', () => {
      const sections = generator.getAllSections();
      expect(sections.length).toBeGreaterThan(0);
      
      const sectionIds = sections.map(s => s.id);
      expect(sectionIds).toContain('getting-started');
      expect(sectionIds).toContain('widget-creation');
      expect(sectionIds).toContain('api-reference');
      expect(sectionIds).toContain('best-practices');
    });

    it('should have correct default section categories', () => {
      const sections = generator.getAllSections();
      
      const gettingStarted = sections.find(s => s.id === 'getting-started');
      expect(gettingStarted?.category).toBe('guide');
      
      const widgetCreation = sections.find(s => s.id === 'widget-creation');
      expect(widgetCreation?.category).toBe('tutorial');
      
      const apiReference = sections.find(s => s.id === 'api-reference');
      expect(apiReference?.category).toBe('api');
      
      const bestPractices = sections.find(s => s.id === 'best-practices');
      expect(bestPractices?.category).toBe('best-practice');
    });
  });

  describe('Section Management', () => {
    it('should add new sections correctly', () => {
      const newSection = {
        id: 'custom-section',
        title: 'Custom Section',
        content: 'This is a custom section',
        category: 'guide' as const,
        tags: ['custom', 'test'],
        difficulty: 'intermediate' as const,
        lastUpdated: new Date(),
        author: 'Test Author',
        version: '1.0.0'
      };

      generator.addSection(newSection);
      
      const retrievedSection = generator.getSection('custom-section');
      expect(retrievedSection).toBeDefined();
      expect(retrievedSection?.title).toBe('Custom Section');
      expect(retrievedSection?.content).toBe('This is a custom section');
    });

    it('should retrieve sections by category', () => {
      const guideSections = generator.getSectionsByCategory('guide');
      const tutorialSections = generator.getSectionsByCategory('tutorial');
      
      expect(guideSections.length).toBeGreaterThan(0);
      expect(tutorialSections.length).toBeGreaterThan(0);
      
      guideSections.forEach(section => {
        expect(section.category).toBe('guide');
      });
      
      tutorialSections.forEach(section => {
        expect(section.category).toBe('tutorial');
      });
    });

    it('should retrieve sections by difficulty', () => {
      const beginnerSections = generator.getSectionsByDifficulty('beginner');
      const intermediateSections = generator.getSectionsByDifficulty('intermediate');
      
      // There should be exactly 1 beginner section and 3 intermediate sections
      expect(beginnerSections.length).toBe(1);
      expect(intermediateSections.length).toBe(3);
      
      beginnerSections.forEach(section => {
        expect(section.difficulty).toBe('beginner');
      });
      
      intermediateSections.forEach(section => {
        expect(section.difficulty).toBe('intermediate');
      });
    });
  });

  describe('Example Management', () => {
    it('should add new examples correctly', () => {
      const newExample = {
        id: 'custom-example',
        title: 'Custom Example',
        description: 'This is a custom example',
        code: 'console.log("Hello World");',
        language: 'typescript' as const,
        output: 'Hello World',
        explanation: 'This example demonstrates basic logging'
      };

      generator.addExample(newExample);
      
      const examples = generator['examples'];
      expect(examples.has('custom-example')).toBe(true);
      
      const retrievedExample = examples.get('custom-example');
      expect(retrievedExample?.title).toBe('Custom Example');
      expect(retrievedExample?.code).toBe('console.log("Hello World");');
    });
  });

  describe('API Documentation Management', () => {
    it('should add new API documentation correctly', () => {
      const newAPI = {
        endpoint: '/api/test',
        method: 'GET' as const,
        description: 'Test API endpoint',
        parameters: [
          {
            name: 'id',
            type: 'string',
            required: true,
            description: 'Test ID',
            example: '123'
          }
        ],
        responses: [
          {
            code: 200,
            description: 'Success',
            schema: { type: 'object' },
            example: { success: true }
          }
        ],
        examples: []
      };

      generator.addAPI(newAPI);
      
      const apis = generator['apis'];
      const key = 'GET /api/test';
      expect(apis.has(key)).toBe(true);
      
      const retrievedAPI = apis.get(key);
      expect(retrievedAPI?.endpoint).toBe('/api/test');
      expect(retrievedAPI?.method).toBe('GET');
    });
  });

  describe('Documentation Generation', () => {
    it('should generate main documentation file', async () => {
      await generator.generateDocumentation();
      
      const mainDocPath = path.join(tempOutputDir, 'README.md');
      expect(fs.existsSync(mainDocPath)).toBe(true);
      
      const content = fs.readFileSync(mainDocPath, 'utf-8');
      expect(content).toContain('# MadLab IDE Pro Documentation');
      expect(content).toContain('## Table of Contents');
      expect(content).toContain('Getting Started');
      expect(content).toContain('Widget Creation');
    });

    it('should generate API documentation file', async () => {
      await generator.generateDocumentation();
      
      const apiDocPath = path.join(tempOutputDir, 'api-reference.md');
      expect(fs.existsSync(apiDocPath)).toBe(true);
      
      const content = fs.readFileSync(apiDocPath, 'utf-8');
      expect(content).toContain('# API Reference');
    });

    it('should generate examples documentation file', async () => {
      await generator.generateDocumentation();
      
      const examplesDocPath = path.join(tempOutputDir, 'examples.md');
      expect(fs.existsSync(examplesDocPath)).toBe(true);
      
      const content = fs.readFileSync(examplesDocPath, 'utf-8');
      expect(content).toContain('# Code Examples');
    });

    it('should generate tutorials documentation file', async () => {
      await generator.generateDocumentation();
      
      const tutorialsDocPath = path.join(tempOutputDir, 'tutorials.md');
      expect(fs.existsSync(tutorialsDocPath)).toBe(true);
      
      const content = fs.readFileSync(tutorialsDocPath, 'utf-8');
      expect(content).toContain('# Tutorials');
    });

    it('should generate best practices documentation file', async () => {
      await generator.generateDocumentation();
      
      const bestPracticesDocPath = path.join(tempOutputDir, 'best-practices.md');
      expect(fs.existsSync(bestPracticesDocPath)).toBe(true);
      
      const content = fs.readFileSync(bestPracticesDocPath, 'utf-8');
      expect(content).toContain('# Development Best Practices');
    });

    it('should generate search index file', async () => {
      await generator.generateDocumentation();
      
      const searchIndexPath = path.join(tempOutputDir, 'search-index.json');
      expect(fs.existsSync(searchIndexPath)).toBe(true);
      
      const content = JSON.parse(fs.readFileSync(searchIndexPath, 'utf-8'));
      expect(content).toHaveProperty('sections');
      expect(content).toHaveProperty('examples');
      expect(content).toHaveProperty('apis');
      expect(content).toHaveProperty('lastUpdated');
    });
  });

  describe('Search Functionality', () => {
    it('should search documentation by query', () => {
      const results = generator.searchDocumentation('widget');
      
      expect(results.sections.length).toBeGreaterThan(0);
      expect(results.sections.some(s => s.title.includes('Widget'))).toBe(true);
    });

    it('should search by tags', () => {
      const results = generator.searchDocumentation('setup');
      
      expect(results.sections.length).toBeGreaterThan(0);
      expect(results.sections.some(s => s.tags.includes('setup'))).toBe(true);
    });

    it('should return empty results for non-matching queries', () => {
      const results = generator.searchDocumentation('nonexistent');
      
      expect(results.sections.length).toBe(0);
      expect(results.examples.length).toBe(0);
      expect(results.apis.length).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate documentation statistics', () => {
      const stats = generator.getDocumentationStats();
      
      expect(stats.totalSections).toBeGreaterThan(0);
      expect(stats.totalExamples).toBe(0); // No examples added yet
      expect(stats.totalAPIs).toBe(0); // No APIs added yet
      expect(stats.categories).toBeDefined();
      expect(stats.difficulties).toBeDefined();
      
      // Check that categories match expected values
      expect(stats.categories['guide']).toBeGreaterThan(0);
      expect(stats.categories['tutorial']).toBeGreaterThan(0);
      expect(stats.categories['api']).toBeGreaterThan(0);
      expect(stats.categories['best-practice']).toBeGreaterThan(0);
      
      // Check that difficulties match expected values
      expect(stats.difficulties['beginner']).toBeGreaterThan(0);
      expect(stats.difficulties['intermediate']).toBeGreaterThan(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit events when adding sections', () => {
      return new Promise<void>((resolve) => {
        const newSection = {
          id: 'event-test',
          title: 'Event Test',
          content: 'Testing events',
          category: 'guide' as const,
          tags: ['test'],
          difficulty: 'beginner' as const,
          lastUpdated: new Date(),
          author: 'Test',
          version: '1.0.0'
        };

        generator.on('sectionAdded', (section) => {
          expect(section.id).toBe('event-test');
          resolve();
        });

        generator.addSection(newSection);
      });
    });

    it('should emit events when adding examples', () => {
      return new Promise<void>((resolve) => {
        const newExample = {
          id: 'event-example',
          title: 'Event Example',
          description: 'Testing example events',
          code: 'test()',
          language: 'typescript' as const,
          explanation: 'Test explanation'
        };

        generator.on('exampleAdded', (example) => {
          expect(example.id).toBe('event-example');
          resolve();
        });

        generator.addExample(newExample);
      });
    });

    it('should emit events when adding APIs', () => {
      return new Promise<void>((resolve) => {
        const newAPI = {
          endpoint: '/test',
          method: 'GET' as const,
          description: 'Test API',
          parameters: [],
          responses: [],
          examples: []
        };

        generator.on('apiAdded', (api) => {
          expect(api.endpoint).toBe('/test');
          resolve();
        });

        generator.addAPI(newAPI);
      });
    });

    it('should emit events during documentation generation', () => {
      return new Promise<void>((resolve) => {
        let eventsEmitted = 0;
        
        generator.on('generationStarted', () => {
          eventsEmitted++;
        });
        
        generator.on('generationCompleted', () => {
          eventsEmitted++;
          if (eventsEmitted === 2) {
            resolve();
          }
        });

        generator.generateDocumentation();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Test that the generator can handle invalid paths gracefully
      // We'll use a path that exists but we don't have write permissions to
      const invalidPath = '/usr/bin'; // System directory we shouldn't write to
      
      // This should not throw an error during construction
      const invalidGenerator = new DocumentationGenerator(invalidPath);
      expect(invalidGenerator).toBeDefined();
      
      // The generator should still be functional even if directory creation fails
      const sections = invalidGenerator.getAllSections();
      expect(sections.length).toBeGreaterThan(0);
      
      // Try to generate documentation - this should fail gracefully
      try {
        await invalidGenerator.generateDocumentation();
      } catch (error) {
        // Expected to fail due to permissions
        expect(error).toBeDefined();
      }
    });
  });

  describe('Content Generation', () => {
    it('should generate proper markdown formatting', async () => {
      await generator.generateDocumentation();
      
      const mainDocPath = path.join(tempOutputDir, 'README.md');
      const content = fs.readFileSync(mainDocPath, 'utf-8');
      
      // Check for proper markdown structure
      expect(content).toMatch(/^# .+/m); // Starts with H1
      expect(content).toMatch(/## .+/m); // Contains H2 headers
      expect(content).toMatch(/\[.*\]\(.*\)/); // Contains links
      expect(content).toMatch(/\*\*.*\*\*/); // Contains bold text
    });

    it('should include all required sections in main documentation', async () => {
      await generator.generateDocumentation();
      
      const mainDocPath = path.join(tempOutputDir, 'README.md');
      const content = fs.readFileSync(mainDocPath, 'utf-8');
      
      expect(content).toContain('## Table of Contents');
      expect(content).toContain('## Quick Start');
      expect(content).toContain('## Features');
      expect(content).toContain('## Support');
      expect(content).toContain('## Version Information');
    });
  });
});
