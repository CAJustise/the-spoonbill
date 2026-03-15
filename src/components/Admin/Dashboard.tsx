import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ClipboardList, Clock3, ShieldAlert, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  canAccessSection,
  derivePortalCapabilities,
  getRoleIdsForUser,
  getTeamMemberForUser,
  hasAnySectionAccess,
  type PortalCapabilities,
} from '../../lib/bohRoles';

interface WorkforceShift {
  id: string;
  employee_id: string;
  role_id: string;
  start_time: string;
  end_time: string;
}

interface WorkforceRole {
  id: string;
  name: string;
  department_id?: string;
}

interface WorkforceDepartment {
  id: string;
  name: string;
}

interface WorkforceEmployee {
  id: string;
  name: string;
}

interface WorkforcePunch {
  id: string;
  employee_id: string;
  shift_id: string;
  clock_in: string;
  clock_out?: string | null;
}

interface WorkforceBreak {
  id: string;
  punch_id: string;
  start_time: string;
  end_time?: string | null;
}

interface WorkforceTask {
  id: string;
  title: string;
  station_id?: string;
  due_time?: string;
  completion_status?: string;
  critical?: boolean;
}

interface WorkforceLogEntry {
  id: string;
  author_name?: string;
  timestamp: string;
  category?: string;
  severity?: string;
  message: string;
}

interface ReservationRecord {
  id: string;
  reservation_date: string;
  status?: string;
}

interface EventBookingRecord {
  id: string;
  event_date: string;
  status?: string;
}

interface ClassBookingRecord {
  id: string;
  class_date?: string;
  status?: string;
}

interface MenuItemRecord {
  id: string;
  name: string;
  menu_type?: string;
  is_86d?: boolean;
  eighty_six?: boolean;
  out_of_stock?: boolean;
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

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatTimeWindow = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${startTime} - ${endTime}`;
  return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

const toDateKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<PortalCapabilities>(EMPTY_CAPABILITIES);
  const [shifts, setShifts] = useState<WorkforceShift[]>([]);
  const [roles, setRoles] = useState<WorkforceRole[]>([]);
  const [departments, setDepartments] = useState<WorkforceDepartment[]>([]);
  const [employees, setEmployees] = useState<WorkforceEmployee[]>([]);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [eventBookings, setEventBookings] = useState<EventBookingRecord[]>([]);
  const [classBookings, setClassBookings] = useState<ClassBookingRecord[]>([]);
  const [logs, setLogs] = useState<WorkforceLogEntry[]>([]);
  const [punches, setPunches] = useState<WorkforcePunch[]>([]);
  const [breaks, setBreaks] = useState<WorkforceBreak[]>([]);
  const [tasks, setTasks] = useState<WorkforceTask[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRecord[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) return;

        const roleIds = await getRoleIdsForUser(session.user.id);
        const teamMember = await getTeamMemberForUser(session.user.id);
        const nextCapabilities = derivePortalCapabilities(roleIds, teamMember);

        const [
          shiftsRes,
          rolesRes,
          departmentsRes,
          employeesRes,
          reservationsRes,
          eventBookingsRes,
          classBookingsRes,
          logsRes,
          punchesRes,
          breaksRes,
          tasksRes,
          menuItemsRes,
        ] = await Promise.all([
          supabase.from('workforce_shifts').select('*').order('start_time'),
          supabase.from('workforce_roles').select('*').order('name'),
          supabase.from('workforce_departments').select('*').order('name'),
          supabase.from('workforce_employees').select('*').order('name'),
          supabase.from('reservations').select('*').order('reservation_date'),
          supabase.from('event_bookings').select('*').order('event_date'),
          supabase.from('class_bookings').select('*').order('class_date'),
          supabase.from('workforce_log_entries').select('*').order('timestamp', { ascending: false }),
          supabase.from('workforce_punches').select('*').order('clock_in', { ascending: false }),
          supabase.from('workforce_breaks').select('*').order('start_time', { ascending: false }),
          supabase.from('workforce_tasks').select('*').order('due_time'),
          supabase.from('menu_items').select('*').order('name'),
        ]);

        if (!active) return;

        setCapabilities(nextCapabilities);
        setShifts((shiftsRes.data as WorkforceShift[]) || []);
        setRoles((rolesRes.data as WorkforceRole[]) || []);
        setDepartments((departmentsRes.data as WorkforceDepartment[]) || []);
        setEmployees((employeesRes.data as WorkforceEmployee[]) || []);
        setReservations((reservationsRes.data as ReservationRecord[]) || []);
        setEventBookings((eventBookingsRes.data as EventBookingRecord[]) || []);
        setClassBookings((classBookingsRes.data as ClassBookingRecord[]) || []);
        setLogs((logsRes.data as WorkforceLogEntry[]) || []);
        setPunches((punchesRes.data as WorkforcePunch[]) || []);
        setBreaks((breaksRes.data as WorkforceBreak[]) || []);
        setTasks((tasksRes.data as WorkforceTask[]) || []);
        setMenuItems((menuItemsRes.data as MenuItemRecord[]) || []);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const todayKey = new Date().toISOString().slice(0, 10);

  const employeeById = useMemo(
    () =>
      employees.reduce((accumulator, employee) => {
        accumulator[employee.id] = employee;
        return accumulator;
      }, {} as Record<string, WorkforceEmployee>),
    [employees],
  );

  const roleById = useMemo(
    () =>
      roles.reduce((accumulator, role) => {
        accumulator[role.id] = role;
        return accumulator;
      }, {} as Record<string, WorkforceRole>),
    [roles],
  );

  const departmentById = useMemo(
    () =>
      departments.reduce((accumulator, department) => {
        accumulator[department.id] = department;
        return accumulator;
      }, {} as Record<string, WorkforceDepartment>),
    [departments],
  );

  const shiftsToday = useMemo(
    () => shifts.filter((shift) => toDateKey(shift.start_time) === todayKey),
    [shifts, todayKey],
  );

  const scheduleByDepartment = useMemo(() => {
    const grouped: Record<string, WorkforceShift[]> = {};

    shiftsToday.forEach((shift) => {
      const role = roleById[shift.role_id];
      const departmentName = departmentById[String(role?.department_id || '')]?.name || 'Unassigned';
      if (!grouped[departmentName]) grouped[departmentName] = [];
      grouped[departmentName].push(shift);
    });

    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  }, [departmentById, roleById, shiftsToday]);

  const reservationSummary = useMemo(() => {
    const todayReservations = reservations.filter((entry) => entry.reservation_date === todayKey);
    const todayEvents = eventBookings.filter((entry) => entry.event_date === todayKey);
    const todayClasses = classBookings.filter((entry) => (entry.class_date || '') === todayKey);

    const pendingReservations = todayReservations.filter(
      (entry) => String(entry.status || 'pending').toLowerCase() === 'pending',
    ).length;

    return {
      totalDining: todayReservations.length,
      pendingDining: pendingReservations,
      totalEvents: todayEvents.length,
      totalClasses: todayClasses.length,
      totalAll: todayReservations.length + todayEvents.length + todayClasses.length,
    };
  }, [classBookings, eventBookings, reservations, todayKey]);

  const laborSummary = useMemo(() => {
    const scheduledHours = shiftsToday.reduce((total, shift) => {
      const start = new Date(shift.start_time).getTime();
      const end = new Date(shift.end_time).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return total;
      return total + (end - start) / 3600000;
    }, 0);

    const openPunches = punches.filter((punch) => !punch.clock_out);
    const overtimeRisk = openPunches.filter((punch) => {
      const clockIn = new Date(punch.clock_in).getTime();
      if (Number.isNaN(clockIn)) return false;
      return (Date.now() - clockIn) / 3600000 >= 8;
    }).length;

    return {
      scheduledHours,
      openPunches: openPunches.length,
      overtimeRisk,
    };
  }, [punches, shiftsToday]);

  const managerLog = useMemo(
    () =>
      logs
        .slice()
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 6),
    [logs],
  );

  const stationAlerts = useMemo(
    () =>
      tasks.filter((task) => {
        const status = String(task.completion_status || 'open').toLowerCase();
        if (status === 'completed') return false;
        if (task.critical) return true;
        if (!task.due_time) return false;
        return new Date(task.due_time).getTime() < Date.now();
      }),
    [tasks],
  );

  const complianceAlerts = useMemo(() => {
    const alerts: Array<{ title: string; detail: string }> = [];

    punches
      .filter((punch) => !punch.clock_out)
      .forEach((punch) => {
        const clockIn = new Date(punch.clock_in).getTime();
        if (Number.isNaN(clockIn)) return;
        const hours = (Date.now() - clockIn) / 3600000;
        const employeeName = employeeById[punch.employee_id]?.name || 'Employee';
        const punchBreaks = breaks.filter((entry) => entry.punch_id === punch.id);

        if (hours > 5 && punchBreaks.length === 0) {
          alerts.push({
            title: 'Meal Break Missing',
            detail: `${employeeName} has worked ${hours.toFixed(1)}h with no break.`,
          });
        }
      });

    return alerts.slice(0, 8);
  }, [breaks, employeeById, punches]);

  const eightySixItems = useMemo(
    () =>
      menuItems
        .filter((item) => Boolean(item.is_86d || item.eighty_six || item.out_of_stock))
        .slice(0, 10),
    [menuItems],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600" />
      </div>
    );
  }

  const canSeeOperations = canAccessSection(capabilities, 'operations');
  const canSeeWorkforce = canAccessSection(capabilities, 'workforce');

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-none px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Operations Dashboard</h1>
          <p className="text-gray-600 font-garamond">Live view of scheduling, labor, reservations, alerts, and shift handoff intelligence.</p>
        </div>

        {!hasAnySectionAccess(capabilities) && (
          <div className="bg-white border border-gray-100 rounded-lg shadow p-6 text-gray-600">
            No dashboard sections are assigned to your account yet.
          </div>
        )}

        {!canSeeOperations && !canSeeWorkforce && hasAnySectionAccess(capabilities) && (
          <div className="bg-white border border-gray-100 rounded-lg shadow p-6 text-gray-600">
            Operations dashboard widgets are hidden for your account. Enable `Operations` or `Workforce` in Team access.
          </div>
        )}

        {(canSeeOperations || canSeeWorkforce) && (
          <section className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 uppercase tracking-wide">Today&apos;s Schedule</div>
              <div className="text-2xl font-display font-bold text-gray-900">{shiftsToday.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 uppercase tracking-wide">Reservations Total</div>
              <div className="text-2xl font-display font-bold text-gray-900">{reservationSummary.totalAll}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 uppercase tracking-wide">Dining Reservations</div>
              <div className="text-2xl font-display font-bold text-gray-900">{reservationSummary.totalDining}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 uppercase tracking-wide">Event / Party Bookings</div>
              <div className="text-2xl font-display font-bold text-gray-900">{reservationSummary.totalEvents}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 uppercase tracking-wide">Class Reservations</div>
              <div className="text-2xl font-display font-bold text-gray-900">{reservationSummary.totalClasses}</div>
            </div>
          </section>
        )}

        {(canSeeOperations || canSeeWorkforce) && (
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-ocean-600" />
              Today&apos;s Schedule by Department
            </h2>
            <div className="space-y-3">
              {scheduleByDepartment.map(([departmentName, departmentShifts]) => (
                <div key={departmentName} className="border border-gray-100 rounded-lg p-3">
                  <div className="font-semibold text-gray-900 mb-2">{departmentName} ({departmentShifts.length})</div>
                  <div className="space-y-1">
                    {departmentShifts
                      .slice()
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((shift) => (
                        <div key={shift.id} className="text-sm text-gray-700">
                          {employeeById[shift.employee_id]?.name || 'Unassigned'} • {formatTimeWindow(shift.start_time, shift.end_time)}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              {!scheduleByDepartment.length && (
                <div className="text-sm text-gray-500">No shifts scheduled for today.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-ocean-600" />
              Labor Tracking
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase">Scheduled Hours</div>
                <div className="text-lg font-semibold text-gray-900">{laborSummary.scheduledHours.toFixed(1)}h</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase">Clocked In</div>
                <div className="text-lg font-semibold text-gray-900">{laborSummary.openPunches}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase">OT Risk</div>
                <div className="text-lg font-semibold text-amber-700">{laborSummary.overtimeRisk}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Reservation Counts</div>
              <div className="text-sm text-gray-600">Dining pending: {reservationSummary.pendingDining}</div>
              <div className="text-sm text-gray-600">Events today: {reservationSummary.totalEvents}</div>
              <div className="text-sm text-gray-600">Classes today: {reservationSummary.totalClasses}</div>
            </div>
          </div>
        </section>
        )}

        {(canSeeOperations || canSeeWorkforce) && (
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-ocean-600" />
              Manager&apos;s Log
            </h2>
            <div className="space-y-3">
              {managerLog.map((entry) => (
                <div key={entry.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{entry.author_name || 'Manager'}</span>
                    <span className="text-xs text-gray-500">{formatDateTime(entry.timestamp)}</span>
                  </div>
                  <div className="text-xs uppercase text-gray-500 mb-1">{entry.category || 'operations'} • {entry.severity || 'info'}</div>
                  <div className="text-sm text-gray-700">{entry.message}</div>
                </div>
              ))}
              {!managerLog.length && <div className="text-sm text-gray-500">No manager log entries yet.</div>}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Station Alerts
            </h2>
            <div className="space-y-3">
              {stationAlerts.slice(0, 8).map((alert) => (
                <div key={alert.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-900">{alert.title}</div>
                  <div className="text-xs text-gray-500">Due {formatDateTime(alert.due_time)}</div>
                </div>
              ))}
              {!stationAlerts.length && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
                  No active station alerts.
                </div>
              )}
            </div>
          </div>
        </section>
        )}

        {(canSeeOperations || canSeeWorkforce) && (
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              Compliance Alerts
            </h2>
            <div className="space-y-2">
              {complianceAlerts.map((alert, index) => (
                <div key={`${alert.title}-${index}`} className="border border-gray-100 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-900">{alert.title}</div>
                  <div className="text-sm text-gray-700">{alert.detail}</div>
                </div>
              ))}
              {!complianceAlerts.length && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
                  No compliance alerts right now.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-ocean-600" />
              86&apos;d Items
            </h2>
            <div className="space-y-2">
              {eightySixItems.map((item) => (
                <div key={item.id} className="border border-gray-100 rounded-lg p-3 text-sm text-gray-800">
                  {item.name}
                </div>
              ))}
              {!eightySixItems.length && <div className="text-sm text-gray-500">No 86&apos;d items currently marked.</div>}
            </div>
          </div>
        </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
