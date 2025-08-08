// Script to create a test blog post with slug
const API_BASE = 'https://collepto.3451881.workers.dev/api';

async function createTestPost() {
  try {
    // First, login to get admin session
    const credentials = btoa('admin:3d6b46s5-11a1-469b-ab9a-9b41e84ae3f0'); // Use your actual admin credentials
    
    console.log('Logging in...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    const loginData = await loginResponse.json();
    const sessionToken = loginData.data.sessionId;
    console.log('Login successful!');
    
    // Create a test blog post
    const testPost = {
      title: 'The Story of My Leica IIIf: From Find to Restoration',
      excerpt: 'A fascinating journey of discovering and restoring a classic Leica IIIf camera from the 1950s.',
      content: `# The Discovery

Finding vintage cameras in flea markets is always exciting, but discovering a Leica IIIf in working condition was something special.

## The Restoration Process

The camera needed careful cleaning and some minor repairs:

1. **Lens cleaning** - removing decades of dust and fingerprints
2. **Shutter calibration** - ensuring accurate exposure times
3. **Light seals replacement** - preventing light leaks

## Final Results

After restoration, this beautiful piece of photographic history is ready to capture images once again.

*This camera represents the golden age of precision German engineering.*`,
      publishDate: '2024-12-15',
      readTime: 5,
      relatedItems: [],
      category: 'Camera Restoration',
      published: true
    };
    
    console.log('Creating test post...');
    const createResponse = await fetch(`${API_BASE}/admin/blog`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPost)
    });
    
    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      throw new Error(`Create failed: ${errorData}`);
    }
    
    const createData = await createResponse.json();
    console.log('Test post created successfully!');
    console.log('Post ID:', createData.data.id);
    
    // The slug should be generated automatically: "the-story-of-my-leica-iiif-from-find-to-restoration_" + first 4 chars of ID
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Only run if called directly
if (require.main === module) {
  createTestPost();
}

module.exports = { createTestPost };
