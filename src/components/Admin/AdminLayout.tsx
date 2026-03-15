import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  canAccessPortal,
  derivePortalCapabilities,
  getRoleIdsForUser,
  getTeamMemberForUser,
  resolveDefaultPortal,
  type BohCapability,
  type BohPortal,
  type PortalCapabilities,
} from '../../lib/bohRoles';
import logoNavy from '../../assets/SpoonbillLogoDark.png';

interface AdminLayoutProps {
  children: React.ReactNode;
  portal?: BohPortal;
  requiredCapability?: BohCapability;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

const adminNavSections: NavSection[] = [
  {
    items: [{ to: '/admin', label: 'Dashboard', icon: Menu }],
  },
  {
    heading: 'Menu Management',
    items: [
      { to: '/admin/menu/tasting-menus', label: 'Tasting Menus', icon: ChefHat },
      { to: '/admin/menu/food-categories', label: 'Food Categories', icon: UtensilsCrossed },
      { to: '/admin/menu/food-items', label: 'Food Items', icon: UtensilsCrossed },
      { to: '/admin/menu/drink-categories', label: 'Drink Categories', icon: GlassWater },
      { to: '/admin/menu/drink-items', label: 'Drink Items', icon: GlassWater },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/admin/boh/reservations', label: 'Reservations', icon: CalendarCheck2 },
      { to: '/admin/boh/events-parties', label: 'Event / Parties', icon: CalendarRange },
      { to: '/admin/boh/classes', label: 'Classes', icon: GraduationCap },
    ],
  },
  {
    heading: 'Content Management',
    items: [
      { to: '/admin/events', label: 'Event Management', icon: Calendar },
      { to: '/admin/images', label: 'Image Manager', icon: Image },
    ],
  },
  {
    heading: 'Career Management',
    items: [
      { to: '/admin/jobs', label: 'Job Listings', icon: Briefcase },
      { to: '/admin/departments', label: 'Departments', icon: Building2 },
      { to: '/admin/job-types', label: 'Employment Types', icon: FileText },
      { to: '/admin/applications', label: 'Job Applications', icon: Users },
    ],
  },
  {
    heading: 'Investment',
    items: [{ to: '/admin/investor-submissions', label: 'Investor Submissions', icon: DollarSign }],
  },
  {
    heading: 'System',
    items: [
      { to: '/admin/team-members', label: 'Team Members', icon: UserCog },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const portalLoginPath = (portal: BohPortal) => {
  if (portal === 'admin') return '/admin/login';
  if (portal === 'host') return '/host/login';
  return '/staff/login';
};

const portalHomePath = (portal: BohPortal) => {
  if (portal === 'admin') return '/admin';
  if (portal === 'host') return '/host';
  return '/staff';
};

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, portal = 'admin', requiredCapability }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authReady, setAuthReady] = useState(false);
  const [teamMemberName, setTeamMemberName] = useState('');
  const [capabilities, setCapabilities] = useState<PortalCapabilities>({
    canViewReservations: false,
    canViewEventsParties: false,
    canViewClasses: false,
  });

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const loginPath = portalLoginPath(portal);
        if (!session) {
          navigate(loginPath);
          return;
        }

        const roleIds = await getRoleIdsForUser(session.user.id);
        const teamMember = await getTeamMemberForUser(session.user.id);

        if (!canAccessPortal(roleIds, portal, teamMember)) {
          const fallbackPortal = resolveDefaultPortal(roleIds, teamMember);
          if (fallbackPortal) {
            navigate(portalHomePath(fallbackPortal));
            return;
          }

          await supabase.auth.signOut();
          navigate(loginPath);
          return;
        }

        const nextCapabilities = derivePortalCapabilities(roleIds, teamMember);
        if (
          portal !== 'admin' &&
          requiredCapability &&
          !canAccessCapability(nextCapabilities, requiredCapability)
        ) {
          navigate(portalHomePath(portal));
          return;
        }

        if (!active) return;

        setCapabilities(nextCapabilities);
        setTeamMemberName(teamMember?.name || '');
        setAuthReady(true);
      } catch {
        const loginPath = portalLoginPath(portal);
        await supabase.auth.signOut();
        navigate(loginPath);
      }
    };

    void checkAuth();

    return () => {
      active = false;
    };
  }, [navigate, portal, requiredCapability]);

  const loginPath = portalLoginPath(portal);
  const portalTitle = portal === 'admin' ? 'Admin Portal' : portal === 'host' ? 'Host Portal' : 'Team Portal';
  const sections = useMemo(() => {
    if (portal === 'admin') {
      return adminNavSections;
    }

    const basePath = portal === 'host' ? '/host' : '/staff';
    const bohItems: NavItem[] = [];

    if (capabilities.canViewReservations) {
      bohItems.push({ to: `${basePath}/reservations`, label: 'Reservations', icon: CalendarCheck2 });
    }
    if (capabilities.canViewEventsParties) {
      bohItems.push({ to: `${basePath}/events-parties`, label: 'Event / Parties', icon: CalendarRange });
    }
    if (capabilities.canViewClasses) {
      bohItems.push({ to: `${basePath}/classes`, label: 'Classes', icon: GraduationCap });
    }

    const navSections: NavSection[] = [{ items: [{ to: basePath, label: 'Dashboard', icon: Menu }] }];
    if (bohItems.length) {
      navSections.push({
        heading: 'BOH Operations',
        items: bohItems,
      });
    }

    return navSections;
  }, [capabilities, portal]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate(loginPath);
  };

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== '/admin' &&
      path !== '/host' &&
      path !== '/staff' &&
      location.pathname.startsWith(`${path}/`));

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
                <span className="ml-3 text-xl font-garamond font-medium text-gray-900">{portalTitle}</span>
              </Link>
            </div>

            <div className="flex items-center gap-6">
              {teamMemberName && portal !== 'admin' && (
                <span className="text-sm text-gray-500 hidden md:block">{teamMemberName}</span>
              )}
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
