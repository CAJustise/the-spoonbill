import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  GlassWater,
  Calendar,
  CalendarCheck2,
  CalendarRange,
  GraduationCap,
  Image,
  Briefcase,
  Building2,
  FileText,
  Users,
  Settings,
  ChefHat,
  DollarSign,
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

interface DashboardCard {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  section: BohSection;
  capability?: BohCapability;
}

const SECTION_ORDER: BohSection[] = [
  'menu_management',
  'operations',
  'workforce',
  'content_management',
  'career_management',
  'investment',
  'settings',
];

const SECTION_LABELS: Record<BohSection, string> = {
  menu_management: 'Menu Management',
  operations: 'Operations',
  workforce: 'Workforce OS',
  content_management: 'Content Management',
  career_management: 'Career Management',
  investment: 'Investment',
  settings: 'Settings',
};

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

const DASHBOARD_CARDS: DashboardCard[] = [
  {
    to: '/admin/menu/tasting-menus',
    title: 'Tasting Menus',
    description: 'Manage tasting menus and prix fixe offerings.',
    icon: ChefHat,
    section: 'menu_management',
  },
  {
    to: '/admin/menu/food-categories',
    title: 'Food Categories',
    description: 'Manage food menu categories and organization.',
    icon: UtensilsCrossed,
    section: 'menu_management',
  },
  {
    to: '/admin/menu/food-items',
    title: 'Food Items',
    description: 'Manage food menu items and pricing.',
    icon: UtensilsCrossed,
    section: 'menu_management',
  },
  {
    to: '/admin/menu/drink-categories',
    title: 'Drink Categories',
    description: 'Manage drink menu categories and organization.',
    icon: GlassWater,
    section: 'menu_management',
  },
  {
    to: '/admin/menu/drink-items',
    title: 'Drink Items',
    description: 'Manage drink menu items and pricing.',
    icon: GlassWater,
    section: 'menu_management',
  },
  {
    to: '/admin/boh/reservations',
    title: 'Reservations',
    description: 'Manage reservation bookings and capacity limits.',
    icon: CalendarCheck2,
    section: 'operations',
    capability: 'reservations',
  },
  {
    to: '/admin/boh/events-parties',
    title: 'Event / Parties',
    description: 'Track private event inquiries and schedule capacity.',
    icon: CalendarRange,
    section: 'operations',
    capability: 'events_parties',
  },
  {
    to: '/admin/boh/classes',
    title: 'Classes',
    description: 'Manage class sessions and attendee signups.',
    icon: GraduationCap,
    section: 'operations',
    capability: 'classes',
  },
  {
    to: '/admin/workforce',
    title: 'Team + Labor',
    description: 'Run team, shifts, tasks, compliance, and labor analytics.',
    icon: Users,
    section: 'workforce',
  },
  {
    to: '/admin/workforce/team-access',
    title: 'Team Access',
    description: 'Configure section visibility and operations permissions by employee.',
    icon: UserCog,
    section: 'workforce',
  },
  {
    to: '/admin/events',
    title: 'Event Management',
    description: 'Create and manage website events and experiences.',
    icon: Calendar,
    section: 'content_management',
  },
  {
    to: '/admin/images',
    title: 'Image Manager',
    description: 'Upload and manage images for website content.',
    icon: Image,
    section: 'content_management',
  },
  {
    to: '/admin/jobs',
    title: 'Job Listings',
    description: 'Manage open positions and job descriptions.',
    icon: Briefcase,
    section: 'career_management',
  },
  {
    to: '/admin/departments',
    title: 'Departments',
    description: 'Manage restaurant departments and teams.',
    icon: Building2,
    section: 'career_management',
  },
  {
    to: '/admin/job-types',
    title: 'Employment Types',
    description: 'Manage employment types and classifications.',
    icon: FileText,
    section: 'career_management',
  },
  {
    to: '/admin/applications',
    title: 'Job Applications',
    description: 'Review and manage incoming applications.',
    icon: Users,
    section: 'career_management',
  },
  {
    to: '/admin/investor-submissions',
    title: 'Investor Submissions',
    description: 'Review and manage investor interest submissions.',
    icon: DollarSign,
    section: 'investment',
  },
  {
    to: '/admin/settings',
    title: 'Settings',
    description: 'Manage account settings and system preferences.',
    icon: Settings,
    section: 'settings',
  },
];

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<PortalCapabilities>(EMPTY_CAPABILITIES);

  useEffect(() => {
    let active = true;

    const fetchAccess = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) return;

        const roleIds = await getRoleIdsForUser(session.user.id);
        const teamMember = await getTeamMemberForUser(session.user.id);
        const nextCapabilities = derivePortalCapabilities(roleIds, teamMember);

        if (!active) return;
        setCapabilities(nextCapabilities);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchAccess();

    return () => {
      active = false;
    };
  }, []);

  const visibleCardsBySection = useMemo(() => {
    const grouped = {} as Record<BohSection, DashboardCard[]>;
    SECTION_ORDER.forEach((section) => {
      grouped[section] = [];
    });

    DASHBOARD_CARDS.forEach((card) => {
      if (!canAccessSection(capabilities, card.section)) return;
      if (card.capability && !canAccessCapability(capabilities, card.capability)) return;
      grouped[card.section].push(card);
    });

    return grouped;
  }, [capabilities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-none px-4 py-6">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {!hasAnySectionAccess(capabilities) && (
          <div className="bg-white border border-gray-100 rounded-lg shadow p-6 text-gray-600">
            No dashboard sections are assigned to your account yet.
          </div>
        )}

        {SECTION_ORDER.map((section) => {
          const cards = visibleCardsBySection[section];
          if (!cards || cards.length === 0) return null;

          return (
            <section key={section} className="mb-12">
              <h2 className="text-xl font-display font-medium text-gray-600 mb-6">
                {SECTION_LABELS[section]}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.to}
                      to={card.to}
                      className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow group"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-ocean-100 rounded-lg text-ocean-600 group-hover:bg-ocean-600 group-hover:text-white transition-colors">
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-display font-bold text-gray-900">{card.title}</h3>
                      </div>
                      <p className="text-gray-600 font-garamond">{card.description}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
