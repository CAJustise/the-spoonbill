import React, { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Menu, Calendar, Users, Settings, LogOut, Image, UtensilsCrossed, GlassWater, Briefcase, Building2, FileText, ChefHat, DollarSign } from 'lucide-react';
import logoNavy from '../../assets/SpoonbillLogoDark.png';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img src={logoNavy} alt="The Spoonbill" className="h-8 w-auto" />
                <span className="ml-3 text-xl font-garamond font-medium text-gray-900">Admin Portal</span>
              </Link>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-600 hover:text-ocean-600 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-2" />
                <span className="font-garamond">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Side Navigation */}
      <div className="fixed left-0 top-16 h-full w-64 bg-white shadow-lg overflow-y-auto">
        <nav className="p-4 space-y-2">
          <Link
            to="/admin"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Menu className="h-5 w-5 mr-3" />
            <span className="font-garamond">Dashboard</span>
          </Link>

          {/* Menu Management Section */}
          <div className="py-2">
            <div className="px-4 text-xs font-medium text-gray-400 uppercase">
              Menu Management
            </div>
          </div>
          
          <Link
            to="/admin/menu/tasting-menus"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/menu/tasting-menus')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChefHat className="h-5 w-5 mr-3" />
            <span className="font-garamond">Tasting Menus</span>
          </Link>

          <Link
            to="/admin/menu/food-categories"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/menu/food-categories')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UtensilsCrossed className="h-5 w-5 mr-3" />
            <span className="font-garamond">Food Categories</span>
          </Link>

          <Link
            to="/admin/menu/food-items"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/menu/food-items')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UtensilsCrossed className="h-5 w-5 mr-3" />
            <span className="font-garamond">Food Items</span>
          </Link>

          <Link
            to="/admin/menu/drink-categories"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/menu/drink-categories')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <GlassWater className="h-5 w-5 mr-3" />
            <span className="font-garamond">Drink Categories</span>
          </Link>

          <Link
            to="/admin/menu/drink-items"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/menu/drink-items')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <GlassWater className="h-5 w-5 mr-3" />
            <span className="font-garamond">Drink Items</span>
          </Link>

          {/* Content Management Section */}
          <div className="py-2">
            <div className="px-4 text-xs font-medium text-gray-400 uppercase">
              Content Management
            </div>
          </div>

          <Link
            to="/admin/events"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/events')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calendar className="h-5 w-5 mr-3" />
            <span className="font-garamond">Event Management</span>
          </Link>

          <Link
            to="/admin/images"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/images')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Image className="h-5 w-5 mr-3" />
            <span className="font-garamond">Image Manager</span>
          </Link>

          {/* Career Management Section */}
          <div className="py-2">
            <div className="px-4 text-xs font-medium text-gray-400 uppercase">
              Career Management
            </div>
          </div>

          <Link
            to="/admin/jobs"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/jobs')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Briefcase className="h-5 w-5 mr-3" />
            <span className="font-garamond">Job Listings</span>
          </Link>

          <Link
            to="/admin/departments"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/departments')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Building2 className="h-5 w-5 mr-3" />
            <span className="font-garamond">Departments</span>
          </Link>

          <Link
            to="/admin/job-types"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/job-types')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="h-5 w-5 mr-3" />
            <span className="font-garamond">Employment Types</span>
          </Link>

          <Link
            to="/admin/applications"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/applications')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="h-5 w-5 mr-3" />
            <span className="font-garamond">Job Applications</span>
          </Link>

          {/* Investment Section */}
          <div className="py-2">
            <div className="px-4 text-xs font-medium text-gray-400 uppercase">
              Investment
            </div>
          </div>

          <Link
            to="/admin/investor-submissions"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/investor-submissions')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <DollarSign className="h-5 w-5 mr-3" />
            <span className="font-garamond">Investor Submissions</span>
          </Link>

          {/* Settings Section */}
          <div className="py-2">
            <div className="px-4 text-xs font-medium text-gray-400 uppercase">
              System
            </div>
          </div>

          <Link
            to="/admin/settings"
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive('/admin/settings')
                ? 'bg-ocean-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="h-5 w-5 mr-3" />
            <span className="font-garamond">Settings</span>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="pl-64 pt-16">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;