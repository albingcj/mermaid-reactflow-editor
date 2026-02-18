// Core types for service provider system

export interface Service {
  id: string;                    // 'aws_s3', 'aws_lambda'
  name: string;                  // 'Amazon S3'
  aliases: string[];             // ['S3', 'Simple Storage', 'Object Storage']
  category: string;              // 'storage', 'compute', 'database'
  iconUrl?: string;              // Icon URL (to be filled later)
  tags?: string[];               // For better matching
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface ServiceProvider {
  id: string;                    // 'aws'
  name: string;                  // 'Amazon Web Services'
  services: Service[];
  categories: Category[];
}

export interface ResolvedService extends Service {
  score: number;                 // Match confidence score
  providerId: string;
}
