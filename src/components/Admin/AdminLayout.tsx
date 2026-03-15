import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Calendar,
  Users,
  Settings,
  LogOut,
  Image,
  UtensilsCrossed,
  GlassWater,
  Briefcase,
  Building2,
  FileText,
  ChefHat,
  DollarSign,
  CalendarCheck2,
  CalendarRange,
  GraduationCap,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  canAccessCapability,
  canAccessSection,
  derivePortalCapabilities,
  getRoleIdsForUser,
  getTeamMemberForUser,
  hasAnySectionAccess,
  type BohCapability,
  type BohSection,
  type PortalCapabilities,
} from '../../lib/bohRoles';
import logoNavy from '../../assets/SpoonbillLogoDark.png';

interface AdminLayoutProps {
  children: React.ReactNode;
  requiredSection?: BohSection;
  requiredCapability?: BohCapability;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  capability?: BohCapability;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

const EMPTY_CAPABILITIES: PortalCapabilities = {
  canViewReservations: false,
  canViewEventsParties: false,
  canViewClasses: false,
  operationsClassesReadOnly: false,
  canAccessMenuManagement: false,
  canAccessOperations: false,
  canAccessWorkforce: false,
  canAccessContentManagement: false,
  canAccessCareerManagement: false,
  canAccessInvestment: false,
  canAccessSettings: false,
};

const MENU_ITEMS: NavItem[] = [
  { to: '/admin/menu/tasting-menus', label: 'Tasting Menus', icon: ChefHat },
  { to: '/admin/menu/food-categories', label: 'Food Categories', icon: UtensilsCrossed },
  { to: '/admin/menu/food-items', label: 'Food Items', icon: UtensilsCrossed },
  { to: '/admin/menu/drink-categories', label: 'Drink Categories', icon: GlassWater },
  { to: '/admin/menu/drink-items', label: 'Drink Items', icon: GlassWater },
];

const OPERATIONS_ITEMS: NavItem[] = [
  { to: '/admin/boh/reservations', label: 'Reservations', icon: CalendarCheck2, capability: 'reservations' },
  { to: '/admin/boh/events-parties', label: 'Event / Parties', icon: CalendarRange, capability: 'events_parties' },
  { to: '/admin/boh/classes', label: 'Classes', icon: GraduationCap, capability: 'classes' },
];

const WORKFORCE_ITEMS: NavItem[] = [
  { to: '/admin/workforce', label: 'Team + Labor', icon: Users },
  { to: '/admin/workforce/team-access', label: 'Team Access', icon: UserCog },
];

const CONTENT_ITEMS: NavItem[] = [
  { to: '/admin/events', label: 'Event Management', icon: Calendar },
  { to: '/admin/images', label: 'Image Manager', icon: Image },
];

const CAREER_ITEMS: NavItem[] = [
  { to: '/admin/jobs', label: 'Job Listings', icon: Briefcase },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
  { to: '/admin/job-types', label: 'Employment Types', icon: FileText },
  { to: '/admin/applications', label: 'Job Applications', icon: Users },
];

const INVESTMENT_ITEMS: NavItem[] = [
  { to: '/admin/investor-submissions', label: 'Investor Submissions', icon: DollarSign },
];

const SETTINGS_ITEMS: NavItem[] = [{ to: '/admin/settings', label: 'Settings', icon: Settings }];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, requiredSection, requiredCapability }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authReady, setAuthReady] = useState(false);
  const [teamMemberName, setTeamMemberName] = useState('');
  const [capabilities, setCapabilities] = useState<PortalCapabilities>(EMPTY_CAPABILITIES);

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          navigate('/admin/login');
          return;
        }

        const roleIds = await getRoleIdsForUser(session.user.id);
        const teamMember = await getTeamMemberForUser(session.user.id);
        const nextCapabilities = derivePortalCapabilities(roleIds, teamMember);

        if (!hasAnySectionAccess(nextCapabilities)) {
          await supabase.auth.signOut();
          navigate('/admin/login');
          return;
        }

        if (requiredSection && !canAccessSection(nextCapabilities, requiredSection)) {
          navigate('/admin');
          return;
        }

        if (requiredCapability && !canAccessCapability(nextCapabilities, requiredCapability)) {
          navigate('/admin');
          return;
        }

        if (!active) return;

        setCapabilities(nextCapabilities);
        setTeamMemberName(teamMember?.name || String(session.user.email || ''));
        setAuthReady(true);
      } catch {
        await supabase.auth.signOut();
        navigate('/admin/login');
      }
    };

    void checkAuth();

    return () => {
      active = false;
    };
  }, [navigate, requiredCapability, requiredSection]);

  const sections = useMemo(() => {
    const nextSections: NavSection[] = [
      {
        items: [{ to: '/admin', label: 'Dashboard', icon: Menu }],
      },
    ];

    if (canAccessSection(capabilities, 'menu_management')) {
      nextSections.push({ heading: 'Menu Management', items: MENU_ITEMS });
    }

    if (canAccessSection(capabilities, 'operations')) {
      const allowedOperationItems = OPERATIONS_ITEMS.filter((item) =>
        item.capability ? canAccessCapability(capabilities, item.capability) : true,
      );
      if (allowedOperationItems.length > 0) {
        nextSections.push({ heading: 'Operations', items: allowedOperationItems });
      }
    }

    if (canAccessSection(capabilities, 'workforce')) {
      nextSections.push({ heading: 'Workforce OS', items: WORKFORCE_ITEMS });
    }

    if (canAccessSection(capabilities, 'content_management')) {
      nextSections.push({ heading: 'Content Management', items: CONTENT_ITEMS });
    }

    if (canAccessSection(capabilities, 'career_management')) {
      nextSections.push({ heading: 'Career Management', items: CAREER_ITEMS });
    }

    if (canAccessSection(capabilities, 'investment')) {
      nextSections.push({ heading: 'Investment', items: INVESTMENT_ITEMS });
    }

    if (canAccessSection(capabilities, 'settings')) {
      nextSections.push({ heading: 'Settings', items: SETTINGS_ITEMS });
    }

    return nextSections;
  }, [capabilities]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/admin' && location.pathname.startsWith(`${path}/`));

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              {teamMemberName && <span className="text-sm text-gray-500 hidden md:block">{teamMemberName}</span>}
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

      <div className="fixed left-0 top-16 h-full w-64 bg-white shadow-lg overflow-y-auto">
        <nav className="p-4 space-y-2">
          {sections.map((section) => (
            <React.Fragment key={section.heading || section.items[0].to}>
              {section.heading && (
                <div className="py-2">
                  <div className="px-4 text-xs font-medium text-gray-400 uppercase">{section.heading}</div>
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.to) ? 'bg-ocean-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <span className="font-garamond">{item.label}</span>
                  </Link>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="pl-64 pt-16">{children}</div>
    </div>
  );
};

export default AdminLayout;
