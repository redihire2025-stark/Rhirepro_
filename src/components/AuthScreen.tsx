import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Briefcase, ArrowLeft, Mail, Lock, User, Phone, Building2 } from 'lucide-react';
import { UserType } from '../App';
import { signInWithGoogle } from '../Firebase';

interface AuthScreenProps {
  onLogin: (userType: UserType) => void;
  onNavigate: (screen: 'landing' | 'jobseeker-dashboard' | 'recruiter-dashboard' | 'job-details' | 'auth' | 'profile-settings') => void;
}

export function AuthScreen({ onLogin, onNavigate }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<'jobseeker' | 'recruiter'>('jobseeker');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(userType);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block text-white">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 mb-8 rounded-full"
            onClick={() => onNavigate('landing')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl">RhirePro</span>
          </div>

          {userType === 'jobseeker' ? (
            <>
              <h1 className="text-4xl mb-4">Your career journey starts here</h1>
              <p className="text-xl text-blue-100 mb-8">
                Join thousands of professionals finding their dream jobs every day
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg">10,000+ Active Jobs</h3>
                    <p className="text-blue-100">From top companies across India</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg">Smart Matching</h3>
                    <p className="text-blue-100">AI-powered job recommendations</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg">Quick Apply</h3>
                    <p className="text-blue-100">One-click applications with your profile</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl mb-4">Hire top talent effortlessly</h1>
              <p className="text-xl text-blue-100 mb-8">
                Connect with skilled professionals and build your dream team faster than ever
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg">1,00,000+ Verified Candidates</h3>
                    <p className="text-blue-100">Find skilled professionals across India</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg">Smart Talent Matching</h3>
                    <p className="text-blue-100">AI-powered candidate recommendations</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg">Fast Hiring Tools</h3>
                    <p className="text-blue-100">Post jobs and hire with quick workflows</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>


        {/* Right Side - Auth Form */}
        <div>
          <Button
            variant="ghost"
            className="lg:hidden text-white hover:bg-white/10 mb-4 rounded-full"
            onClick={() => onNavigate('landing')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {isLogin ? 'Welcome Back!' : 'Create Account'}
              </CardTitle>
              <CardDescription>
                {isLogin
                  ? 'Sign in to continue your job search'
                  : 'Join RhirePro and start your journey'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* User Type Selection */}
              <Tabs
                value={userType}
                onValueChange={(value) => setUserType(value as 'jobseeker' | 'recruiter')}
                className="mb-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="jobseeker" className="rounded-full">
                    <User className="w-4 h-4 mr-2" />
                    Job Seeker
                  </TabsTrigger>
                  <TabsTrigger value="recruiter" className="rounded-full">
                    <Building2 className="w-4 h-4 mr-2" />
                    Recruiter
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your password"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <Label
                        htmlFor="remember"
                        className="text-sm cursor-pointer"
                      >
                        Remember me
                      </Label>
                    </div>
                    <Button
                      variant="link"
                      className="px-0 text-blue-600"
                      type="button"
                    >
                      Forgot password?
                    </Button>
                  </div>
                )}

                {!isLogin && (
                  <div className="flex items-start space-x-2">
                    <Checkbox id="terms" required />
                    <Label
                      htmlFor="terms"
                      className="text-sm cursor-pointer leading-relaxed"
                    >
                      I agree to the Terms of Service and Privacy Policy
                    </Label>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                  size="lg"
                >
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    className="rounded-full"
                    onClick={async () => {
                      try {
                        const { user } = await signInWithGoogle();
                        console.log("Google Login Success:", user);

                        // Update app state & navigate
                        onLogin(userType);
                        onNavigate(userType === "jobseeker" ? "jobseeker-dashboard" : "recruiter-dashboard");
                      } catch (error) {
                        console.log("Google auth failed", error);
                        alert("Google login failed. Check console for details.");
                      }
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 533.5 544.3">
                      <path fill="#4285F4" d="M533.5 278.4c0-17.5-1.6-34.4-4.7-50.8H272v95.9h146.9c-6.4 34.7-25.2 64.1-53.7 83.8v69.4h86.7c50.9-46.9 80.6-115.7 80.6-198.3z" />
                      <path fill="#34A853" d="M272 544.3c72.9 0 134.1-24.2 178.8-65.6l-86.7-69.4c-24.1 16.2-55 25.7-92.1 25.7-70.8 0-130.9-47.8-152.4-112.1H29.9v70.7c44.8 88.9 136.2 151.1 242.1 151.1z" />
                      <path fill="#FBBC05" d="M119.6 315.9c-10.6-31.9-10.6-66.6 0-98.5V146.7H29.9c-44.7 88.9-44.7 195.5 0 284.4l89.7-70.7z" />
                      <path fill="#EA4335" d="M272 107.2c39.7-.6 77.9 14.3 107 42.4l80-80C406.1 24.1 344.9-.1 272 0 166.1 0 74.7 62.2 29.9 151.1l89.7 70.7c21.5-64.3 81.6-112.1 152.4-114.6z" />
                    </svg>
                    Google
                  </Button>


                  <Button
                    variant="outline"
                    type="button"
                    className="rounded-full"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#0A66C2">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.447-2.136 2.941v5.665H9.351V9h3.414v1.561h.049c.476-.9 1.637-1.852 3.368-1.852 3.6 0 4.267 2.37 4.267 5.455v6.288zM5.337 7.433c-1.144 0-2.069-.927-2.069-2.071A2.07 2.07 0 0 1 5.337 3.29c1.144 0 2.07.927 2.07 2.071 0 1.144-.926 2.071-2.07 2.071zm1.777 13.019H3.561V9h3.553v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                  </Button>

                </div>

                <div className="text-center mt-6">
                  <span className="text-gray-600">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                  </span>
                  <Button
                    variant="link"
                    className="px-0 text-blue-600"
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
