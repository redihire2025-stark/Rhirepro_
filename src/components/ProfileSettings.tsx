import { useState, useEffect, useRef } from 'react';
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
  // list of Indian states and union territories (states-only for dropdowns)
  const LOCATIONS = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh',
    'Puducherry', 'Andaman and Nicobar Islands', 'Lakshadweep'
  ];
  // Comprehensive skills options for multi-select
  const SKILLS_OPTIONS = [
    'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Next.js', 'Gatsby',
    'Node.js', 'Express', 'NestJS', 'Deno', 'HTML', 'CSS', 'Sass', 'Less', 'Tailwind CSS', 'Bootstrap',
    'Redux', 'MobX', 'Recoil', 'RxJS', 'GraphQL', 'Apollo', 'REST', 'OpenAPI',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Cassandra', 'SQLite', 'Elasticsearch',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Serverless',
    'Python', 'Django', 'Flask', 'FastAPI', 'Pandas', 'NumPy', 'PyTorch', 'TensorFlow',
    'Java', 'Spring Boot', 'Kotlin', 'Scala', 'C#', '.NET', 'Golang', 'Rust', 'C++', 'C',
    'PHP', 'Laravel', 'Symfony', 'Ruby', 'Ruby on Rails', 'Perl',
    'Blockchain', 'Solidity', 'Web3', 'Apache Kafka', 'RabbitMQ', 'Celery',
    'Hadoop', 'Spark', 'Hive', 'Airflow', 'CI/CD', 'Jenkins', 'GitHub Actions', 'GitLab CI',
    'Jest', 'Mocha', 'Chai', 'Cypress', 'Playwright', 'Selenium',
    'JIRA', 'Confluence', 'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator',
    'SQL', 'NoSQL', 'Data Engineering', 'Data Science', 'Machine Learning', 'MLOps',
    'DevOps', 'Site Reliability', 'Security', 'OAuth', 'OpenID', 'SAML',
    'GraphQL', 'gRPC', 'WebSockets', 'RESTful APIs', 'Microservices', 'Monolith',
    'React Native', 'Flutter', 'Android', 'iOS', 'Swift', 'Objective-C',
    'Unity', 'Unreal', 'Game Development', 'Embedded Systems', 'IoT',
    'Unit Testing', 'Integration Testing', 'Performance Testing', 'Accessibility',
    'SEO', 'Analytics', 'Google Analytics', 'Power BI', 'Tableau'
  ];

  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [skills, setSkills] = useState(['React', 'TypeScript', 'Next.js', 'Node.js']);
  const [preferredFilter, setPreferredFilter] = useState('');
  const [showPreferredDropdown, setShowPreferredDropdown] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [profile, setProfile] = useState<any>({});
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

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
        setProfile(data || {});

        // populate local lists if available and normalize ids
        if (data?.experiences) setExperiences((data.experiences || []).map((e: any) => ({ ...(e || {}), id: e._id || e.id || (Date.now().toString() + Math.random()) })));
        if (data?.education) setEducations((data.education || []).map((ed: any) => ({ ...(ed || {}), id: ed._id || ed.id || (Date.now().toString() + Math.random()) })));
        if (data?.certifications) setCertifications((data.certifications || []).map((c: any) => ({ id: c._id || c.id || (Date.now().toString() + Math.random()), name: c.name || c.title || '', year: c.year })));
        if (data?.project) setProfile((p: any) => ({ ...p, project: data.project }));
        if (data?.primarySkills || data?.secondarySkills) {
          const primary = Array.isArray(data.primarySkills) ? data.primarySkills : String(data.primarySkills || '').split(/,\s*/).filter(Boolean);
          const secondary = Array.isArray(data.secondarySkills) ? data.secondarySkills : String(data.secondarySkills || '').split(/,\s*/).filter(Boolean);
          setSkills([...new Set([...primary, ...secondary])]);
        }
        // preferred locations may be stored as comma separated string — normalize to array
        if (data?.preferredLocation) {
          const arr = Array.isArray(data.preferredLocation)
            ? data.preferredLocation
            : String(data.preferredLocation || '').split(/,\s*/).filter(Boolean);
          setPreferredLocations(arr.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    };

    fetchProfile();
  }, []);

  const handlePhotoChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('photo', file);

    try {
      const res = await fetch('http://localhost:5000/api/auth/upload-photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        localStorage.setItem('user', JSON.stringify(data));
        alert('Photo uploaded');
      } else {
        alert('Photo upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Photo upload error');
    }
  };

  const handleResumeChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('resume', file);

    try {
      const res = await fetch('http://localhost:5000/api/auth/upload-resume', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        localStorage.setItem('user', JSON.stringify(data));
        alert('Resume uploaded');
      } else {
        alert('Resume upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Resume upload error');
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return alert('Not authenticated');

      // sync local arrays back to profile
      const payload = { ...profile };
      payload.experiences = experiences;
      payload.education = educations;
      // send certifications as { name, year }
      payload.certifications = certifications.map((c) => ({ name: c.name, year: c.year }));
      payload.primarySkills = skills;
      payload.secondarySkills = [];
      // preferredLocations: save as comma separated string for backend compatibility
      if (preferredLocations && preferredLocations.length) payload.preferredLocation = preferredLocations.join(', ');
      // include project (for freshers) - store structured object
      payload.project = profile.project
        ? {
          name: profile.project.name || '',
          duration: profile.project.duration || '',
          domains: Array.isArray(profile.project.domains)
            ? profile.project.domains
            : (typeof profile.project.domains === 'string' && profile.project.domains.length)
              ? profile.project.domains.split(',').map((s: string) => s.trim()).filter(Boolean)
              : [],
        }
        : null;

      await fetch('http://localhost:5000/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save profile');
    }
  };

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
    // save experience to server then reload
    (async () => {
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
        const newList = [...experiences, newExp];
        setExperiences(newList);
        setExpForm({});
        setIsAddExpOpen(false);

        try {
          const token = localStorage.getItem('token');
          const payload = newList.map(({ id, ...rest }) => rest);
          await fetch('http://localhost:5000/api/auth/update-experience', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ experiences: payload }),
          });
        } catch (err) {
          console.error('Failed to save experiences', err);
        }

        // refresh profile from server
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setProfile(data || {});
            if (data?.experiences) setExperiences(data.experiences);
          }
        } catch (err) {
          console.error('Failed to reload profile', err);
        }
      }
    })();
  };

  const handleEditExperience = () => {
    (async () => {
      if (editingExp && expForm.designation && expForm.company && expForm.startDate) {
        const updated = experiences.map(exp =>
          exp.id === editingExp.id
            ? { ...exp, ...expForm } as Experience
            : exp
        );
        setExperiences(updated);
        setExpForm({});
        setEditingExp(null);
        setIsEditExpOpen(false);

        try {
          const token = localStorage.getItem('token');
          await fetch('http://localhost:5000/api/auth/update-experience', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ experiences: updated.map(({ id, ...rest }) => rest) }),
          });
        } catch (err) {
          console.error('Failed to update experiences', err);
        }

        // refresh profile
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setProfile(data || {});
            if (data?.experiences) setExperiences(data.experiences);
          }
        } catch (err) {
          console.error('Failed to reload profile', err);
        }
      }
    })();
  };

  const handleRemoveExperience = async (id: string) => {
    const newList = experiences.filter(e => e.id !== id);
    setExperiences(newList);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/auth/update-experience', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ experiences: newList.map(({ id, ...rest }) => rest) }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data || {});
      }
    } catch (err) {
      console.error('Failed to remove experience', err);
      alert('Failed to remove experience');
    }
  };

  const openEditExp = (exp: Experience) => {
    setEditingExp(exp);
    setExpForm(exp);
    setIsEditExpOpen(true);
  };

  // Education handlers
  const handleAddEducation = () => {
    (async () => {
      if (eduForm.degree && eduForm.college && eduForm.startYear && eduForm.endYear) {
        const newEdu: Education = {
          id: Date.now().toString(),
          degree: eduForm.degree,
          college: eduForm.college,
          startYear: eduForm.startYear,
          endYear: eduForm.endYear
        };
        const newList = [...educations, newEdu];
        setEducations(newList);
        setEduForm({});
        setIsAddEduOpen(false);

        try {
          const token = localStorage.getItem('token');
          await fetch('http://localhost:5000/api/auth/update-education', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ education: newList.map(({ id, ...rest }) => rest) }),
          });
        } catch (err) {
          console.error('Failed to save education', err);
        }

        // refresh profile
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setProfile(data || {});
            if (data?.education) setEducations(data.education);
          }
        } catch (err) {
          console.error('Failed to reload profile', err);
        }
      }
    })();
  };

  const handleEditEducation = () => {
    (async () => {
      if (editingEdu && eduForm.degree && eduForm.college && eduForm.startYear && eduForm.endYear) {
        const updated = educations.map(edu =>
          edu.id === editingEdu.id
            ? { ...edu, ...eduForm } as Education
            : edu
        );
        setEducations(updated);
        setEduForm({});
        setEditingEdu(null);
        setIsEditEduOpen(false);

        try {
          const token = localStorage.getItem('token');
          await fetch('http://localhost:5000/api/auth/update-education', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ education: updated.map(({ id, ...rest }) => rest) }),
          });
        } catch (err) {
          console.error('Failed to update education', err);
        }

        // refresh profile
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setProfile(data || {});
            if (data?.education) setEducations(data.education);
          }
        } catch (err) {
          console.error('Failed to reload profile', err);
        }
      }
    })();
  };

  const openEditEdu = (edu: Education) => {
    setEditingEdu(edu);
    setEduForm(edu);
    setIsEditEduOpen(true);
  };

  const handleRemoveEducation = async (id: string) => {
    const newList = educations.filter(e => e.id !== id);
    setEducations(newList);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/auth/update-education', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ education: newList.map(({ id, ...rest }) => rest) }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data || {});
      }
    } catch (err) {
      console.error('Failed to remove education', err);
      alert('Failed to remove education');
    }
  };

  // Certification handlers
  const handleAddCertification = () => {
    if (certForm.name && certForm.year) {
      const newCert: Certification = {
        id: Date.now().toString(),
        name: certForm.name,
        year: certForm.year
      };
      const newList = [...certifications, newCert];
      setCertifications(newList);
      setCertForm({});
      setIsAddCertOpen(false);

      // persist certifications immediately
      (async () => {
        try {
          const token = localStorage.getItem('token');
          await fetch('http://localhost:5000/api/auth/update-certifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ certifications: newList.map(c => ({ name: c.name, year: c.year })) }),
          });
        } catch (err) {
          console.error('Failed to persist certifications', err);
        }
      })();
    }
  };

  const handleEditCertification = () => {
    if (editingCert && certForm.name && certForm.year) {
      const updated = certifications.map(cert =>
        cert.id === editingCert.id
          ? { ...cert, ...certForm } as Certification
          : cert
      );
      setCertifications(updated);
      setCertForm({});
      setEditingCert(null);
      setIsEditCertOpen(false);

      // persist certifications immediately
      (async () => {
        try {
          const token = localStorage.getItem('token');
          await fetch('http://localhost:5000/api/auth/update-certifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ certifications: updated.map(c => ({ name: c.name, year: c.year })) }),
          });
        } catch (err) {
          console.error('Failed to persist certifications', err);
        }
      })();
    }
  };

  const openEditCert = (cert: Certification) => {
    setEditingCert(cert);
    setCertForm(cert);
    setIsEditCertOpen(true);
  };

  const handleRemoveCertification = async (id: string) => {
    const newList = certifications.filter(c => c.id !== id);
    setCertifications(newList);
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/auth/update-certifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ certifications: newList.map(c => ({ name: c.name, year: c.year })) }),
      });
      // refresh profile
      const res = await fetch('http://localhost:5000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProfile(data || {});
      }
    } catch (err) {
      console.error('Failed to remove certification', err);
      alert('Failed to remove certification');
    }
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
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="skills">Skills & Education</TabsTrigger>
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
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      {profile?.profilePhoto ? (
                        <img src={`http://localhost:5000${profile.profilePhoto}`} alt="profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                      <Button variant="outline" className="rounded-full" onClick={() => photoInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </Button>
                      <p className="text-sm text-gray-600 mt-2">JPG, PNG or GIF. Max size 2MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profile.firstName || ''}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profile.lastName || ''}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10"
                        value={profile.email || ''}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        className="pl-10"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="location"
                        className="pl-10"
                        value={profile.location || ''}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="headline">Professional Headline</Label>
                    <Input
                      id="headline"
                      value={profile.headline || ''}
                      onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">About Me</Label>
                    <Textarea
                      id="bio"
                      rows={4}
                      value={profile.about || ''}
                      onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSave} className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Professional Tab */}
            <TabsContent value="professional" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Professional</CardTitle>
                  <CardDescription>Update professional details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Experience</Label>
                      <Input
                        placeholder="Total Experience"
                        value={profile.totalExperience || ''}
                        onChange={(e) => setProfile({ ...profile, totalExperience: e.target.value })}
                        disabled={profile.employmentStatus === 'fresher'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employment Status</Label>
                      <Select value={profile.employmentStatus || ''} onValueChange={(val: string) => setProfile({ ...profile, employmentStatus: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fresher">Fresher</SelectItem>
                          <SelectItem value="experienced">Experienced</SelectItem>
                          <SelectItem value="employed">Employed</SelectItem>
                          <SelectItem value="unemployed">Unemployed</SelectItem>
                          <SelectItem value="freelancer">Freelancer</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Current Job Title</Label>
                      <Input
                        placeholder="Current Job Title"
                        value={profile.currentJobTitle || ''}
                        onChange={(e) => setProfile({ ...profile, currentJobTitle: e.target.value })}
                        disabled={profile.employmentStatus === 'fresher'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Company</Label>
                      <Input
                        placeholder="Current Company"
                        value={profile.currentCompany || ''}
                        onChange={(e) => setProfile({ ...profile, currentCompany: e.target.value })}
                        disabled={profile.employmentStatus === 'fresher'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Notice Period</Label>
                      <Input
                        placeholder="Notice Period"
                        value={profile.noticePeriod || ''}
                        onChange={(e) => setProfile({ ...profile, noticePeriod: e.target.value })}
                        disabled={profile.employmentStatus === 'fresher'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current CTC</Label>
                      <Input
                        placeholder="Current CTC"
                        value={profile.currentCTC || ''}
                        onChange={(e) => setProfile({ ...profile, currentCTC: e.target.value })}
                        disabled={profile.employmentStatus === 'fresher'}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Expected CTC</Label>
                    <Input
                      placeholder="Expected CTC"
                      value={profile.expectedCTC || ''}
                      onChange={(e) => setProfile({ ...profile, expectedCTC: e.target.value })}
                      disabled={profile.employmentStatus === 'fresher'}
                    />
                  </div>

                  {profile.employmentStatus === 'fresher' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded">
                      <h3 className="text-lg font-medium">Project (for freshers)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="projectName">Project Name</Label>
                          <Input
                            id="projectName"
                            value={profile.project?.name || ''}
                            onChange={(e) => setProfile({ ...profile, project: { ...(profile.project || {}), name: e.target.value } })}
                            placeholder="e.g. Student Portal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectDuration">Project Duration</Label>
                          <Input
                            id="projectDuration"
                            value={profile.project?.duration || ''}
                            onChange={(e) => setProfile({ ...profile, project: { ...(profile.project || {}), duration: e.target.value } })}
                            placeholder="e.g. 6 months"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="projectDomains">Domains (comma separated)</Label>
                        <Input
                          id="projectDomains"
                          value={(profile.project?.domains && Array.isArray(profile.project.domains)) ? profile.project.domains.join(',') : (profile.project?.domains || '')}
                          onChange={(e) => setProfile({ ...profile, project: { ...(profile.project || {}), domains: e.target.value } })}
                          placeholder="e.g. Education, Payments"
                        />
                        <p className="text-xs text-gray-500">Enter domains separated by commas (e.g. Finance, E-commerce)</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleSave} className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Professional
                    </Button>
                  </div>

                </CardContent>
              </Card>

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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full"
                            onClick={() => openEditExp(exp)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => handleRemoveExperience(exp.id)}>
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-700">{exp.description}</p>
                    </div>
                  ))}

                  {/* duplicate project block removed (project inputs live in Professional tab) */}

                  {/* Add Experience Dialog */}
                  <Dialog open={isAddExpOpen} onOpenChange={setIsAddExpOpen}>
                    {profile.employmentStatus !== 'fresher' && (
                      <DialogTrigger asChild>
                        <Button variant="outline" className="rounded-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Experience
                        </Button>
                      </DialogTrigger>
                    )}
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
                          <Select value={expForm.location || ''} onValueChange={(val: string) => setExpForm({ ...expForm, location: val })}>
                            <SelectTrigger id="add-location">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {LOCATIONS.map((loc) => (
                                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <Select value={expForm.location || ''} onValueChange={(val: string) => setExpForm({ ...expForm, location: val })}>
                            <SelectTrigger id="edit-location">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {LOCATIONS.map((loc) => (
                                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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

            {/* Skills & Education Tab */}
            <TabsContent value="skills" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Skills</CardTitle>
                  <CardDescription>Search and select your skills, or type to add a custom one</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Technical Skills</Label>
                    <div
                      className="relative"
                      tabIndex={0}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setShowSkillsDropdown(false);
                        }
                      }}
                    >
                      <Input
                        placeholder="Search or type a skill..."
                        value={newSkill}
                        onChange={(e) => { setNewSkill(e.target.value); setShowSkillsDropdown(true); }}
                        onFocus={() => setShowSkillsDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSkill.trim()) {
                            if (!skills.includes(newSkill.trim())) setSkills(prev => [...prev, newSkill.trim()]);
                            setNewSkill('');
                            setShowSkillsDropdown(false);
                          }
                          if (e.key === 'Escape') setShowSkillsDropdown(false);
                        }}
                        className="w-full"
                      />
                      {showSkillsDropdown && (
                        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-md bg-white border shadow-md">
                          {SKILLS_OPTIONS
                            .filter(s => s.toLowerCase().includes(newSkill.toLowerCase()) && !skills.includes(s))
                            .map((s) => (
                              <div
                                key={s}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSkills(prev => [...prev, s]);
                                  setNewSkill('');
                                  setShowSkillsDropdown(false);
                                }}
                              >
                                {s}
                              </div>
                            ))}
                          {newSkill.trim() && !SKILLS_OPTIONS.some(s => s.toLowerCase() === newSkill.trim().toLowerCase()) && (
                            <div
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-blue-600 font-medium flex items-center gap-2 border-t"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (!skills.includes(newSkill.trim())) setSkills(prev => [...prev, newSkill.trim()]);
                                setNewSkill('');
                                setShowSkillsDropdown(false);
                              }}
                            >
                              <Plus className="w-3 h-3" /> Add "{newSkill.trim()}"
                            </div>
                          )}
                          {!newSkill.trim() && SKILLS_OPTIONS.filter(s => !skills.includes(s)).length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-400">All skills selected</div>
                          )}
                        </div>
                      )}
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {skills.map((skill) => (
                          <div key={skill} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-sm rounded-full px-3 py-1 border border-blue-200">
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => setSkills(prev => prev.filter(s => s !== skill))}
                              className="ml-1 hover:text-red-500 transition-colors focus:outline-none"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                      <Save className="w-4 h-4 mr-2" />
                      Save Skills
                    </Button>
                  </div>
                </CardContent>
              </Card>

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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full"
                            onClick={() => openEditEdu(edu)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => handleRemoveEducation(edu.id)}>
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
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
                    <Select value={profile.preferredJobType || ''} onValueChange={(val: string) => setProfile({ ...profile, preferredJobType: val })}>
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
                        <Input
                          id="currentSalary"
                          type="number"
                          placeholder="e.g. 1200000"
                          className="pl-10"
                          value={profile.currentCTC || ''}
                          onChange={(e) => setProfile({ ...profile, currentCTC: e.target.value })}
                        />
                      </div>
                      <p className="text-xs text-gray-500">Enter annual salary in rupees</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedSalary">Expected Salary (INR)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="expectedSalary"
                          type="number"
                          placeholder="e.g. 1500000"
                          className="pl-10"
                          value={profile.expectedCTC || ''}
                          onChange={(e) => setProfile({ ...profile, expectedCTC: e.target.value })}
                        />
                      </div>
                      <p className="text-xs text-gray-500">Enter annual salary in rupees</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredLocations">Preferred Locations</Label>
                    {preferredLocations.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-2">
                        {preferredLocations.map((pl) => (
                          <div key={pl} className="flex items-center bg-blue-50 border border-blue-200 text-sm rounded-full px-3 py-1">
                            <MapPin className="w-3 h-3 mr-1 text-blue-500" />
                            <span className="mr-2 text-blue-700">{pl}</span>
                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-blue-100" onClick={() => setPreferredLocations((prev) => prev.filter(p => p !== pl))}>
                              <X className="w-3 h-3 text-blue-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {preferredLocations.length < 3 && (
                      <div className="relative" tabIndex={0} onBlur={() => setShowPreferredDropdown(false)}>
                        <Input
                          id="preferredLocations"
                          placeholder="Type to search and add locations"
                          value={preferredFilter}
                          onChange={(e) => { setPreferredFilter(e.target.value); setShowPreferredDropdown(true); }}
                          onFocus={() => setShowPreferredDropdown(true)}
                          className="min-w-[220px]"
                        />
                        {showPreferredDropdown && (
                          <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md bg-white border shadow-sm">
                            {LOCATIONS.filter(l => l.toLowerCase().includes(preferredFilter.toLowerCase()) && !preferredLocations.includes(l)).map((loc) => (
                              <div key={loc} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onMouseDown={(e) => {
                                e.preventDefault();
                                setPreferredLocations(prev => [...prev, loc]); setPreferredFilter(''); setShowPreferredDropdown(false);
                              }}>{loc}</div>
                            ))}
                            {LOCATIONS.filter(l => l.toLowerCase().includes(preferredFilter.toLowerCase()) && !preferredLocations.includes(l)).length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {preferredLocations.length < 3
                        ? `Select up to 3 preferred states (${3 - preferredLocations.length} remaining)`
                        : 'Maximum 3 locations selected. Remove one to change.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workMode">Work Mode</Label>
                    <Select value={profile.workMode || ''} onValueChange={(val: string) => setProfile({ ...profile, workMode: val })}>
                      <SelectTrigger id="workMode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onsite">Onsite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resume">Resume</Label>
                    <div className="flex items-center gap-3">
                      <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeChange} />
                      <Button variant="outline" className="rounded-full" onClick={() => resumeInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Resume
                      </Button>
                      <span className="text-sm text-gray-600">PDF, DOC, or DOCX. Max size 5MB</span>
                    </div>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          {profile?.resume ? (
                            <>
                              <a href={`http://localhost:5000${profile.resume}`} target="_blank" rel="noreferrer" className="text-sm text-gray-900 underline">{profile.resume.split('/').pop()}</a>
                              <p className="text-xs text-gray-500">Uploaded</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-900">No resume uploaded</p>
                              <p className="text-xs text-gray-500">Upload a PDF, DOC, or DOCX</p>
                            </>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={async () => {
                        if (!profile?.resume) return;
                        // remove resume locally
                        try {
                          const token = localStorage.getItem('token');
                          await fetch('http://localhost:5000/api/auth/update-profile', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ resume: null }),
                          });
                          setProfile({ ...profile, resume: null });
                          alert('Resume removed');
                        } catch (err) {
                          console.error(err);
                          alert('Failed to remove resume');
                        }
                      }}>
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
                        <Switch checked={!!profile.notificationsEnabled} onCheckedChange={(val: boolean) => setProfile({ ...profile, notificationsEnabled: val })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900">Profile Visibility</p>
                          <p className="text-sm text-gray-600">Allow recruiters to view your profile</p>
                        </div>
                        <Switch checked={!!profile.profileVisible} onCheckedChange={(val: boolean) => setProfile({ ...profile, profileVisible: val })} />
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
                    <Button onClick={handleSave} className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
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
