import { Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import { CollectionPage } from './components/pages/CollectionPage';
import { ItemPage } from './components/pages/ItemPage';
import { BlogListPage } from './components/pages/BlogListPage';
import { BlogPostPage } from './components/pages/BlogPostPage';
import { AdminApp } from './components/AdminApp';

export default function App() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  if (isAdminPath) {
    return <AdminApp />;
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="collepto-theme">
      <Routes>
        <Route path="/" element={<CollectionPage />} />
        <Route path="/items/:slug" element={<ItemPage />} />
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        {/* Catch-all route for 404 */}
        <Route path="*" element={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="text-muted-foreground mb-4">Page not found</p>
              <a href="/" className="text-primary hover:underline">Go home</a>
            </div>
          </div>
        } />
      </Routes>
    </ThemeProvider>
  );
}