import { useState, useEffect } from 'react';
import { Landing } from './components/Landing';
import { JobSeekerDashboard } from './components/JobSeekerDashboard';
import { RecruiterDashboard } from './components/RecruiterDashboard';
import { JobDetailsPage } from './components/JobDetailsPage';
import { AuthScreen } from './components/AuthScreen';
import { ProfileSettings } from './components/ProfileSettings';

export type UserType = 'jobseeker' | 'recruiter' | null;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    'landing' |
    'jobseeker-dashboard' |
    'recruiter-dashboard' |
    'job-details' |
    'auth' |
    'profile-settings'
  >('landing');

  const [userType, setUserType] = useState<UserType>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    // Handle Google OAuth callback token from backend redirect.
    if (token) {
      localStorage.setItem('token', token);
      params.delete('token');
      const query = params.toString();
      const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedToken && !storedUser) {
      fetch(`${(import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then(async (res) => {
          const user = await res.json();
          if (!res.ok) throw new Error(user?.message || 'Failed to fetch user');

          localStorage.setItem(
            'user',
            JSON.stringify({
              name: user.name,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone || '',
              email: user.email,
              employmentStatus: user.employmentStatus || 'experienced',
              role: user.role || 'jobseeker',
            })
          );

          setUserType(user.role);
          setCurrentScreen(user.role === 'recruiter' ? 'recruiter-dashboard' : 'jobseeker-dashboard');
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        });
      return;
    }

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUserType(parsedUser.role);

      if (parsedUser.role === 'jobseeker') {
        setCurrentScreen('jobseeker-dashboard');
      } else {
        setCurrentScreen('recruiter-dashboard');
      }
    }
  }, []);

  const handleLogin = (type: UserType) => {
    setUserType(type);
    setCurrentScreen(
      type === 'jobseeker'
        ? 'jobseeker-dashboard'
        : 'recruiter-dashboard'
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUserType(null);
    setCurrentScreen('landing');
  };

  const handleViewJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setCurrentScreen('job-details');
  };

  const handleNavigate = (screen: typeof currentScreen) => {
    setCurrentScreen(screen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentScreen === 'landing' && (
        <Landing onNavigate={handleNavigate} onViewJob={handleViewJob} />
      )}

      {currentScreen === 'auth' && (
        <AuthScreen onLogin={handleLogin} onNavigate={handleNavigate} />
      )}

      {currentScreen === 'jobseeker-dashboard' && (
        <JobSeekerDashboard
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onViewJob={handleViewJob}
        />
      )}

      {currentScreen === 'recruiter-dashboard' && (
        <RecruiterDashboard
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'job-details' && (
        <JobDetailsPage
          jobId={selectedJobId}
          userType={userType}
          onNavigate={handleNavigate}
          onViewJob={handleViewJob}
        />
      )}

      {currentScreen === 'profile-settings' && (
        <ProfileSettings
          userType={userType}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
