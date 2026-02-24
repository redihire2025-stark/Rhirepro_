import { useState, useEffect } from 'react';
import { Header } from './Header';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Briefcase, MapPin, Clock, TrendingUp, FileText,
  User, Bell, Search, Filter, BookmarkPlus, Building2,
  Calendar, DollarSign, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';


interface JobSeekerDashboardProps {
  onNavigate: (screen: 'landing' | 'jobseeker-dashboard' | 'recruiter-dashboard' | 'job-details' | 'auth' | 'profile-settings') => void;
  onLogout: () => void;
  onViewJob: (jobId: string) => void;
}

const appliedJobs = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp Solutions',
    location: 'Bangalore, Karnataka',
    appliedDate: '2 days ago',
    status: 'Under Review',
    statusType: 'pending' as const,
    salary: '₹15-25 LPA',
    logo: '💼'
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'InnovateLabs',
    location: 'Mumbai, Maharashtra',
    appliedDate: '5 days ago',
    status: 'Interview Scheduled',
    statusType: 'interview' as const,
    salary: '₹20-35 LPA',
    logo: '🚀'
  },
  {
    id: '3',
    title: 'UI/UX Designer',
    company: 'DesignStudio Inc',
    location: 'Pune, Maharashtra',
    appliedDate: '1 week ago',
    status: 'Not Selected',
    statusType: 'rejected' as const,
    salary: '₹12-18 LPA',
    logo: '🎨'
  }
];

const recommendedJobs = [
  {
    id: '4',
    title: 'React Developer',
    company: 'WebTech Solutions',
    location: 'Bangalore, Karnataka',
    experience: '3-5 years',
    salary: '₹12-18 LPA',
    matchScore: 95,
    postedDays: 1,
    logo: '⚛️',
    tags: ['React', 'JavaScript', 'CSS']
  },
  {
    id: '5',
    title: 'Frontend Architect',
    company: 'Enterprise Systems',
    location: 'Hyderabad, Telangana',
    experience: '5-8 years',
    salary: '₹20-30 LPA',
    matchScore: 88,
    postedDays: 2,
    logo: '🏗️',
    tags: ['React', 'Architecture', 'Team Lead']
  },
  {
    id: '6',
    title: 'Full Stack Developer',
    company: 'StartupHub',
    location: 'Remote',
    experience: '3-6 years',
    salary: '₹15-22 LPA',
    matchScore: 82,
    postedDays: 3,
    logo: '💻',
    tags: ['React', 'Node.js', 'MongoDB']
  }
];

export function JobSeekerDashboard({ onNavigate, onLogout, onViewJob }: JobSeekerDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [user, setUser] = useState<any>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;
        const data = await res.json();
        setUser(data);
        const percentage = calculateProfileCompletion(data);
        setProfileCompletion(percentage);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    };

    fetchProfile();
  }, []);

  const calculateProfileCompletion = (user: any) => {
    if (!user) return 0;

    // Define sections and their inner fields
    const basicFields = [
      user.firstName,
      user.lastName,
      user.phone,
      user.location,
      user.headline,
      user.about,
      user.profilePhoto,
      user.resume,
    ];

    let professionalFields = [
      user.totalExperience,
      user.employmentStatus,
      user.currentJobTitle,
      user.currentCompany,
      user.noticePeriod,
      user.currentCTC,
      user.expectedCTC,
    ];

    // If user is a fresher, consider project field instead of professional details
    if (user.employmentStatus === 'fresher') {
      professionalFields = [
        user.project?.name,
        user.project?.duration,
        (user.project?.domains || []).length,
      ];
    }

    const skillsEducationFields = [
      (user.primarySkills || []).length,
      (user.secondarySkills || []).length,
      (user.education || []).length,
      (user.certifications || []).length,
    ];

    // Only require the visible preference fields for completion
    const preferencesFields = [
      user.preferredJobType,
      user.preferredLocation,
      user.workMode,
    ];

    const sectionScore = (fields: any[]) => {
      if (!fields || fields.length === 0) return 0;
      const filled = fields.filter(Boolean).length;
      return filled / fields.length; // 0..1
    };

    // Each section contributes 25%
    const basicScore = sectionScore(basicFields) * 25;
    const profScore = sectionScore(professionalFields) * 25;
    const skillsEduScore = sectionScore(skillsEducationFields) * 25;
    const prefScore = sectionScore(preferencesFields) * 25;

    const total = basicScore + profScore + skillsEduScore + prefScore;
    const rounded = Math.round(total);
    if (rounded < 100) {
      // debug info to help identify missing bits
      // eslint-disable-next-line no-console
      console.debug('Profile completion debug', {
        basic: { filled: basicFields.filter(Boolean).length, total: basicFields.length, score: basicScore },
        professional: { filled: professionalFields.filter(Boolean).length, total: professionalFields.length, score: profScore },
        skillsEducation: { filled: skillsEducationFields.filter(Boolean).length, total: skillsEducationFields.length, score: skillsEduScore },
        preferences: { filled: preferencesFields.filter(Boolean).length, total: preferencesFields.length, score: prefScore },
        total,
      });
    }
    return rounded;
  };

  const completion = calculateProfileCompletion(user);

  const getCompletionDetails = (user: any) => {
    if (!user) return null;
    const basicFields = [
      user.firstName,
      user.lastName,
      user.phone,
      user.location,
      user.headline,
      user.about,
      user.profilePhoto,
      user.resume,
    ];

    let professionalFields = [
      user.totalExperience,
      user.employmentStatus,
      user.currentJobTitle,
      user.currentCompany,
      user.noticePeriod,
      user.currentCTC,
      user.expectedCTC,
    ];

    if (user.employmentStatus === 'fresher') {
      professionalFields = [user.project?.name, user.project?.duration, (user.project?.domains || []).length];
    }

    const skillsEducationFields = [
      (user.primarySkills || []).length,
      (user.secondarySkills || []).length,
      (user.education || []).length,
      (user.certifications || []).length,
    ];

    const preferencesFields = [user.preferredJobType, user.preferredLocation, user.workMode];

    return {
      basic: { filled: basicFields.filter(Boolean).length, total: basicFields.length },
      professional: { filled: professionalFields.filter(Boolean).length, total: professionalFields.length },
      skillsEdu: { filled: skillsEducationFields.filter(Boolean).length, total: skillsEducationFields.length },
      preferences: { filled: preferencesFields.filter(Boolean).length, total: preferencesFields.length },
    };
  };

  // Compute missing fields list for checklist under progress bar
  const missingFields = (user: any) => {
    if (!user) return [];
    const missing: string[] = [];
    if (!user.firstName) missing.push('First name');
    if (!user.lastName) missing.push('Last name');
    if (!user.phone) missing.push('Phone');
    if (!user.location) missing.push('Location');
    if (!user.headline) missing.push('Headline');
    if (!user.about) missing.push('About');
    if (!user.profilePhoto) missing.push('Profile photo');
    if (!user.resume) missing.push('Resume');

    // professional
    if (user.employmentStatus !== 'fresher') {
      if (!user.totalExperience) missing.push('Total experience');
      if (!user.currentJobTitle) missing.push('Current job title');
      if (!user.currentCompany) missing.push('Current company');
    } else {
      // For freshers, require project name, duration, and domains
      if (!user.project?.name) missing.push('Project name');
      if (!user.project?.duration) missing.push('Project duration');
      if (!((user.project?.domains || []).length)) missing.push('Project domains');
    }

    if (!((user.primarySkills || []).length)) missing.push('Primary skills');
    if (!((user.secondarySkills || []).length)) missing.push('Secondary skills');
    if (!((user.education || []).length)) missing.push('Education');
    if (!((user.certifications || []).length)) missing.push('Certifications');

    if (!user.preferredJobType) missing.push('Preferred job type');
    if (!user.preferredLocation) missing.push('Preferred location');
    if (!user.workMode) missing.push('Work mode');

    return missing;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userType="jobseeker" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Profile Completion Banner */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-teal-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg text-gray-900 mb-2">Complete your profile to get better job matches</h3>
                <div className="mb-2">
                  <Progress value={completion} className="h-2" />
                </div>
                <p className="text-sm text-gray-600">{completion}% completed</p>
                {completion < 100 && (
                  <div className="mt-2 text-sm text-gray-700">
                    <p className="font-medium">To reach 100% fill:</p>
                    {missingFields(user).length > 0 ? (
                      <ul className="list-disc ml-5">
                        {missingFields(user).slice(0, 6).map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                        {missingFields(user).length > 6 && <li>and more...</li>}
                      </ul>
                    ) : (
                      // no missing fields but not 100%: show breakdown
                      (() => {
                        const d = getCompletionDetails(user);
                        if (!d) return <p>No details available</p>;
                        return (
                          <div className="text-sm text-gray-700">
                            <p className="font-medium">Completion breakdown:</p>
                            <ul className="list-disc ml-5">
                              <li>Basic: {d.basic.filled}/{d.basic.total}</li>
                              <li>Professional: {d.professional.filled}/{d.professional.total}</li>
                              <li>Skills & Education: {d.skillsEdu.filled}/{d.skillsEdu.total}</li>
                              <li>Preferences: {d.preferences.filled}/{d.preferences.total}</li>
                            </ul>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
              <Button
                className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                onClick={() => onNavigate('profile-settings')}
              >
                Complete Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Profile Summary */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-3">
                    {user?.profilePhoto ? (
                      <img src={`http://localhost:5000${user.profilePhoto}`} alt="profile" className="w-20 h-20 object-cover" />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-400 rounded-full flex items-center justify-center">
                        <User className="w-10 h-10 text-white" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-gray-600">
                    {user?.headline || 'Add Professional Headline'}
                  </p>
                  <Badge variant="secondary" className="mt-2 rounded-full">
                    {user?.totalExperience || 0} years experience
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {user?.location || 'Add Location'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="w-4 h-4" />
                    Currently at {user?.currentCompany || 'Add Company'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    Expected: ₹{user?.expectedCTC || 'Add Expected Salary'}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-6 rounded-full"
                  onClick={() => onNavigate('profile-settings')}
                >
                  View Full Profile
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Applications</span>
                  </div>
                  <span className="text-gray-900">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Interviews</span>
                  </div>
                  <span className="text-gray-900">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Profile Views</span>
                  </div>
                  <span className="text-gray-900">156</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Bell className="w-4 h-4" />
                    <span className="text-sm">New Matches</span>
                  </div>
                  <Badge className="rounded-full bg-blue-600">8</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search & Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <Search className="w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-lg">
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="recommended" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="recommended" className="rounded-full">Recommended Jobs</TabsTrigger>
                <TabsTrigger value="applied" className="rounded-full">Applied Jobs</TabsTrigger>
              </TabsList>

              {/* Recommended Jobs Tab */}
              <TabsContent value="recommended" className="space-y-4">
                {recommendedJobs.map((job) => (
                  <Card
                    key={job.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => onViewJob(job.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                          {job.logo}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <h3 className="text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                {job.title}
                              </h3>
                              <p className="text-gray-600">{job.company}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-sm text-green-600 mb-1">{job.matchScore}% Match</div>
                                <Progress value={job.matchScore} className="h-1 w-16" />
                              </div>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <BookmarkPlus className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              {job.location}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Briefcase className="w-4 h-4" />
                              {job.experience}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-900">
                              <DollarSign className="w-4 h-4" />
                              {job.salary}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {job.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="rounded-full text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              Posted {job.postedDays} day{job.postedDays > 1 ? 's' : ''} ago
                            </div>
                            <Button className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                              Apply Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Applied Jobs Tab */}
              <TabsContent value="applied" className="space-y-4">
                {appliedJobs.map((job) => (
                  <Card
                    key={job.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => onViewJob(job.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                          {job.logo}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <h3 className="text-lg text-gray-900 mb-1">
                                {job.title}
                              </h3>
                              <p className="text-gray-600">{job.company}</p>
                            </div>
                            <Badge
                              className={`rounded-full ${job.statusType === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                job.statusType === 'interview' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}
                            >
                              {job.statusType === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                              {job.statusType === 'interview' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {job.statusType === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                              {job.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              {job.location}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              Applied {job.appliedDate}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-900">
                              <DollarSign className="w-4 h-4" />
                              {job.salary}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <Button variant="outline" className="rounded-full">
                              View Details
                            </Button>
                            {job.statusType === 'interview' && (
                              <Button className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                                Schedule Interview
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
