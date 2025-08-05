import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ThemeProvider } from './ui/theme-provider';
import { Home, LogOut } from 'lucide-react';
import { AdminAuth } from './AdminAuth';
import { AdminPanel } from './AdminPanel';
import { apiClient } from '../utils/api';

export function AdminApp() {
  const [currentPage, setCurrentPage] = useState<'admin-auth' | 'admin'>('admin-auth');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const statusResponse = await apiClient.checkAuthStatus();
          if (statusResponse.success && statusResponse.data?.authenticated) {
            setIsAuthenticated(true);
            setCurrentPage('admin');
          } else {
            apiClient.clearSession();
            setIsAuthenticated(false);
            setCurrentPage('admin-auth');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          apiClient.clearSession();
          setIsAuthenticated(false);
          setCurrentPage('admin-auth');
        }
      } else {
        setIsAuthenticated(false);
        setCurrentPage('admin-auth');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setCurrentPage('admin');
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setCurrentPage('admin-auth');
    }
  };

  const handleBackToMain = () => {
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="collepto-theme">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Checking authentication...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="collepto-theme">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <button 
                className="flex items-center space-x-2 font-bold text-xl hover:text-primary transition-colors"
                onClick={handleBackToMain}
              >
                <span>Collepto Admin</span>
              </button>
            </div>
            <div className="flex flex-1 items-center justify-end space-x-2">
              <Button variant="ghost" size="sm" onClick={handleBackToMain} className="gap-2">
                <Home className="w-4 h-4" />
                Main Site
              </Button>
              {isAuthenticated && (
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {currentPage === 'admin-auth' && (
            <AdminAuth onAuthSuccess={handleAuthSuccess} />
          )}

          {currentPage === 'admin' && isAuthenticated && (
            <AdminPanel />
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}