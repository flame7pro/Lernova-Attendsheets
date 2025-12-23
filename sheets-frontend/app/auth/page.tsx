'use client';

import { AuthPage } from '../components/authPage';
import { useRouter } from 'next/navigation';

export default function AuthRoute() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/');
  };

  const handleNavigate = (page: 'landing' | 'about' | 'contact' | 'auth' | 'app') => {
    const routes: Record<string, string> = {
      landing: '/',
      about: '/about',
      contact: '/contact',
      auth: '/auth',
      app: '/dashboard',
    };
    router.push(routes[page]);
  };

  return <AuthPage onBack={handleBack} onNavigate={handleNavigate} />;
}