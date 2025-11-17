import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Briefcase, ArrowLeft, Mail, Lock, User, Phone, Building2 } from 'lucide-react';
import { UserType } from '../App';

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
          
          <h1 className="text-4xl mb-4">
            Your career journey starts here
          </h1>
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
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </Button>
                  <Button 
                    variant="outline" 
                    type="button"
                    className="rounded-full"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z"/>
                    </svg>
                    Facebook
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
