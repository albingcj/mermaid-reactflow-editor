export * from './types';
export * from './registry';
export * from './providers';

// Initialize registry with providers
import { serviceRegistry } from './registry';
import { providers } from './providers';

// Register all providers on module load
providers.forEach(provider => {
  serviceRegistry.registerProvider(provider);
});
