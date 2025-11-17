import { useState } from 'react';
import { Landing } from './components/Landing';
import { JobSeekerDashboard } from './components/JobSeekerDashboard';
import { RecruiterDashboard } from './components/RecruiterDashboard';
import { JobDetailsPage } from './components/JobDetailsPage';
import { AuthScreen } from './components/AuthScreen';
import { ProfileSettings } from './components/ProfileSettings';

export type UserType = 'jobseeker' | 'recruiter' | null;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'jobseeker-dashboard' | 'recruiter-dashboard' | 'job-details' | 'auth' | 'profile-settings'>('landing');
  const [userType, setUserType] = useState<UserType>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const handleLogin = (type: UserType) => {
    setUserType(type);
    if (type === 'jobseeker') {
      setCurrentScreen('jobseeker-dashboard');
    } else if (type === 'recruiter') {
      setCurrentScreen('recruiter-dashboard');
    }
  };

  const handleLogout = () => {
    setUserType(null);
    setCurrentScreen('landing');
  };

  const handleViewJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setCurrentScreen('job-details');
  };

  const handleNavigate = (screen: 'landing' | 'jobseeker-dashboard' | 'recruiter-dashboard' | 'job-details' | 'auth' | 'profile-settings') => {
    setCurrentScreen(screen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentScreen === 'landing' && (
        <Landing 
          onNavigate={handleNavigate}
          onViewJob={handleViewJob}
        />
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
          onNavigate={handleNavigate}
          onViewJob={handleViewJob}
          userType={userType}
        />
      )}
      {currentScreen === 'auth' && (
        <AuthScreen 
          onLogin={handleLogin}
          onNavigate={handleNavigate}
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
