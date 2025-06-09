import React, { useState, useEffect } from 'react';
import {
  Leaf, Home, Info, Menu, X, User, BarChart2,
  FileClock, LogIn, UserPlus, LogOut, UserCircle
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, [location]);

  const publicNavItems = [
    { path: '/', label: 'Beranda', icon: Home },
    { path: '/cornLeafScanner', label: 'Scanner', icon: Leaf },
    { path: '/team', label: 'Team', icon: User },
    { path: '/about', label: 'Tentang', icon: Info },
  ];

  const privateNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart2 },
    { path: '/riwayat', label: 'Riwayat', icon: FileClock },
    { path: '/profile', label: 'Profil', icon: UserCircle },
  ];

  const authItems = [
    { path: '/login', label: 'Login', icon: LogIn },
    { path: '/register', label: 'Register', icon: UserPlus, isPrimary: true },
  ];

  const navItemsToShow = isLoggedIn ? [...publicNavItems, ...privateNavItems] : publicNavItems;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setIsMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const NavLink = ({ path, label, icon: Icon, isPrimary = false }) => (
    <Link
      to={path}
      onClick={() => setIsMenuOpen(false)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition duration-200 ${
        isPrimary
          ? 'bg-green-600 text-white hover:bg-green-700 shadow'
          : isActive(path)
          ? 'bg-green-100 text-green-700 shadow-sm'
          : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  );

  const LogoutButton = ({ isMobile = false }) => (
    <button
      onClick={handleLogout}
      className={`flex items-center w-full ${
        isMobile ? 'px-4 py-3' : 'px-3 py-2'
      } space-x-2 rounded-lg font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition duration-200`}
    >
      <LogOut className="w-5 h-5" />
      <span>Logout</span>
    </button>
  );

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 text-xl font-bold text-[#039b62]">
            <Leaf className="w-7 h-7" />
            <span className="bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
              CornLeaf AI
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {navItemsToShow.map(item => (
              <NavLink key={item.path} {...item} />
            ))}

            <div className="h-6 border-l border-gray-200 mx-2"></div>

            {isLoggedIn ? (
              <LogoutButton />
            ) : (
              authItems.map(item => <NavLink key={item.path} {...item} />)
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Menu"
            className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-50 px-4 pb-4 animate-in slide-in-from-top fade-in duration-200 rounded-b-lg">
          <div className="flex flex-col space-y-2 mt-2">
            {navItemsToShow.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${
                  isActive(item.path)
                    ? 'bg-green-100 text-green-700 shadow-sm'
                    : 'text-gray-600 hover:text-green-600 hover:bg-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}

            <hr className="my-2 border-gray-200" />

            {isLoggedIn ? (
              <LogoutButton isMobile />
            ) : (
              authItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${
                    isActive(item.path)
                      ? 'bg-green-100 text-green-700 shadow-sm'
                      : 'text-gray-600 hover:text-green-600 hover:bg-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
