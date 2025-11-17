import { useState } from 'react';
import { Header } from './Header';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, 
  Award, Upload, X, Plus, Save, ArrowLeft, Building2, 
  Link as LinkIcon, Calendar, DollarSign
} from 'lucide-react';
import { UserType } from '../App';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

interface ProfileSettingsProps {
  userType: UserType;
  onNavigate: (screen: 'landing' | 'jobseeker-dashboard' | 'recruiter-dashboard' | 'job-details' | 'auth' | 'profile-settings') => void;
}

export function ProfileSettings({ userType, onNavigate }: ProfileSettingsProps) {
  const [skills, setSkills] = useState(['React', 'TypeScript', 'Next.js', 'Node.js']);
  const [newSkill, setNewSkill] = useState('');

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleBack = () => {
    if (userType === 'jobseeker') {
      onNavigate('jobseeker-dashboard');
    } else if (userType === 'recruiter') {
      onNavigate('recruiter-dashboard');
    } else {
      onNavigate('landing');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userType={userType} onNavigate={onNavigate} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="mb-4 rounded-full"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl text-gray-900 mb-1">Profile Settings</h1>
          <p className="text-gray-600">Manage your profile information and preferences</p>
        </div>

        {userType === 'jobseeker' ? (
          /* Job Seeker Settings */
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details and profile photo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Photo */}
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-teal-400 rounded-full flex items-center justify-center">
                      <User className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <Button variant="outline" className="rounded-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </Button>
                      <p className="text-sm text-gray-600 mt-2">JPG, PNG or GIF. Max size 2MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" defaultValue="Rahul" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" defaultValue="Kumar" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input id="email" type="email" defaultValue="rahul.kumar@email.com" className="pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input id="phone" type="tel" defaultValue="+91 98765 43210" className="pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input id="location" defaultValue="Bangalore, Karnataka" className="pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="headline">Professional Headline</Label>
                    <Input id="headline" defaultValue="Senior Frontend Developer" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">About Me</Label>
                    <Textarea 
                      id="bio" 
                      rows={4}
                      defaultValue="Passionate frontend developer with 4+ years of experience building modern web applications using React, TypeScript, and Next.js."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Skills</Label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="rounded-full pl-3 pr-1 py-1">
                          {skill}
                          <button
                            onClick={() => handleRemoveSkill(skill)}
                            className="ml-2 p-1 hover:bg-gray-300 rounded-full transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Add a skill"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                      />
                      <Button onClick={handleAddSkill} className="rounded-full">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Experience Tab */}
            <TabsContent value="experience" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Work Experience</CardTitle>
                  <CardDescription>Add your work experience and achievements</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Experience Entry */}
                  <div className="border-l-2 border-blue-200 pl-6 pb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg text-gray-900">Senior Frontend Developer</h3>
                        <p className="text-gray-600">TechStartup Inc</p>
                        <p className="text-sm text-gray-500">Jan 2022 - Present • 2 years</p>
                        <p className="text-sm text-gray-500">Bangalore, Karnataka</p>
                      </div>
                      <Button variant="ghost" size="sm" className="rounded-full">
                        Edit
                      </Button>
                    </div>
                    <p className="text-gray-700">
                      Leading frontend development for a SaaS platform. Built scalable React applications and mentored junior developers.
                    </p>
                  </div>

                  <div className="border-l-2 border-gray-200 pl-6 pb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg text-gray-900">Frontend Developer</h3>
                        <p className="text-gray-600">WebSolutions Ltd</p>
                        <p className="text-sm text-gray-500">Jun 2020 - Dec 2021 • 1.5 years</p>
                        <p className="text-sm text-gray-500">Mumbai, Maharashtra</p>
                      </div>
                      <Button variant="ghost" size="sm" className="rounded-full">
                        Edit
                      </Button>
                    </div>
                    <p className="text-gray-700">
                      Developed responsive web applications using React and collaborated with design teams.
                    </p>
                  </div>

                  <Button variant="outline" className="rounded-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Experience
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Education</CardTitle>
                  <CardDescription>Add your educational qualifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Education Entry */}
                  <div className="border-l-2 border-blue-200 pl-6 pb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg text-gray-900">Bachelor of Technology in Computer Science</h3>
                        <p className="text-gray-600">ABC University</p>
                        <p className="text-sm text-gray-500">2016 - 2020</p>
                        <p className="text-sm text-gray-500">Grade: 8.5 CGPA</p>
                      </div>
                      <Button variant="ghost" size="sm" className="rounded-full">
                        Edit
                      </Button>
                    </div>
                  </div>

                  <Button variant="outline" className="rounded-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Education
                  </Button>

                  <div className="border-t pt-6">
                    <h3 className="text-lg text-gray-900 mb-4">Certifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Award className="w-5 h-5 text-blue-600" />
                          <div>
                            <h4 className="text-gray-900">React Advanced Certification</h4>
                            <p className="text-sm text-gray-600">Meta • 2023</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-full mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Certification
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Job Preferences</CardTitle>
                  <CardDescription>Set your job search preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="jobType">Preferred Job Type</Label>
                    <Select defaultValue="full-time">
                      <SelectTrigger id="jobType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minSalary">Expected Min Salary (LPA)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input id="minSalary" type="number" defaultValue="15" className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxSalary">Expected Max Salary (LPA)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input id="maxSalary" type="number" defaultValue="20" className="pl-10" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredLocations">Preferred Locations</Label>
                    <Input id="preferredLocations" defaultValue="Bangalore, Mumbai, Remote" />
                  </div>

                  <div className="space-y-4">
                    <Label>Notification Preferences</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900">Email Notifications</p>
                          <p className="text-sm text-gray-600">Receive job alerts via email</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900">Profile Visibility</p>
                          <p className="text-sm text-gray-600">Allow recruiters to view your profile</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900">Job Recommendations</p>
                          <p className="text-sm text-gray-600">Get personalized job suggestions</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          /* Recruiter Settings */
          <Tabs defaultValue="company" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="company">Company Info</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            {/* Company Info Tab */}
            <TabsContent value="company" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>Manage your company details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-blue-600" />
                    </div>
                    <div>
                      <Button variant="outline" className="rounded-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Logo
                      </Button>
                      <p className="text-sm text-gray-600 mt-2">PNG or JPG. Recommended size 400x400px</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" defaultValue="TechCorp Solutions" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select defaultValue="it">
                        <SelectTrigger id="industry">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="it">Information Technology</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companySize">Company Size</Label>
                      <Select defaultValue="500-1000">
                        <SelectTrigger id="companySize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-50">1-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="500-1000">500-1000 employees</SelectItem>
                          <SelectItem value="1000+">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input id="website" defaultValue="www.techcorp.com" className="pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyLocation">Headquarters Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input id="companyLocation" defaultValue="Bangalore, Karnataka" className="pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea 
                      id="description" 
                      rows={4}
                      defaultValue="TechCorp Solutions is a leading technology company specializing in innovative web and mobile solutions."
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="recruiterEmail">Email</Label>
                    <Input id="recruiterEmail" type="email" defaultValue="hr@techcorp.com" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recruiterPhone">Phone</Label>
                    <Input id="recruiterPhone" type="tel" defaultValue="+91 99999 88888" />
                  </div>

                  <div className="space-y-4">
                    <Label>Notification Settings</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900">New Applications</p>
                          <p className="text-sm text-gray-600">Get notified when candidates apply</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900">Weekly Reports</p>
                          <p className="text-sm text-gray-600">Receive weekly hiring analytics</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billing & Plans</CardTitle>
                  <CardDescription>Manage your subscription and billing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg text-gray-900">Professional Plan</h3>
                        <p className="text-gray-600">Active until Dec 31, 2025</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="text-3xl text-gray-900 mb-2">₹49,999/year</div>
                    <p className="text-gray-600 mb-4">Unlimited job postings and advanced features</p>
                    <Button variant="outline" className="rounded-full">
                      Upgrade Plan
                    </Button>
                  </div>

                  <div>
                    <h3 className="text-lg text-gray-900 mb-4">Billing History</h3>
                    <div className="space-y-2">
                      {[
                        { date: 'Jan 1, 2025', amount: '₹49,999', status: 'Paid' },
                        { date: 'Jan 1, 2024', amount: '₹49,999', status: 'Paid' }
                      ].map((invoice, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="text-gray-900">{invoice.date}</p>
                            <p className="text-sm text-gray-600">{invoice.amount}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {invoice.status}
                            </Badge>
                            <Button variant="ghost" size="sm">Download</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
