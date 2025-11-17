import { useState } from 'react';
import { Header } from './Header';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plus, Users, Eye, TrendingUp, Filter, Search, MoreVertical,
  FileText, CheckCircle2, Clock, XCircle, Briefcase, MapPin,
  Calendar, DollarSign, Star
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface RecruiterDashboardProps {
  onNavigate: (screen: 'landing' | 'jobseeker-dashboard' | 'recruiter-dashboard' | 'job-details' | 'auth' | 'profile-settings') => void;
  onLogout: () => void;
}

const postedJobs = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    location: 'Bangalore, Karnataka',
    type: 'Full-time',
    postedDate: '2 days ago',
    applicants: 48,
    views: 324,
    status: 'Active'
  },
  {
    id: '2',
    title: 'Product Manager',
    location: 'Mumbai, Maharashtra',
    type: 'Full-time',
    postedDate: '5 days ago',
    applicants: 62,
    views: 512,
    status: 'Active'
  },
  {
    id: '3',
    title: 'UI/UX Designer',
    location: 'Pune, Maharashtra',
    type: 'Contract',
    postedDate: '1 week ago',
    applicants: 35,
    views: 267,
    status: 'Closed'
  }
];

const candidates = [
  {
    id: '1',
    name: 'Rahul Kumar',
    position: 'Frontend Developer',
    experience: '4 years',
    location: 'Bangalore, Karnataka',
    skills: ['React', 'TypeScript', 'Next.js'],
    appliedFor: 'Senior Frontend Developer',
    appliedDate: '1 day ago',
    status: 'Shortlisted',
    match: 95,
    avatar: '👨‍💼'
  },
  {
    id: '2',
    name: 'Priya Sharma',
    position: 'Full Stack Developer',
    experience: '5 years',
    location: 'Bangalore, Karnataka',
    skills: ['React', 'Node.js', 'AWS'],
    appliedFor: 'Senior Frontend Developer',
    appliedDate: '2 days ago',
    status: 'New',
    match: 88,
    avatar: '👩‍💼'
  },
  {
    id: '3',
    name: 'Amit Patel',
    position: 'Frontend Engineer',
    experience: '3 years',
    location: 'Mumbai, Maharashtra',
    skills: ['React', 'JavaScript', 'CSS'],
    appliedFor: 'Senior Frontend Developer',
    appliedDate: '3 days ago',
    status: 'Reviewed',
    match: 82,
    avatar: '🧑‍💼'
  }
];

export function RecruiterDashboard({ onNavigate, onLogout }: RecruiterDashboardProps) {
  const [isPostJobOpen, setIsPostJobOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userType="recruiter" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl text-gray-900 mb-1">Recruiter Dashboard</h1>
            <p className="text-gray-600">Manage your job postings and candidates</p>
          </div>
          <Dialog open={isPostJobOpen} onOpenChange={setIsPostJobOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                <Plus className="w-5 h-5 mr-2" />
                Post New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Post a New Job</DialogTitle>
                <DialogDescription>
                  Fill in the details below to post a new job opening
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="job-title">Job Title *</Label>
                  <Input id="job-title" placeholder="e.g. Senior Frontend Developer" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job-type">Job Type *</Label>
                    <Select>
                      <SelectTrigger id="job-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input id="location" placeholder="e.g. Bangalore, Karnataka" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-exp">Min Experience (years)</Label>
                    <Input id="min-exp" type="number" placeholder="3" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-exp">Max Experience (years)</Label>
                    <Input id="max-exp" type="number" placeholder="7" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-salary">Min Salary (LPA)</Label>
                    <Input id="min-salary" type="number" placeholder="15" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-salary">Max Salary (LPA)</Label>
                    <Input id="max-salary" type="number" placeholder="25" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe the role, responsibilities, and requirements..."
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills">Required Skills *</Label>
                  <Input id="skills" placeholder="e.g. React, TypeScript, Next.js (comma separated)" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsPostJobOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                    onClick={() => setIsPostJobOpen(false)}
                  >
                    Post Job
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl text-gray-900 mb-1">12</div>
              <div className="text-sm text-gray-600">Active Jobs</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-teal-600" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl text-gray-900 mb-1">248</div>
              <div className="text-sm text-gray-600">Total Applicants</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl text-gray-900 mb-1">3.2K</div>
              <div className="text-sm text-gray-600">Profile Views</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl text-gray-900 mb-1">18</div>
              <div className="text-sm text-gray-600">Hired</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="candidates" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="candidates" className="rounded-full">Candidates</TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-full">Posted Jobs</TabsTrigger>
          </TabsList>

          {/* Candidates Tab */}
          <TabsContent value="candidates" className="space-y-4">
            {/* Search & Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <Search className="w-5 h-5 text-gray-400" />
                    <Input 
                      placeholder="Search candidates..."
                      className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-lg">
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                    </Button>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Candidates List */}
            {candidates.map((candidate) => (
              <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                      {candidate.avatar}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg text-gray-900">{candidate.name}</h3>
                            <Badge 
                              className={`rounded-full ${
                                candidate.status === 'Shortlisted' ? 'bg-green-100 text-green-800' :
                                candidate.status === 'New' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {candidate.status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-1">{candidate.position}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {candidate.experience}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {candidate.location}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-green-600 mb-1">
                            <Star className="w-4 h-4 fill-green-600" />
                            <span>{candidate.match}% Match</span>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {candidate.skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="rounded-full text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Applied for <span className="text-gray-900">{candidate.appliedFor}</span> • {candidate.appliedDate}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="rounded-full">
                            View Profile
                          </Button>
                          <Button className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                            Schedule Interview
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Posted Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            {postedJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg text-gray-900">{job.title}</h3>
                        <Badge 
                          className={`rounded-full ${
                            job.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {job.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Posted {job.postedDate}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-2xl text-gray-900 mb-1">{job.applicants}</div>
                      <div className="text-xs text-gray-600">Applicants</div>
                    </div>
                    <div>
                      <div className="text-2xl text-gray-900 mb-1">{job.views}</div>
                      <div className="text-xs text-gray-600">Views</div>
                    </div>
                    <div>
                      <div className="text-2xl text-gray-900 mb-1">12</div>
                      <div className="text-xs text-gray-600">Shortlisted</div>
                    </div>
                    <div>
                      <div className="text-2xl text-gray-900 mb-1">3</div>
                      <div className="text-xs text-gray-600">Interviewed</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button variant="outline" className="rounded-full">
                      View Analytics
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" className="rounded-full">
                        Edit Job
                      </Button>
                      <Button className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                        View Applicants
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
