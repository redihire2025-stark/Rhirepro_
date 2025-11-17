import { Header } from './Header';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  MapPin, Briefcase, DollarSign, Clock, Building2, Users, 
  Share2, Bookmark, CheckCircle2, ArrowLeft, Calendar, GraduationCap
} from 'lucide-react';
import { UserType } from '../App';
import { Separator } from './ui/separator';

interface JobDetailsPageProps {
  jobId: string | null;
  onNavigate: (screen: 'landing' | 'jobseeker-dashboard' | 'recruiter-dashboard' | 'job-details' | 'auth' | 'profile-settings') => void;
  onViewJob: (jobId: string) => void;
  userType: UserType;
}

const jobDetails = {
  id: '1',
  title: 'Senior Frontend Developer',
  company: 'TechCorp Solutions',
  location: 'Bangalore, Karnataka',
  experience: '4-7 years',
  salary: '₹15-25 LPA',
  type: 'Full-time',
  postedDays: 2,
  applicants: 48,
  logo: '💼',
  description: `We are looking for a talented Senior Frontend Developer to join our growing team. You will be responsible for building and maintaining our web applications using modern technologies.`,
  responsibilities: [
    'Develop and maintain web applications using React, TypeScript, and Next.js',
    'Collaborate with designers and backend developers to create seamless user experiences',
    'Write clean, maintainable, and well-documented code',
    'Participate in code reviews and mentor junior developers',
    'Optimize applications for maximum speed and scalability',
    'Stay up-to-date with emerging technologies and industry trends'
  ],
  requirements: [
    '4+ years of experience in frontend development',
    'Strong proficiency in React, TypeScript, and modern JavaScript',
    'Experience with Next.js, Redux, and state management',
    'Solid understanding of HTML5, CSS3, and responsive design',
    'Experience with RESTful APIs and GraphQL',
    'Excellent problem-solving and communication skills',
    'Bachelor\'s degree in Computer Science or related field'
  ],
  skills: ['React', 'TypeScript', 'Next.js', 'Redux', 'JavaScript', 'CSS3', 'HTML5', 'Git'],
  benefits: [
    'Competitive salary and performance bonuses',
    'Health insurance for you and your family',
    'Flexible working hours and remote work options',
    'Learning and development opportunities',
    'Modern office with latest equipment',
    'Fun team activities and company events'
  ],
  companyInfo: {
    name: 'TechCorp Solutions',
    size: '500-1000 employees',
    industry: 'Information Technology',
    founded: '2015',
    website: 'www.techcorp.com',
    about: 'TechCorp Solutions is a leading technology company specializing in innovative web and mobile solutions. We work with clients across various industries to deliver cutting-edge products.'
  }
};

const similarJobs = [
  {
    id: '2',
    title: 'React Developer',
    company: 'WebTech Solutions',
    location: 'Bangalore, Karnataka',
    salary: '₹12-18 LPA',
    logo: '⚛️'
  },
  {
    id: '3',
    title: 'Frontend Architect',
    company: 'Enterprise Systems',
    location: 'Hyderabad, Telangana',
    salary: '₹20-30 LPA',
    logo: '🏗️'
  },
  {
    id: '4',
    title: 'Full Stack Developer',
    company: 'StartupHub',
    location: 'Remote',
    salary: '₹15-22 LPA',
    logo: '💻'
  }
];

export function JobDetailsPage({ jobId, onNavigate, onViewJob, userType }: JobDetailsPageProps) {
  const handleBack = () => {
    if (userType === 'jobseeker') {
      onNavigate('jobseeker-dashboard');
    } else {
      onNavigate('landing');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userType={userType} onNavigate={onNavigate} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-4 rounded-full"
          onClick={handleBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <Card>
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                    {jobDetails.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl text-gray-900 mb-2">
                      {jobDetails.title}
                    </h1>
                    <p className="text-xl text-gray-700 mb-3">{jobDetails.company}</p>
                    <div className="flex flex-wrap gap-4 text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {jobDetails.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {jobDetails.experience}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {jobDetails.salary}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge className="rounded-full bg-blue-100 text-blue-800">{jobDetails.type}</Badge>
                  <Badge className="rounded-full bg-gray-100 text-gray-800">
                    Posted {jobDetails.postedDays} days ago
                  </Badge>
                  <Badge className="rounded-full bg-green-100 text-green-800">
                    {jobDetails.applicants} applicants
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!userType && (
                    <Button 
                      size="lg"
                      className="flex-1 sm:flex-none rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                      onClick={() => onNavigate('auth')}
                    >
                      Apply Now
                    </Button>
                  )}
                  {userType === 'jobseeker' && (
                    <Button 
                      size="lg"
                      className="flex-1 sm:flex-none rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                    >
                      Apply Now
                    </Button>
                  )}
                  <Button variant="outline" size="lg" className="rounded-full">
                    <Bookmark className="w-5 h-5 mr-2" />
                    Save Job
                  </Button>
                  <Button variant="outline" size="lg" className="rounded-full">
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Job Description */}
            <Card>
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-xl text-gray-900 mb-4">Job Description</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {jobDetails.description}
                </p>

                <Separator className="my-6" />

                <h3 className="text-lg text-gray-900 mb-3">Key Responsibilities</h3>
                <ul className="space-y-2 mb-6">
                  {jobDetails.responsibilities.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Separator className="my-6" />

                <h3 className="text-lg text-gray-900 mb-3">Requirements</h3>
                <ul className="space-y-2 mb-6">
                  {jobDetails.requirements.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Separator className="my-6" />

                <h3 className="text-lg text-gray-900 mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {jobDetails.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="rounded-full">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <Separator className="my-6" />

                <h3 className="text-lg text-gray-900 mb-3">Benefits & Perks</h3>
                <ul className="space-y-2">
                  {jobDetails.benefits.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card>
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-xl text-gray-900 mb-4">About {jobDetails.companyInfo.name}</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {jobDetails.companyInfo.about}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-600">Company Size</div>
                      <div className="text-gray-900">{jobDetails.companyInfo.size}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-600">Industry</div>
                      <div className="text-gray-900">{jobDetails.companyInfo.industry}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-600">Founded</div>
                      <div className="text-gray-900">{jobDetails.companyInfo.founded}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-600">Website</div>
                      <a href="#" className="text-blue-600 hover:underline">
                        {jobDetails.companyInfo.website}
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Apply Card - Only for logged in job seekers */}
            {userType === 'jobseeker' && (
              <Card className="sticky top-20">
                <CardContent className="p-6">
                  <h3 className="text-lg text-gray-900 mb-4">Quick Apply</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Your profile matches this job. Apply now to increase your chances!
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Profile is complete
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Resume uploaded
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      95% match score
                    </div>
                  </div>
                  <Button 
                    className="w-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                  >
                    Apply with Profile
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Job Insights */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg text-gray-900 mb-4">Job Insights</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Applicants</span>
                      <span className="text-gray-900">{jobDetails.applicants}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-teal-500" style={{ width: '48%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Competition</span>
                      <span className="text-yellow-600">Medium</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Response Rate</span>
                      <span className="text-green-600">High</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Similar Jobs */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg text-gray-900 mb-4">Similar Jobs</h3>
                <div className="space-y-4">
                  {similarJobs.map((job) => (
                    <div 
                      key={job.id}
                      className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => onViewJob(job.id)}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                        {job.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm text-gray-900 mb-1 truncate">{job.title}</h4>
                        <p className="text-xs text-gray-600 mb-1">{job.company}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{job.location}</span>
                          <span>•</span>
                          <span>{job.salary}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
