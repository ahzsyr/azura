import type { GenerationProfile } from "./types/autofill";
import type { SeoEntityProvider } from "./types/entity-provider";
import type {
  ContentAnalyzer,
  PipelineStep,
  SeoGenerationProvider,
  SeoRule,
  SeoSchemaDefinition,
  SeoStrategyDefinition,
  SeoTemplate,
  SeoValidator,
} from "./types";
import { registerEngine } from "./engine-registry";

const analyzers = new Map<string, ContentAnalyzer>();
const rules = new Map<string, SeoRule>();
const validators = new Map<string, SeoValidator>();
const templates = new Map<string, SeoTemplate>();
const providers = new Map<string, SeoGenerationProvider>();
const strategies = new Map<string, SeoStrategyDefinition>();
const schemas = new Map<string, SeoSchemaDefinition>();
const automationSteps = new Map<string, PipelineStep>();
const entityProviders = new Map<string, SeoEntityProvider>();
const generationProfiles = new Map<string, GenerationProfile>();

export function registerAnalyzer(analyzer: ContentAnalyzer): void {
  analyzers.set(analyzer.id, analyzer);
}

export function registerRule(rule: SeoRule): void {
  rules.set(rule.id, rule);
}

export function registerValidator(validator: SeoValidator): void {
  validators.set(validator.id, validator);
}

export function registerTemplate(template: SeoTemplate): void {
  templates.set(template.id, template);
}

export function registerProvider(provider: SeoGenerationProvider): void {
  providers.set(provider.id, provider);
}

export function registerStrategy(strategy: SeoStrategyDefinition): void {
  strategies.set(strategy.id, strategy);
}

export function registerSchema(schema: SeoSchemaDefinition): void {
  schemas.set(schema.id, schema);
}

export function registerAutomationStep(id: string, step: PipelineStep): void {
  automationSteps.set(id, step);
}

export function registerEntityProvider(provider: SeoEntityProvider): void {
  entityProviders.set(provider.kind, provider);
}

export function registerGenerationProfile(profile: GenerationProfile): void {
  generationProfiles.set(profile.id, profile);
}

export { registerEngine };

export const pluginSdk = {
  registerAnalyzer,
  registerRule,
  registerValidator,
  registerTemplate,
  registerProvider,
  registerStrategy,
  registerSchema,
  registerAutomationStep,
  registerEntityProvider,
  registerGenerationProfile,
  registerEngine,
  getAnalyzers: () => [...analyzers.values()],
  getRules: () => [...rules.values()],
  getValidators: () => [...validators.values()],
  getTemplates: () => [...templates.values()],
  getProviders: () => [...providers.values()],
  getStrategies: () => [...strategies.values()],
  getSchemas: () => [...schemas.values()],
  getAutomationStep: (id: string) => automationSteps.get(id),
  getEntityProvider: (kind: string) => entityProviders.get(kind),
  getEntityProviders: () => [...entityProviders.values()],
  getGenerationProfile: (id: string) => generationProfiles.get(id),
  getGenerationProfiles: () => [...generationProfiles.values()],
  clearAll: () => {
    analyzers.clear();
    rules.clear();
    validators.clear();
    templates.clear();
    providers.clear();
    strategies.clear();
    schemas.clear();
    automationSteps.clear();
    entityProviders.clear();
    generationProfiles.clear();
  },
};
