import { MainApp } from './components/MainApp';
import { AdminApp } from './components/AdminApp';

export default function App() {
  // Determine which app to render based on current path
  const currentPath = window.location.pathname;
  const isAdminPath = currentPath.startsWith('/admin');

  if (isAdminPath) {
    return <AdminApp />;
  }

  return <MainApp />;
}