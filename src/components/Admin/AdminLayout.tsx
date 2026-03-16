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
  ChevronDown,
  ChevronRight,
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
import { BUSINESS_SETTINGS_UPDATED_EVENT, getBusinessSettings } from '../../lib/businessSettings';

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
  id: string;
  heading?: string;
  collapsible?: boolean;
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
  { to: '/admin/workforce', label: 'Team', icon: Users },
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
const NAV_STATE_COOKIE_PREFIX = 'spoonbill_nav_state_';

const readSectionStateCookie = (cookieName: string): Record<string, boolean> => {
  if (typeof document === 'undefined' || !cookieName) return {};
  const row = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${cookieName}=`));
  if (!row) return {};

  const encodedValue = row.slice(cookieName.length + 1);
  try {
    const parsed = JSON.parse(decodeURIComponent(encodedValue));
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.entries(parsed).reduce((accumulator, [key, value]) => {
      accumulator[key] = Boolean(value);
      return accumulator;
    }, {} as Record<string, boolean>);
  } catch {
    return {};
  }
};

const writeSectionStateCookie = (cookieName: string, value: Record<string, boolean>) => {
  if (typeof document === 'undefined' || !cookieName) return;
  const encoded = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${cookieName}=${encoded}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
};

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, requiredSection, requiredCapability }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authReady, setAuthReady] = useState(false);
  const [teamMemberName, setTeamMemberName] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>({});
  const [capabilities, setCapabilities] = useState<PortalCapabilities>(EMPTY_CAPABILITIES);
  const [adminLogoUrl, setAdminLogoUrl] = useState('');
  const [businessName, setBusinessName] = useState('The Spoonbill Lounge');

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

        setCurrentUserId(session.user.id);
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

  useEffect(() => {
    const syncBusinessSettings = () => {
      const settings = getBusinessSettings();
      setAdminLogoUrl(String(settings.businessLogoUrl || '').trim());
      setBusinessName(String(settings.businessName || 'The Spoonbill Lounge').trim() || 'The Spoonbill Lounge');
    };

    syncBusinessSettings();
    window.addEventListener(BUSINESS_SETTINGS_UPDATED_EVENT, syncBusinessSettings as EventListener);
    window.addEventListener('storage', syncBusinessSettings);

    return () => {
      window.removeEventListener(BUSINESS_SETTINGS_UPDATED_EVENT, syncBusinessSettings as EventListener);
      window.removeEventListener('storage', syncBusinessSettings);
    };
  }, []);

  const sections = useMemo(() => {
    const nextSections: NavSection[] = [
      {
        id: 'dashboard',
        items: [{ to: '/admin', label: 'Nest', icon: Menu }],
      },
    ];

    if (canAccessSection(capabilities, 'menu_management')) {
      nextSections.push({ id: 'menu_management', heading: 'Menu Management', collapsible: true, items: MENU_ITEMS });
    }

    if (canAccessSection(capabilities, 'operations')) {
      const allowedOperationItems = OPERATIONS_ITEMS.filter((item) =>
        item.capability ? canAccessCapability(capabilities, item.capability) : true,
      );
      if (allowedOperationItems.length > 0) {
        nextSections.push({
          id: 'operations',
          heading: 'Reservations',
          collapsible: true,
          items: allowedOperationItems,
        });
      }
    }

    if (canAccessSection(capabilities, 'content_management')) {
      nextSections.push({
        id: 'content_management',
        heading: 'Operations',
        collapsible: true,
        items: CONTENT_ITEMS,
      });
    }

    if (canAccessSection(capabilities, 'workforce')) {
      nextSections.push({ id: 'workforce', heading: 'TEAM', collapsible: true, items: WORKFORCE_ITEMS });
    }

    if (canAccessSection(capabilities, 'career_management')) {
      nextSections.push({
        id: 'career_management',
        heading: 'Career Management',
        collapsible: true,
        items: CAREER_ITEMS,
      });
    }

    if (canAccessSection(capabilities, 'investment')) {
      nextSections.push({ id: 'investment', heading: 'Investment', collapsible: true, items: INVESTMENT_ITEMS });
    }

    if (canAccessSection(capabilities, 'settings')) {
      nextSections.push({ id: 'settings', heading: 'Settings', collapsible: true, items: SETTINGS_ITEMS });
    }

    return nextSections;
  }, [capabilities]);

  const navStateCookieName = useMemo(
    () => (currentUserId ? `${NAV_STATE_COOKIE_PREFIX}${currentUserId}` : ''),
    [currentUserId],
  );

  useEffect(() => {
    if (!navStateCookieName) return;
    const parsed = readSectionStateCookie(navStateCookieName);
    setSectionCollapsed(parsed);
  }, [navStateCookieName]);

  useEffect(() => {
    if (!navStateCookieName) return;
    setSectionCollapsed((current) => {
      const next = { ...current };
      let changed = false;

      sections.forEach((section) => {
        if (!section.collapsible) {
          if (next[section.id] !== false) {
            next[section.id] = false;
            changed = true;
          }
          return;
        }

        if (next[section.id] === undefined) {
          next[section.id] = true;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [navStateCookieName, sections]);

  useEffect(() => {
    if (!navStateCookieName) return;
    writeSectionStateCookie(navStateCookieName, sectionCollapsed);
  }, [navStateCookieName, sectionCollapsed]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/admin' && location.pathname.startsWith(`${path}/`));

  const toggleSection = (sectionId: string) => {
    setSectionCollapsed((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

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
                <img src={adminLogoUrl || logoNavy} alt={businessName} className="h-8 w-auto" />
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

      <div className="fixed left-0 top-16 h-full w-56 bg-white shadow-lg flex flex-col">
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {sections.map((section) => (
            <React.Fragment key={section.id}>
              {section.heading && (
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-2 text-xs font-medium text-gray-400 uppercase flex items-center justify-between hover:text-gray-500"
                >
                  <span>{section.heading}</span>
                  {sectionCollapsed[section.id] ? (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              )}

              {(!section.collapsible || !sectionCollapsed[section.id]) &&
                section.items.map((item) => {
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
        <div className="px-4 py-3 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">
          <div className="font-semibold text-gray-700">Spoonbill Restaurant Solutions</div>
          <div>&copy; 2026</div>
        </div>
      </div>

      <div className="pl-56 pt-16">{children}</div>
    </div>
  );
};

export default AdminLayout;
