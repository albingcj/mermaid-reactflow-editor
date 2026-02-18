import { awsProvider } from './aws';
import { ServiceProvider } from '../types';

// Registry of all available providers
export const providers: ServiceProvider[] = [
  awsProvider,
  // Add more providers here in the future (Azure, GCP, etc.)
];

export { awsProvider };
