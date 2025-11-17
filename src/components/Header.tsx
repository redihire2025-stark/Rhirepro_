import { Bell, User, Menu, ChevronDown, Briefcase, LogOut, Settings } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { UserType } from '../App';

interface HeaderProps {
  userType?: UserType;
  onNavigate: (screen: 'landing' | 'jobseeker-dashboard' | 'recruiter-dashboard' | 'job-details' | 'auth' | 'profile-settings') => void;
  onLogout?: () => void;
  variant?: 'default' | 'compact';
}

export function Header({ userType, onNavigate, onLogout, variant = 'default' }: HeaderProps) {
  const navLinks = userType === 'jobseeker' 
    ? ['Jobs', 'Companies', 'Services', 'Resources']
    : userType === 'recruiter'
    ? ['Dashboard', 'Post Job', 'Candidates', 'Plans']
    : ['Jobs', 'Companies', 'Services'];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onNavigate('landing')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl text-gray-900">RhirePro</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button 
                key={link}
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                {link}
              </button>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {userType ? (
              <>
                {/* Notifications */}
                <button className="hidden sm:flex relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hidden sm:flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-400 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => onNavigate(userType === 'jobseeker' ? 'jobseeker-dashboard' : 'recruiter-dashboard')}>
                      <User className="w-4 h-4 mr-2" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNavigate('profile-settings')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="md:hidden p-2 text-gray-600 hover:text-blue-600">
                      <Menu className="w-6 h-6" />
                    </button>
                  </SheetTrigger>
                  <SheetContent>
                    <nav className="flex flex-col gap-4 mt-8">
                      {navLinks.map((link) => (
                        <button 
                          key={link}
                          className="text-left py-2 text-gray-700 hover:text-blue-600 transition-colors"
                        >
                          {link}
                        </button>
                      ))}
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <button 
                          onClick={() => onNavigate('profile-settings')}
                          className="w-full text-left py-2 text-gray-700 hover:text-blue-600 transition-colors"
                        >
                          Settings
                        </button>
                        <button 
                          onClick={onLogout}
                          className="w-full text-left py-2 text-red-600 hover:text-red-700 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    </nav>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="hidden sm:flex rounded-full"
                  onClick={() => onNavigate('auth')}
                >
                  Login
                </Button>
                <Button 
                  className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
                  onClick={() => onNavigate('auth')}
                >
                  Register
                </Button>

                {/* Mobile Menu for non-logged in */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="md:hidden p-2 text-gray-600 hover:text-blue-600">
                      <Menu className="w-6 h-6" />
                    </button>
                  </SheetTrigger>
                  <SheetContent>
                    <nav className="flex flex-col gap-4 mt-8">
                      {navLinks.map((link) => (
                        <button 
                          key={link}
                          className="text-left py-2 text-gray-700 hover:text-blue-600 transition-colors"
                        >
                          {link}
                        </button>
                      ))}
                    </nav>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
