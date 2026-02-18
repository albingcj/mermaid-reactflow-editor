import Fuse from 'fuse.js';
import { ServiceProvider, Service, ResolvedService } from './types';

export class ServiceRegistry {
  private providers: Map<string, ServiceProvider> = new Map();
  private fuseInstances: Map<string, Fuse<Service>> = new Map();

  registerProvider(provider: ServiceProvider) {
    this.providers.set(provider.id, provider);
    
    // Create Fuse instance for fuzzy matching
    const fuse = new Fuse(provider.services, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'aliases', weight: 3 },
        { name: 'tags', weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
    
    this.fuseInstances.set(provider.id, fuse);
  }

  resolveService(query: string, providerId?: string): ResolvedService | null {
    const targetProviders = providerId 
      ? [providerId] 
      : Array.from(this.providers.keys());

    let bestMatch: ResolvedService | null = null;
    let bestScore = Infinity;

    for (const pid of targetProviders) {
      const fuse = this.fuseInstances.get(pid);
      if (!fuse) continue;

      const results = fuse.search(query);
      if (results.length > 0 && results[0].score !== undefined) {
        const score = results[0].score;
        if (score < bestScore) {
          bestScore = score;
          bestMatch = {
            ...results[0].item,
            score: 1 - score, // Convert to confidence score (higher is better)
            providerId: pid,
          };
        }
      }
    }

    return bestMatch;
  }

  getAllServices(providerId?: string): Service[] {
    if (providerId) {
      const provider = this.providers.get(providerId);
      return provider ? provider.services : [];
    }

    // Return all services from all providers
    const allServices: Service[] = [];
    for (const provider of this.providers.values()) {
      allServices.push(...provider.services);
    }
    return allServices;
  }

  getProvider(providerId: string): ServiceProvider | undefined {
    return this.providers.get(providerId);
  }

  getAllProviders(): ServiceProvider[] {
    return Array.from(this.providers.values());
  }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();
