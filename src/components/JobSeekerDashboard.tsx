import { useState } from 'react';
import { Header } from './Header';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Briefcase, MapPin, Clock, TrendingUp, FileText, 
  User, Bell, Search, Filter, BookmarkPlus, Building2,
  Calendar, DollarSign, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { Progress } from './ui/progress';

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
                <Progress value={65} className="h-2 mb-2" />
                <p className="text-sm text-gray-600">65% completed - Add your skills and experience</p>
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
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-teal-400 rounded-full flex items-center justify-center mb-3">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-lg text-gray-900">Rahul Kumar</h3>
                  <p className="text-gray-600">Frontend Developer</p>
                  <Badge variant="secondary" className="mt-2 rounded-full">
                    4 years experience
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    Bangalore, Karnataka
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="w-4 h-4" />
                    Currently at TechStartup
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    Expected: ₹15-20 LPA
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
                              className={`rounded-full ${
                                job.statusType === 'pending' ? 'bg-yellow-100 text-yellow-800' :
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
