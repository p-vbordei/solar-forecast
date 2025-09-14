import type { TemplateConfig } from '../models/ReportTypes';
import { template1Renderer } from './template_1';
import { templateCodeExampleRenderer } from './template_code_example';

export class TemplateRegistry {
    private templates: Map<string, TemplateConfig> = new Map();

    constructor() {
        // Register FILE mode template
        this.templates.set('template_1', template1Renderer);

        // Register CODE mode template
        this.templates.set('template_code_1', templateCodeExampleRenderer);
    }

    /**
     * Get template configuration by name
     */
    getTemplate(name: string): TemplateConfig | undefined {
        return this.templates.get(name);
    }

    /**
     * Register a new template
     */
    registerTemplate(name: string, config: TemplateConfig): void {
        this.templates.set(name, config);
    }

    /**
     * Get all available template names
     */
    getAvailableTemplates(): string[] {
        return Array.from(this.templates.keys());
    }
}