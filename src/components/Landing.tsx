import { Search, MapPin, Briefcase, Building2, TrendingUp, Award, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Header } from './Header';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

interface LandingProps {
  onNavigate: (screen: 'landing' | 'jobseeker-dashboard' | 'recruiter-dashboard' | 'job-details' | 'auth' | 'profile-settings') => void;
  onViewJob: (jobId: string) => void;
}

const featuredJobs = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp Solutions',
    location: 'Bangalore, Karnataka',
    experience: '4-7 years',
    salary: '₹15-25 LPA',
    type: 'Full-time',
    postedDays: 2,
    logo: '💼',
    tags: ['React', 'TypeScript', 'Next.js']
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'InnovateLabs',
    location: 'Mumbai, Maharashtra',
    experience: '5-8 years',
    salary: '₹20-35 LPA',
    type: 'Full-time',
    postedDays: 1,
    logo: '🚀',
    tags: ['Product Strategy', 'Agile', 'Analytics']
  },
  {
    id: '3',
    title: 'UI/UX Designer',
    company: 'DesignStudio Inc',
    location: 'Pune, Maharashtra',
    experience: '3-5 years',
    salary: '₹12-18 LPA',
    type: 'Full-time',
    postedDays: 3,
    logo: '🎨',
    tags: ['Figma', 'Design Systems', 'Prototyping']
  },
  {
    id: '4',
    title: 'Data Scientist',
    company: 'Analytics Pro',
    location: 'Hyderabad, Telangana',
    experience: '2-4 years',
    salary: '₹10-16 LPA',
    type: 'Full-time',
    postedDays: 1,
    logo: '📊',
    tags: ['Python', 'ML', 'SQL']
  },
  {
    id: '5',
    title: 'DevOps Engineer',
    company: 'CloudTech Systems',
    location: 'Chennai, Tamil Nadu',
    experience: '3-6 years',
    salary: '₹14-22 LPA',
    type: 'Full-time',
    postedDays: 4,
    logo: '⚙️',
    tags: ['AWS', 'Docker', 'Kubernetes']
  },
  {
    id: '6',
    title: 'Full Stack Developer',
    company: 'StartupHub',
    location: 'Remote',
    experience: '2-5 years',
    salary: '₹12-20 LPA',
    type: 'Remote',
    postedDays: 2,
    logo: '💻',
    tags: ['Node.js', 'React', 'MongoDB']
  }
];

const topCompanies = [
  { name: 'Google', openings: 245, logo: '🔷' },
  { name: 'Microsoft', openings: 198, logo: '🔶' },
  { name: 'Amazon', openings: 312, logo: '🟠' },
  { name: 'Flipkart', openings: 156, logo: '🔵' },
  { name: 'Zomato', openings: 89, logo: '🔴' },
  { name: 'Swiggy', openings: 102, logo: '🟡' }
];

export function Landing({ onNavigate, onViewJob }: LandingProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl mb-4">
              Find your dream job today
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 mb-8">
              Discover thousands of opportunities from top companies across India
            </p>

            {/* Search Bar */}
            <Card className="p-1 sm:p-2">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row gap-2 h-4">

                  <div className="flex-1 flex items-center gap-2 px-2 h-10 bg-gray-50 rounded-lg">
                    <Search className="w-5 h-5 text-gray-500" />
                    <Input
                      placeholder="Skills, designations, companies"
                      className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    />
                  </div>

                  <div className="flex-1 flex items-center gap-2 px-2 h-10 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Location"
                      className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    />
                  </div>

                  <Button
                    className="rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 h-10 px-4"
                  >
                    <Search className="w-5 h-5 sm:mr-2" />
                    <span className="hidden sm:inline">Search</span>
                  </Button>

                </div>
              </CardContent>
            </Card>



            {/* Quick Links */}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="text-blue-100 text-sm">Trending searches:</span>
              {['Frontend Developer', 'Product Manager', 'Data Analyst', 'UI Designer'].map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 cursor-pointer rounded-full"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl text-blue-600 mb-1">10k+</div>
              <div className="text-gray-600 text-sm">Active Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl text-blue-600 mb-1">5k+</div>
              <div className="text-gray-600 text-sm">Companies</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl text-blue-600 mb-1">2M+</div>
              <div className="text-gray-600 text-sm">Job Seekers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl text-blue-600 mb-1">50k+</div>
              <div className="text-gray-600 text-sm">Hired</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-gray-900">Featured Jobs</h2>
            <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredJobs.map((job) => (
              <Card
                key={job.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => onViewJob(job.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg flex items-center justify-center text-2xl">
                      {job.logo}
                    </div>
                    <Badge variant="secondary" className="rounded-full">{job.type}</Badge>
                  </div>

                  <h3 className="text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-gray-600 mb-3">{job.company}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Briefcase className="w-4 h-4" />
                      {job.experience}
                    </div>
                    <div className="text-sm text-gray-900">
                      {job.salary}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="rounded-full text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="text-xs text-gray-500">
                    Posted {job.postedDays} day{job.postedDays > 1 ? 's' : ''} ago
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Top Companies */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-gray-900">Top Companies Hiring</h2>
            <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {topCompanies.map((company) => (
              <Card
                key={company.name}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg flex items-center justify-center text-3xl mb-3">
                    {company.logo}
                  </div>
                  <h3 className="text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {company.name}
                  </h3>
                  <p className="text-sm text-gray-600">{company.openings} openings</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Employers */}
      <section className="py-12 bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl text-gray-900 mb-4">For Employers</h2>
              <p className="text-lg text-gray-600 mb-6">
                Find the perfect candidates for your company. Post jobs and connect with millions of job seekers.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Access to 2M+ job seekers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Advanced candidate filtering</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Detailed analytics & insights</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Dedicated account manager</span>
                </li>
              </ul>
              <Button
                size="lg"
                className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                onClick={() => onNavigate('auth')}
              >
                Post a Job <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="hidden md:grid grid-cols-2 gap-4">
              <Card className="bg-white">
                <CardContent className="p-6">
                  <Building2 className="w-8 h-8 text-blue-600 mb-3" />
                  <div className="text-2xl text-gray-900 mb-1">5000+</div>
                  <div className="text-gray-600">Trusted Companies</div>
                </CardContent>
              </Card>
              <Card className="bg-white mt-8">
                <CardContent className="p-6">
                  <Users className="w-8 h-8 text-teal-600 mb-3" />
                  <div className="text-2xl text-gray-900 mb-1">98%</div>
                  <div className="text-gray-600">Success Rate</div>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="p-6">
                  <TrendingUp className="w-8 h-8 text-blue-600 mb-3" />
                  <div className="text-2xl text-gray-900 mb-1">Fast</div>
                  <div className="text-gray-600">Hiring Process</div>
                </CardContent>
              </Card>
              <Card className="bg-white mt-8">
                <CardContent className="p-6">
                  <Award className="w-8 h-8 text-teal-600 mb-3" />
                  <div className="text-2xl text-gray-900 mb-1">Premium</div>
                  <div className="text-gray-600">Candidates</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white mb-4">For Job Seekers</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Browse Jobs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Browse Companies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Career Resources</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Resume Builder</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white mb-4">For Employers</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Post a Job</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Search Resumes</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Resources</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2025 RhirePro. All rights reserved. Your trusted job search partner.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
