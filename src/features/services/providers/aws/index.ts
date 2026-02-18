import { ServiceProvider } from '../../types';
import servicesData from './services.json';

export const awsProvider: ServiceProvider = {
  id: servicesData.provider,
  name: servicesData.name,
  services: servicesData.services,
  categories: servicesData.categories,
};
