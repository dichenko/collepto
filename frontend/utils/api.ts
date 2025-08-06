// API client for Collepto backend
const API_BASE_URL = 'https://collepto.3451881.workers.dev/api';

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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

class ApiClient {
  private baseUrl: string;
  private sessionToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Try to get session from localStorage
    this.sessionToken = localStorage.getItem('collepto_session');
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add auth header if we have a session
    if (this.sessionToken) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${this.sessionToken}`,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Authentication
  async login(username: string, password: string): Promise<ApiResponse<{ sessionId: string; expiresAt: string }>> {
    const credentials = btoa(`${username}:${password}`);
    const response = await this.request<{ sessionId: string; expiresAt: string }>('/auth/login', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (response.success && response.data) {
      this.sessionToken = response.data.sessionId;
      localStorage.setItem('collepto_session', this.sessionToken);
    }

    return response;
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await this.request<void>('/auth/logout', {
      method: 'POST',
    });

    this.sessionToken = null;
    localStorage.removeItem('collepto_session');
    return response;
  }

  async checkAuthStatus(): Promise<ApiResponse<{ authenticated: boolean; expiresAt?: string }>> {
    return this.request('/auth/status');
  }

  // Public API - Items
  async getItems(): Promise<ApiResponse<CollectorItem[]>> {
    return this.request('/items');
  }

  async getItem(id: string): Promise<ApiResponse<CollectorItem>> {
    return this.request(`/items/${id}`);
  }

  async getItemBySlug(slug: string): Promise<ApiResponse<CollectorItem>> {
    return this.request(`/items/slug/${slug}`);
  }

  async searchItems(params: {
    q?: string;
    category?: string;
    yearFrom?: number;
    yearTo?: number;
    tags?: string[];
  }): Promise<ApiResponse<CollectorItem[]>> {
    const searchParams = new URLSearchParams();
    
    if (params.q) searchParams.append('q', params.q);
    if (params.category) searchParams.append('category', params.category);
    if (params.yearFrom) searchParams.append('yearFrom', params.yearFrom.toString());
    if (params.yearTo) searchParams.append('yearTo', params.yearTo.toString());
    if (params.tags && params.tags.length > 0) {
      searchParams.append('tags', params.tags.join(','));
    }

    return this.request(`/items/search?${searchParams.toString()}`);
  }

  // Public API - Blog
  async getBlogPosts(): Promise<ApiResponse<BlogPost[]>> {
    return this.request('/blog');
  }

  async getBlogPost(id: string): Promise<ApiResponse<BlogPost>> {
    return this.request(`/blog/${id}`);
  }

  async getBlogPostBySlug(slug: string): Promise<ApiResponse<BlogPost>> {
    return this.request(`/blog/slug/${slug}`);
  }

  // Admin API - Items
  async createItem(item: Omit<CollectorItem, 'id' | 'createdAt' | 'updatedAt' | 'photos'>): Promise<ApiResponse<{ id: string }>> {
    return this.request('/admin/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateItem(id: string, item: Partial<CollectorItem>): Promise<ApiResponse<{ id: string }>> {
    return this.request(`/admin/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async deleteItem(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.request(`/admin/items/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin API - Blog
  async createBlogPost(post: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<{ id: string }>> {
    return this.request('/admin/blog', {
      method: 'POST',
      body: JSON.stringify(post),
    });
  }

  async updateBlogPost(id: string, post: Partial<BlogPost>): Promise<ApiResponse<{ id: string }>> {
    return this.request(`/admin/blog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(post),
    });
  }

  async deleteBlogPost(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.request(`/admin/blog/${id}`, {
      method: 'DELETE',
    });
  }

  async publishBlogPost(id: string, published: boolean): Promise<ApiResponse<{ id: string; published: boolean }>> {
    return this.request(`/admin/blog/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ published }),
    });
  }

  // Admin API - Photos
  async uploadPhoto(itemId: string, file: File): Promise<ApiResponse<{
    id: string;
    publicUrl: string;
    filename: string;
  }>> {
    const formData = new FormData();
    formData.append('photo', file);

    const config: RequestInit = {
      method: 'POST',
      body: formData,
    };

    // Add auth header but don't set Content-Type (browser will set it with boundary for FormData)
    if (this.sessionToken) {
      config.headers = {
        'Authorization': `Bearer ${this.sessionToken}`,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/admin/photos/item/${itemId}/upload`, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('Photo upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // Admin API - Upload both original and processed photo
  async uploadPhotoBoth(itemId: string, originalFile: File, processedFile: File): Promise<ApiResponse<{
    id: string;
    publicUrl: string;
    filename: string;
  }>> {
    const formData = new FormData();
    formData.append('original', originalFile);
    formData.append('processed', processedFile);

    const config: RequestInit = {
      method: 'POST',
      body: formData,
    };

    // Add auth header but don't set Content-Type (browser will set it with boundary for FormData)
    if (this.sessionToken) {
      config.headers = {
        'Authorization': `Bearer ${this.sessionToken}`,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/admin/photos/item/${itemId}/upload-both`, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('Photo upload (both) failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async deletePhoto(photoId: string): Promise<ApiResponse<{ id: string }>> {
    return this.request(`/admin/photos/${photoId}`, {
      method: 'DELETE',
    });
  }

  // Admin API - Export
  async exportData(): Promise<ApiResponse<{
    totalItems: number;
    totalPosts: number;
    totalPhotos: number;
    exportUrl: string;
  }>> {
    return this.request('/admin/export');
  }

  async downloadExport(): Promise<void> {
    if (!this.sessionToken) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${this.baseUrl}/admin/export/download`, {
      headers: {
        'Authorization': `Bearer ${this.sessionToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Export download failed');
    }

    // Trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collepto_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Helper methods
  isAuthenticated(): boolean {
    return !!this.sessionToken;
  }

  clearSession(): void {
    this.sessionToken = null;
    localStorage.removeItem('collepto_session');
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;