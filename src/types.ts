export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SESSIONS: KVNamespace;
  PHOTOS_BUCKET: R2Bucket;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  ENVIRONMENT?: string;
}

export interface CollectorItem {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  year: number;
  yearFrom?: number;
  yearTo?: number;
  country?: string;
  organization?: string;
  size?: string;
  edition?: string;
  series?: string;
  tags: string[];
  category: string;
  condition?: string;
  acquisition?: string;
  value?: string;
  slug?: string;
  photos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  publishDate: string;
  readTime: number;
  relatedItems: string[];
  category: string;
  published: boolean;
  slug?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoAsset {
  id: string;
  itemId: string;
  originalPath: string;
  compressedPath: string;
  thumbnailPath: string; // R2 path for thumbnail (400px)
  filename: string;
  size: number;
  width: number;
  height: number;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  expiresAt: number;
  createdAt: number;
}

export interface ExportData {
  items: CollectorItem[];
  posts: BlogPost[];
  photos: PhotoAsset[];
}