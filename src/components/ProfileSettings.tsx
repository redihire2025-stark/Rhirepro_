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
  Link as LinkIcon, Calendar, DollarSign, Edit, FileText
} from 'lucide-react';
import { UserType } from '../App';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface ProfileSettingsProps {
  userType: UserType;
  onNavigate: (screen: 'landing' | 'jobseeker-dashboard' | 'recruiter-dashboard' | 'job-details' | 'auth' | 'profile-settings') => void;
}

interface Experience {
  id: string;
  designation: string;
  company: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  current: boolean;
}

interface Education {
  id: string;
  degree: string;
  college: string;
  startYear: string;
  endYear: string;
}

interface Certification {
  id: string;
  name: string;
  year: string;
}

export function ProfileSettings({ userType, onNavigate }: ProfileSettingsProps) {
  const [skills, setSkills] = useState(['React', 'TypeScript', 'Next.js', 'Node.js']);
  const [newSkill, setNewSkill] = useState('');

  // Experience state
  const [experiences, setExperiences] = useState<Experience[]>([
    {
      id: '1',
      designation: 'Senior Frontend Developer',
      company: 'TechStartup Inc',
      startDate: '2022-01',
      endDate: '',
      location: 'Bangalore, Karnataka',
      description: 'Leading frontend development for a SaaS platform. Built scalable React applications and mentored junior developers.',
      current: true
    },
    {
      id: '2',
      designation: 'Frontend Developer',
      company: 'WebSolutions Ltd',
      startDate: '2020-06',
      endDate: '2021-12',
      location: 'Mumbai, Maharashtra',
      description: 'Developed responsive web applications using React and collaborated with design teams.',
      current: false
    }
  ]);
  const [isAddExpOpen, setIsAddExpOpen] = useState(false);
  const [isEditExpOpen, setIsEditExpOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [expForm, setExpForm] = useState<Partial<Experience>>({});

  // Education state
  const [educations, setEducations] = useState<Education[]>([
    {
      id: '1',
      degree: 'Bachelor of Technology in Computer Science',
      college: 'ABC University',
      startYear: '2016',
      endYear: '2020'
    }
  ]);
  const [isAddEduOpen, setIsAddEduOpen] = useState(false);
  const [isEditEduOpen, setIsEditEduOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [eduForm, setEduForm] = useState<Partial<Education>>({});

  // Certification state
  const [certifications, setCertifications] = useState<Certification[]>([
    {
      id: '1',
      name: 'React Advanced Certification',
      year: '2023'
    }
  ]);
  const [isAddCertOpen, setIsAddCertOpen] = useState(false);
  const [isEditCertOpen, setIsEditCertOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [certForm, setCertForm] = useState<Partial<Certification>>({});

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

  // Experience handlers
  const handleAddExperience = () => {
    if (expForm.designation && expForm.company && expForm.startDate) {
      const newExp: Experience = {
        id: Date.now().toString(),
        designation: expForm.designation,
        company: expForm.company,
        startDate: expForm.startDate,
        endDate: expForm.endDate || '',
        location: expForm.location || '',
        description: expForm.description || '',
        current: expForm.current || false
      };
      setExperiences([...experiences, newExp]);
      setExpForm({});
      setIsAddExpOpen(false);
    }
  };

  const handleEditExperience = () => {
    if (editingExp && expForm.designation && expForm.company && expForm.startDate) {
      setExperiences(experiences.map(exp =>
        exp.id === editingExp.id
          ? { ...exp, ...expForm } as Experience
          : exp
      ));
      setExpForm({});
      setEditingExp(null);
      setIsEditExpOpen(false);
    }
  };

  const openEditExp = (exp: Experience) => {
    setEditingExp(exp);
    setExpForm(exp);
    setIsEditExpOpen(true);
  };

  // Education handlers
  const handleAddEducation = () => {
    if (eduForm.degree && eduForm.college && eduForm.startYear && eduForm.endYear) {
      const newEdu: Education = {
        id: Date.now().toString(),
        degree: eduForm.degree,
        college: eduForm.college,
        startYear: eduForm.startYear,
        endYear: eduForm.endYear
      };
      setEducations([...educations, newEdu]);
      setEduForm({});
      setIsAddEduOpen(false);
    }
  };

  const handleEditEducation = () => {
    if (editingEdu && eduForm.degree && eduForm.college && eduForm.startYear && eduForm.endYear) {
      setEducations(educations.map(edu =>
        edu.id === editingEdu.id
          ? { ...edu, ...eduForm } as Education
          : edu
      ));
      setEduForm({});
      setEditingEdu(null);
      setIsEditEduOpen(false);
    }
  };

  const openEditEdu = (edu: Education) => {
    setEditingEdu(edu);
    setEduForm(edu);
    setIsEditEduOpen(true);
  };

  // Certification handlers
  const handleAddCertification = () => {
    if (certForm.name && certForm.year) {
      const newCert: Certification = {
        id: Date.now().toString(),
        name: certForm.name,
        year: certForm.year
      };
      setCertifications([...certifications, newCert]);
      setCertForm({});
      setIsAddCertOpen(false);
    }
  };

  const handleEditCertification = () => {
    if (editingCert && certForm.name && certForm.year) {
      setCertifications(certifications.map(cert =>
        cert.id === editingCert.id
          ? { ...cert, ...certForm } as Certification
          : cert
      ));
      setCertForm({});
      setEditingCert(null);
      setIsEditCertOpen(false);
    }
  };

  const openEditCert = (cert: Certification) => {
    setEditingCert(cert);
    setCertForm(cert);
    setIsEditCertOpen(true);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Present';
    const [year, month] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${year}`;
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
                  {/* Experience Entries */}
                  {experiences.map((exp) => (
                    <div key={exp.id} className="border-l-2 border-blue-200 pl-6 pb-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg text-gray-900">{exp.designation}</h3>
                          <p className="text-gray-600">{exp.company}</p>
                          <p className="text-sm text-gray-500">
                            {formatDateDisplay(exp.startDate)} - {exp.current ? 'Present' : formatDateDisplay(exp.endDate)}
                          </p>
                          <p className="text-sm text-gray-500">{exp.location}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full"
                          onClick={() => openEditExp(exp)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <p className="text-gray-700">{exp.description}</p>
                    </div>
                  ))}

                  {/* Add Experience Dialog */}
                  <Dialog open={isAddExpOpen} onOpenChange={setIsAddExpOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="rounded-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Experience
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Work Experience</DialogTitle>
                        <DialogDescription>Fill in your work experience details</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="add-designation">Designation *</Label>
                          <Input
                            id="add-designation"
                            placeholder="e.g. Senior Frontend Developer"
                            value={expForm.designation || ''}
                            onChange={(e) => setExpForm({ ...expForm, designation: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="add-company">Company Name *</Label>
                          <Input
                            id="add-company"
                            placeholder="e.g. TechCorp Inc"
                            value={expForm.company || ''}
                            onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="add-start-date">Start Date *</Label>
                            <Input
                              id="add-start-date"
                              type="month"
                              value={expForm.startDate || ''}
                              onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="add-end-date">End Date</Label>
                            <Input
                              id="add-end-date"
                              type="month"
                              value={expForm.endDate || ''}
                              onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                              disabled={expForm.current}
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="add-current"
                            checked={expForm.current || false}
                            onChange={(e) => setExpForm({ ...expForm, current: e.target.checked, endDate: e.target.checked ? '' : expForm.endDate })}
                            className="rounded"
                          />
                          <Label htmlFor="add-current" className="cursor-pointer">I currently work here</Label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="add-location">Location</Label>
                          <Input
                            id="add-location"
                            placeholder="e.g. Bangalore, Karnataka"
                            value={expForm.location || ''}
                            onChange={(e) => setExpForm({ ...expForm, location: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="add-description">Description</Label>
                          <Textarea
                            id="add-description"
                            rows={4}
                            placeholder="Describe your responsibilities and achievements..."
                            value={expForm.description || ''}
                            onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                          />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" onClick={() => { setIsAddExpOpen(false); setExpForm({}); }}>
                            Cancel
                          </Button>
                          <Button
                            className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                            onClick={handleAddExperience}
                          >
                            Add Experience
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Experience Dialog */}
                  <Dialog open={isEditExpOpen} onOpenChange={setIsEditExpOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Work Experience</DialogTitle>
                        <DialogDescription>Update your work experience details</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-designation">Designation *</Label>
                          <Input
                            id="edit-designation"
                            placeholder="e.g. Senior Frontend Developer"
                            value={expForm.designation || ''}
                            onChange={(e) => setExpForm({ ...expForm, designation: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-company">Company Name *</Label>
                          <Input
                            id="edit-company"
                            placeholder="e.g. TechCorp Inc"
                            value={expForm.company || ''}
                            onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-start-date">Start Date *</Label>
                            <Input
                              id="edit-start-date"
                              type="month"
                              value={expForm.startDate || ''}
                              onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-end-date">End Date</Label>
                            <Input
                              id="edit-end-date"
                              type="month"
                              value={expForm.endDate || ''}
                              onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                              disabled={expForm.current}
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="edit-current"
                            checked={expForm.current || false}
                            onChange={(e) => setExpForm({ ...expForm, current: e.target.checked, endDate: e.target.checked ? '' : expForm.endDate })}
                            className="rounded"
                          />
                          <Label htmlFor="edit-current" className="cursor-pointer">I currently work here</Label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-location">Location</Label>
                          <Input
                            id="edit-location"
                            placeholder="e.g. Bangalore, Karnataka"
                            value={expForm.location || ''}
                            onChange={(e) => setExpForm({ ...expForm, location: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-description">Description</Label>
                          <Textarea
                            id="edit-description"
                            rows={4}
                            placeholder="Describe your responsibilities and achievements..."
                            value={expForm.description || ''}
                            onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                          />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" onClick={() => { setIsEditExpOpen(false); setExpForm({}); setEditingExp(null); }}>
                            Cancel
                          </Button>
                          <Button
                            className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                            onClick={handleEditExperience}
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
                  {/* Education Entries */}
                  {educations.map((edu) => (
                    <div key={edu.id} className="border-l-2 border-blue-200 pl-6 pb-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg text-gray-900">{edu.degree}</h3>
                          <p className="text-gray-600">{edu.college}</p>
                          <p className="text-sm text-gray-500">{edu.startYear} - {edu.endYear}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full"
                          onClick={() => openEditEdu(edu)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add Education Dialog */}
                  <Dialog open={isAddEduOpen} onOpenChange={setIsAddEduOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="rounded-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Education
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Education</DialogTitle>
                        <DialogDescription>Fill in your education details</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="add-degree">Degree *</Label>
                          <Input
                            id="add-degree"
                            placeholder="e.g. Bachelor of Technology in Computer Science"
                            value={eduForm.degree || ''}
                            onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="add-college">College Name *</Label>
                          <Input
                            id="add-college"
                            placeholder="e.g. ABC University"
                            value={eduForm.college || ''}
                            onChange={(e) => setEduForm({ ...eduForm, college: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="add-start-year">Start Year *</Label>
                            <Input
                              id="add-start-year"
                              type="number"
                              placeholder="e.g. 2016"
                              value={eduForm.startYear || ''}
                              onChange={(e) => setEduForm({ ...eduForm, startYear: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="add-end-year">End Year *</Label>
                            <Input
                              id="add-end-year"
                              type="number"
                              placeholder="e.g. 2020"
                              value={eduForm.endYear || ''}
                              onChange={(e) => setEduForm({ ...eduForm, endYear: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" onClick={() => { setIsAddEduOpen(false); setEduForm({}); }}>
                            Cancel
                          </Button>
                          <Button
                            className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                            onClick={handleAddEducation}
                          >
                            Add Education
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Education Dialog */}
                  <Dialog open={isEditEduOpen} onOpenChange={setIsEditEduOpen}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Edit Education</DialogTitle>
                        <DialogDescription>Update your education details</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-degree">Degree *</Label>
                          <Input
                            id="edit-degree"
                            placeholder="e.g. Bachelor of Technology in Computer Science"
                            value={eduForm.degree || ''}
                            onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-college">College Name *</Label>
                          <Input
                            id="edit-college"
                            placeholder="e.g. ABC University"
                            value={eduForm.college || ''}
                            onChange={(e) => setEduForm({ ...eduForm, college: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-start-year">Start Year *</Label>
                            <Input
                              id="edit-start-year"
                              type="number"
                              placeholder="e.g. 2016"
                              value={eduForm.startYear || ''}
                              onChange={(e) => setEduForm({ ...eduForm, startYear: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-end-year">End Year *</Label>
                            <Input
                              id="edit-end-year"
                              type="number"
                              placeholder="e.g. 2020"
                              value={eduForm.endYear || ''}
                              onChange={(e) => setEduForm({ ...eduForm, endYear: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" onClick={() => { setIsEditEduOpen(false); setEduForm({}); setEditingEdu(null); }}>
                            Cancel
                          </Button>
                          <Button
                            className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                            onClick={handleEditEducation}
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Certifications Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg text-gray-900 mb-4">Certifications</h3>
                    <div className="space-y-3 mb-4">
                      {certifications.map((cert) => (
                        <div key={cert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Award className="w-5 h-5 text-blue-600" />
                            <div>
                              <h4 className="text-gray-900">{cert.name}</h4>
                              <p className="text-sm text-gray-600">Year: {cert.year}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditCert(cert)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Add Certification Dialog */}
                    <Dialog open={isAddCertOpen} onOpenChange={setIsAddCertOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="rounded-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Certification
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Certification</DialogTitle>
                          <DialogDescription>Fill in your certification details</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="add-cert-name">Certification Name *</Label>
                            <Input
                              id="add-cert-name"
                              placeholder="e.g. AWS Certified Solutions Architect"
                              value={certForm.name || ''}
                              onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="add-cert-year">Year Achieved *</Label>
                            <Input
                              id="add-cert-year"
                              type="number"
                              placeholder="e.g. 2023"
                              value={certForm.year || ''}
                              onChange={(e) => setCertForm({ ...certForm, year: e.target.value })}
                            />
                          </div>
                          <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => { setIsAddCertOpen(false); setCertForm({}); }}>
                              Cancel
                            </Button>
                            <Button
                              className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                              onClick={handleAddCertification}
                            >
                              Add Certification
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Edit Certification Dialog */}
                    <Dialog open={isEditCertOpen} onOpenChange={setIsEditCertOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Certification</DialogTitle>
                          <DialogDescription>Update your certification details</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-cert-name">Certification Name *</Label>
                            <Input
                              id="edit-cert-name"
                              placeholder="e.g. AWS Certified Solutions Architect"
                              value={certForm.name || ''}
                              onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-cert-year">Year Achieved *</Label>
                            <Input
                              id="edit-cert-year"
                              type="number"
                              placeholder="e.g. 2023"
                              value={certForm.year || ''}
                              onChange={(e) => setCertForm({ ...certForm, year: e.target.value })}
                            />
                          </div>
                          <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => { setIsEditCertOpen(false); setCertForm({}); setEditingCert(null); }}>
                              Cancel
                            </Button>
                            <Button
                              className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                              onClick={handleEditCertification}
                            >
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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
                      <Label htmlFor="currentSalary">Current Salary (INR)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input id="currentSalary" type="number" placeholder="e.g. 1200000" className="pl-10" />
                      </div>
                      <p className="text-xs text-gray-500">Enter annual salary in rupees</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedSalary">Expected Salary (INR)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input id="expectedSalary" type="number" placeholder="e.g. 1500000" className="pl-10" />
                      </div>
                      <p className="text-xs text-gray-500">Enter annual salary in rupees</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredLocations">Preferred Locations</Label>
                    <Input id="preferredLocations" defaultValue="Bangalore, Mumbai, Remote" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resume">Resume</Label>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" className="rounded-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Resume
                      </Button>
                      <span className="text-sm text-gray-600">PDF, DOC, or DOCX. Max size 5MB</span>
                    </div>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-900">Rahul_Kumar_Resume.pdf</p>
                          <p className="text-xs text-gray-500">Uploaded on Jan 15, 2025</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
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
