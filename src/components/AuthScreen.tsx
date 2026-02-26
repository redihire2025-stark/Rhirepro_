import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Briefcase, ArrowLeft, Mail, Lock, User, Phone, Building2 } from 'lucide-react';
import { UserType } from '../App';
// import { auth, signInWithGoogle } from '../Firebase';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000';



interface AuthScreenProps {
  onLogin: (userType: UserType) => void;
  onNavigate: (screen: 'landing' | 'jobseeker-dashboard' | 'recruiter-dashboard' | 'job-details' | 'auth' | 'profile-settings') => void;
}

export function AuthScreen({ onLogin, onNavigate }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<'jobseeker' | 'recruiter'>('jobseeker');
  const [showForgot, setShowForgot] = useState(false);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [loginOtpFlow, setLoginOtpFlow] = useState(false);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef<number | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<'fresher' | 'experienced'>('experienced');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const completeGoogleLogin = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = await res.json();
        if (!res.ok) throw new Error(user?.message || 'Google sign-in failed');

        localStorage.setItem('token', token);
        localStorage.setItem(
          'user',
          JSON.stringify({
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone || '',
            email: user.email,
            employmentStatus: user.employmentStatus || 'experienced',
            role: user.role || 'jobseeker',
          })
        );

        onLogin(user.role || 'jobseeker');
        onNavigate((user.role || 'jobseeker') === 'jobseeker' ? 'jobseeker-dashboard' : 'recruiter-dashboard');
      } catch (error) {
        console.error('Google callback handling failed:', error);
        localStorage.removeItem('token');
        alert('Google login failed. Please try again.');
      } finally {
        params.delete('token');
        const query = params.toString();
        const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
        window.history.replaceState({}, '', cleanUrl);
      }
    };

    completeGoogleLogin();
  }, [onLogin, onNavigate]);

  const backendLogin = async () => {
    try {
      // Use signin-init to validate credentials and send OTP for signin
      const res = await fetch(`${API_BASE}/api/auth/signin-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Login failed");
        return;
      }

      // Enter OTP flow for signin
      setLoginOtpFlow(true);
      setStep('otp');
      startTimer();
      alert(data.message || 'OTP sent to your email for signin');
    } catch (err) {
      console.error(err);
      alert("Backend not reachable. Is server running?");
    }
  };

  const backendSignup = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          employmentStatus,
          password,
          role: userType,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        alert(text || "Signup failed");
        return;
      }

      const data = await res.json();
      alert("Account created. Please sign in.");
      setIsLogin(true);
    } catch (err) {
      console.error(err);
      alert("Backend not reachable. Is server running?");
    }
  };

  const sendOtp = async () => {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Failed to send OTP');
      return;
    }

    alert('OTP sent to your email');
    setStep('otp');
    startTimer();
  };

  const resendOtp = async () => {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        context: loginOtpFlow ? 'signin' : 'password_reset',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Failed to resend OTP');
      return;
    }

    alert('OTP sent to your email');
    setStep('otp');
    startTimer();
  };

  const startTimer = () => {
    setTimer(30);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    const countdown = window.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = countdown;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  const resetPassword = async () => {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword: password }),
    });

    const data = await res.json();
    alert(data.message);
    if (res.ok) {
      setShowForgot(false);
      setIsLogin(true);
    }
  };

  const verifyOtp = async () => {
    if (loginOtpFlow) {
      // verify signin OTP and obtain token
      const res = await fetch(`${API_BASE}/api/auth/signin-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'OTP verification failed');
        return;
      }

      // store token and user, navigate
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || '',
        email: data.email,
        employmentStatus: data.employmentStatus || 'experienced',
        role: data.role,
      }));

      onLogin(data.role);
      onNavigate(data.role === 'jobseeker' ? 'jobseeker-dashboard' : 'recruiter-dashboard');
    } else {
      // existing reset-password verify flow
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      alert(data.message);
      if (res.ok) setStep('reset');
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isLogin ? backendLogin() : backendSignup();
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
                onValueChange={(value: string) => setUserType(value as 'jobseeker' | 'recruiter')}
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

              {!(showForgot || loginOtpFlow) && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="first-name"
                            placeholder="First name"
                            className="pl-10"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">Last Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="last-name"
                            placeholder="Last name"
                            className="pl-10"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      {userType === 'jobseeker' && (
                        <div className="space-y-2">
                          <Label>Are you a fresher or experienced?</Label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="employmentStatus"
                                value="fresher"
                                checked={employmentStatus === 'fresher'}
                                onChange={() => setEmploymentStatus('fresher')}
                              />
                              Fresher
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="employmentStatus"
                                value="experienced"
                                checked={employmentStatus === 'experienced'}
                                onChange={() => setEmploymentStatus('experienced')}
                              />
                              Experienced
                            </label>
                          </div>
                        </div>
                      )}
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                        onClick={() => {
                          setShowForgot(true);
                          setStep('email');
                        }}
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

                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      type="button"
                      className="rounded-full px-6"
                      onClick={() => {
                        window.location.href = `${API_BASE}/api/auth/google?role=${encodeURIComponent(userType)}`;
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
              )}

              {(showForgot || loginOtpFlow) ? (
                <div className="space-y-4 mt-4">
                  {step === 'email' && (
                    <>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter registered email"
                      />
                      <Button
                        className="w-full"
                        onClick={sendOtp}
                      >
                        Send OTP
                      </Button>
                    </>
                  )}

                  {step === 'otp' && (
                    <>
                      <Label>Enter OTP</Label>
                      <Input
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="6-digit OTP"
                      />
                      <div className="flex flex-col gap-2">
                        <Button
                          className="w-full"
                          onClick={verifyOtp}
                        >
                          Verify OTP
                        </Button>

                        <div className="flex items-center justify-between">
                          <Button
                            variant="ghost"
                            className="text-sm"
                            onClick={() => {
                              // cancel OTP flow and go back to login
                              setLoginOtpFlow(false);
                              setShowForgot(false);
                              setStep('email');
                              setOtp('');
                              setTimer(0);
                              if (timerRef.current) {
                                clearInterval(timerRef.current);
                                timerRef.current = null;
                              }
                            }}
                          >
                            Cancel
                          </Button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Resend available in {timer}s</span>
                          <Button
                            className="text-sm"
                            onClick={resendOtp}
                            disabled={timer > 0}
                          >
                            Resend OTP
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {step === 'reset' && (
                    <>
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <Button
                        className="w-full"
                        onClick={resetPassword}
                      >
                        Reset Password
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
