import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PauseCircle,
  PlayCircle,
  Plus,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  canAccessSection,
  derivePortalCapabilities,
  getRoleIdsForUser,
  getTeamMemberForUser,
  hasAnySectionAccess,
  type PortalCapabilities,
} from '../../lib/bohRoles';
import { calculateCaliforniaLaborSummary } from '../../lib/caLabor';

interface WorkforceShift {
  id: string;
  employee_id: string;
  role_id: string;
  location_id?: string;
  station_id?: string | null;
  start_time: string;
  end_time: string;
  wage_rate?: number;
  status?: string;
}

interface WorkforceRole {
  id: string;
  name: string;
  department_id?: string;
  hourly_rate?: number;
}

interface WorkforceStation {
  id: string;
  name: string;
}

interface WorkforceEmployeeRole {
  id: string;
  employee_id: string;
  role_id: string;
  hourly_rate?: number;
  primary_role?: boolean;
  active?: boolean;
}

interface WorkforceDepartment {
  id: string;
  name: string;
}

interface WorkforceEmployee {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  title?: string;
}

interface WorkforcePunch {
  id: string;
  employee_id: string;
  shift_id: string;
  clock_in: string;
  clock_out?: string | null;
  status?: string;
}

interface WorkforceBreak {
  id: string;
  punch_id: string;
  start_time: string;
  end_time?: string | null;
  break_type?: string | null;
  paid_break?: boolean;
  expected_minutes?: number | null;
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

const startOfWeek = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
};

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState(false);
  const [capabilities, setCapabilities] = useState<PortalCapabilities>(EMPTY_CAPABILITIES);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName, setCurrentUserName] = useState('Manager');
  const [shifts, setShifts] = useState<WorkforceShift[]>([]);
  const [roles, setRoles] = useState<WorkforceRole[]>([]);
  const [stations, setStations] = useState<WorkforceStation[]>([]);
  const [employeeRoles, setEmployeeRoles] = useState<WorkforceEmployeeRole[]>([]);
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
  const [showLogEntryForm, setShowLogEntryForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEightySixForm, setShowEightySixForm] = useState(false);
  const [logDraft, setLogDraft] = useState({
    category: 'operations',
    severity: 'info',
    message: '',
  });
  const [eightySixDraft, setEightySixDraft] = useState({
    item_id: '',
    note: '',
  });
  const [taskDraft, setTaskDraft] = useState({
    title: '',
    assigned_role_id: '',
    station_id: '',
    due_date: new Date().toISOString().slice(0, 10),
    due_time: '18:00',
    critical: false,
  });

  const loadDashboardData = useCallback(
    async (userId: string, userEmail = '') => {
      const roleIds = await getRoleIdsForUser(userId);
      const teamMember = await getTeamMemberForUser(userId);
      const nextCapabilities = derivePortalCapabilities(roleIds, teamMember);

      const [
        shiftsRes,
        rolesRes,
        stationsRes,
        employeeRolesRes,
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
        supabase.from('workforce_stations').select('*').order('name'),
        supabase.from('workforce_employee_roles').select('*').order('created_at'),
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

      setCapabilities(nextCapabilities);
      setShifts((shiftsRes.data as WorkforceShift[]) || []);
      setRoles((rolesRes.data as WorkforceRole[]) || []);
      setStations((stationsRes.data as WorkforceStation[]) || []);
      setEmployeeRoles((employeeRolesRes.data as WorkforceEmployeeRole[]) || []);
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
      setCurrentUserName(teamMember?.name || userEmail || 'Manager');
    },
    [],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) return;
        if (!active) return;

        setCurrentUserId(session.user.id);
        setCurrentUserEmail(String(session.user.email || ''));
        await loadDashboardData(session.user.id, String(session.user.email || ''));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [loadDashboardData]);

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const currentWeekStart = useMemo(() => startOfWeek(today), [todayKey]);
  const currentWeekEnd = useMemo(() => addDays(currentWeekStart, 7), [currentWeekStart]);

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

  const stationById = useMemo(
    () =>
      stations.reduce((accumulator, station) => {
        accumulator[station.id] = station;
        return accumulator;
      }, {} as Record<string, WorkforceStation>),
    [stations],
  );

  const departmentById = useMemo(
    () =>
      departments.reduce((accumulator, department) => {
        accumulator[department.id] = department;
        return accumulator;
      }, {} as Record<string, WorkforceDepartment>),
    [departments],
  );

  const employeeRoleAssignmentsByEmployeeId = useMemo(
    () =>
      employeeRoles.reduce((accumulator, assignment) => {
        if (!assignment.employee_id) return accumulator;
        if (!accumulator[assignment.employee_id]) {
          accumulator[assignment.employee_id] = [];
        }
        accumulator[assignment.employee_id].push(assignment);
        return accumulator;
      }, {} as Record<string, WorkforceEmployeeRole[]>),
    [employeeRoles],
  );

  useEffect(() => {
    if (!taskDraft.assigned_role_id && roles.length > 0) {
      setTaskDraft((current) => ({ ...current, assigned_role_id: roles[0].id }));
    }

    if (!taskDraft.station_id && stations.length > 0) {
      setTaskDraft((current) => ({ ...current, station_id: stations[0].id }));
    }
  }, [roles, stations, taskDraft.assigned_role_id, taskDraft.station_id]);

  const roleRateByEmployeeIdRoleId = useMemo(
    () =>
      employeeRoles.reduce((accumulator, assignment) => {
        if (!assignment.employee_id || !assignment.role_id) return accumulator;
        if (!accumulator[assignment.employee_id]) {
          accumulator[assignment.employee_id] = {};
        }
        accumulator[assignment.employee_id][assignment.role_id] = Number(
          assignment.hourly_rate ?? roleById[assignment.role_id]?.hourly_rate ?? 0,
        );
        return accumulator;
      }, {} as Record<string, Record<string, number>>),
    [employeeRoles, roleById],
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

  const openPunches = useMemo(() => punches.filter((punch) => !punch.clock_out), [punches]);

  const laborSummary = useMemo(() => {
    const scheduledHours = shiftsToday.reduce((total, shift) => {
      const start = new Date(shift.start_time).getTime();
      const end = new Date(shift.end_time).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return total;
      return total + (end - start) / 3600000;
    }, 0);

    const overtimeRisk = openPunches.filter((punch) => {
      const clockIn = new Date(punch.clock_in).getTime();
      if (Number.isNaN(clockIn)) return false;
      return (Date.now() - clockIn) / 3600000 >= 8;
    }).length;

    const weeklyPunches = punches.filter((punch) => {
      const startsAt = new Date(punch.clock_in).getTime();
      if (Number.isNaN(startsAt)) return false;
      return startsAt >= currentWeekStart.getTime() && startsAt < currentWeekEnd.getTime();
    });

    const caSummary = calculateCaliforniaLaborSummary(
      weeklyPunches.map((punch) => {
        const shift = shifts.find((candidate) => candidate.id === punch.shift_id);
        const roleRate = shift?.role_id ? Number(roleById[shift.role_id]?.hourly_rate || 0) : 0;
        const assignedRoleRate =
          shift?.employee_id && shift?.role_id
            ? Number(roleRateByEmployeeIdRoleId[shift.employee_id]?.[shift.role_id] || 0)
            : 0;
        const rate = Number(shift?.wage_rate || assignedRoleRate || roleRate || 0);

        return {
          id: punch.id,
          employee_id: punch.employee_id,
          clock_in: punch.clock_in,
          clock_out: punch.clock_out,
          rate,
          breaks: breaks.filter((entry) => entry.punch_id === punch.id),
        };
      }),
      new Date(),
    );

    return {
      scheduledHours,
      openPunches: openPunches.length,
      overtimeRisk,
      caSummary,
    };
  }, [breaks, currentWeekEnd, currentWeekStart, openPunches, punches, roleById, roleRateByEmployeeIdRoleId, shifts, shiftsToday]);

  const managerLog = useMemo(
    () =>
      logs
        .slice()
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 8),
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

    openPunches.forEach((punch) => {
      const clockIn = new Date(punch.clock_in).getTime();
      if (Number.isNaN(clockIn)) return;
      const hours = (Date.now() - clockIn) / 3600000;
      const employeeName = employeeById[punch.employee_id]?.name || 'Employee';
      const punchBreaks = breaks.filter((entry) => entry.punch_id === punch.id);
      const hasMealBreak = punchBreaks.some((entry) => {
        const explicitUnpaid = entry.paid_break === false;
        const type = String(entry.break_type || '').toLowerCase();
        if (explicitUnpaid || type.includes('meal') || type.includes('unpaid')) return true;
        if (entry.expected_minutes !== undefined && entry.expected_minutes !== null) {
          return Number(entry.expected_minutes) >= 30;
        }
        const startMs = new Date(entry.start_time).getTime();
        const endMs = new Date(entry.end_time || new Date().toISOString()).getTime();
        if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return false;
        return (endMs - startMs) / 60000 >= 30;
      });

      if (hours > 5 && !hasMealBreak) {
        alerts.push({
          title: 'Meal Break Missing',
          detail: `${employeeName} has worked ${hours.toFixed(1)}h with no unpaid meal break.`,
        });
      }
    });

    return alerts.slice(0, 8);
  }, [breaks, employeeById, openPunches]);

  const eightySixItems = useMemo(
    () =>
      menuItems
        .filter((item) => Boolean(item.is_86d || item.eighty_six || item.out_of_stock))
        .slice(0, 16),
    [menuItems],
  );

  const availableEightySixItems = useMemo(
    () =>
      menuItems.filter(
        (item) => !Boolean(item.is_86d || item.eighty_six || item.out_of_stock),
      ),
    [menuItems],
  );

  const myEmployee = useMemo(
    () => employees.find((employee) => String(employee.user_id || '') === currentUserId) || null,
    [currentUserId, employees],
  );

  const myShiftsToday = useMemo(() => {
    if (!myEmployee) return [];
    return shiftsToday
      .filter((shift) => shift.employee_id === myEmployee.id)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [myEmployee, shiftsToday]);

  const myOpenPunch = useMemo(() => {
    if (!myEmployee) return null;
    return (
      punches
        .filter((punch) => punch.employee_id === myEmployee.id && !punch.clock_out)
        .sort((a, b) => b.clock_in.localeCompare(a.clock_in))[0] || null
    );
  }, [myEmployee, punches]);

  const myOpenBreak = useMemo(() => {
    if (!myOpenPunch) return null;
    return (
      breaks
        .filter((entry) => entry.punch_id === myOpenPunch.id && !entry.end_time)
        .sort((a, b) => b.start_time.localeCompare(a.start_time))[0] || null
    );
  }, [breaks, myOpenPunch]);

  const myCurrentShift = useMemo(() => {
    if (myOpenPunch) {
      return shifts.find((shift) => shift.id === myOpenPunch.shift_id) || null;
    }
    return myShiftsToday[0] || null;
  }, [myOpenPunch, myShiftsToday, shifts]);

  const refreshAfterAction = useCallback(async () => {
    if (!currentUserId) return;
    await loadDashboardData(currentUserId, currentUserEmail);
  }, [currentUserEmail, currentUserId, loadDashboardData]);

  const createManagerLogEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!logDraft.message.trim()) {
      alert('Log message is required.');
      return;
    }

    setSavingAction(true);
    try {
      const { error } = await supabase.from('workforce_log_entries').insert([
        {
          author_name: currentUserName || currentUserEmail || 'Manager',
          timestamp: new Date().toISOString(),
          location_id: 'wf_loc_main',
          category: logDraft.category,
          severity: logDraft.severity,
          message: logDraft.message.trim(),
        },
      ]);
      if (error) throw error;

      setLogDraft((current) => ({ ...current, message: '' }));
      setShowLogEntryForm(false);
      await refreshAfterAction();
    } catch (error) {
      alert(`Failed to add manager log entry: ${(error as Error).message}`);
    } finally {
      setSavingAction(false);
    }
  };

  const createStationTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskDraft.title.trim()) {
      alert('Task title is required.');
      return;
    }

    const dueTime = `${taskDraft.due_date}T${taskDraft.due_time}:00`;

    setSavingAction(true);
    try {
      const { error } = await supabase.from('workforce_tasks').insert([
        {
          title: taskDraft.title.trim(),
          assigned_role_id: taskDraft.assigned_role_id || null,
          location_id: 'wf_loc_main',
          station_id: taskDraft.station_id || null,
          due_time: dueTime,
          completion_status: 'open',
          critical: taskDraft.critical,
        },
      ]);
      if (error) throw error;

      setTaskDraft((current) => ({ ...current, title: '', critical: false }));
      setShowTaskForm(false);
      await refreshAfterAction();
    } catch (error) {
      alert(`Failed to create task: ${(error as Error).message}`);
    } finally {
      setSavingAction(false);
    }
  };

  const completeStationTask = async (task: WorkforceTask) => {
    if (String(task.completion_status || '').toLowerCase() === 'completed') return;

    setSavingAction(true);
    try {
      const { error } = await supabase
        .from('workforce_tasks')
        .update({
          completion_status: 'completed',
          completed_by: currentUserName || currentUserEmail || 'Manager',
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.id);
      if (error) throw error;

      await refreshAfterAction();
    } catch (error) {
      alert(`Failed to complete task: ${(error as Error).message}`);
    } finally {
      setSavingAction(false);
    }
  };

  const markItemEightySix = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eightySixDraft.item_id) {
      alert('Select an item to mark 86d.');
      return;
    }

    const item = menuItems.find((entry) => entry.id === eightySixDraft.item_id);
    if (!item) return;

    setSavingAction(true);
    try {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({
          is_86d: true,
          eighty_six: true,
          out_of_stock: true,
        })
        .eq('id', item.id);
      if (updateError) throw updateError;

      const note = eightySixDraft.note.trim();
      await supabase.from('workforce_log_entries').insert([
        {
          author_name: currentUserName || currentUserEmail || 'Manager',
          timestamp: new Date().toISOString(),
          location_id: 'wf_loc_main',
          category: 'inventory',
          severity: 'warning',
          message: `86'd item: ${item.name}${note ? ` - ${note}` : ''}`,
        },
      ]);

      setEightySixDraft({ item_id: '', note: '' });
      setShowEightySixForm(false);
      await refreshAfterAction();
    } catch (error) {
      alert(`Failed to mark item 86d: ${(error as Error).message}`);
    } finally {
      setSavingAction(false);
    }
  };

  const clearEightySix = async (item: MenuItemRecord) => {
    setSavingAction(true);
    try {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({
          is_86d: false,
          eighty_six: false,
          out_of_stock: false,
        })
        .eq('id', item.id);
      if (updateError) throw updateError;

      await supabase.from('workforce_log_entries').insert([
        {
          author_name: currentUserName || currentUserEmail || 'Manager',
          timestamp: new Date().toISOString(),
          location_id: 'wf_loc_main',
          category: 'inventory',
          severity: 'info',
          message: `Returned to stock: ${item.name}`,
        },
      ]);

      await refreshAfterAction();
    } catch (error) {
      alert(`Failed to clear 86 status: ${(error as Error).message}`);
    } finally {
      setSavingAction(false);
    }
  };

  const ensureShiftForClockIn = async () => {
    if (!myEmployee) throw new Error('No workforce profile is linked to this login.');

    if (myCurrentShift) {
      return myCurrentShift;
    }

    const myAssignments = (employeeRoleAssignmentsByEmployeeId[myEmployee.id] || []).filter(
      (assignment) => assignment.active !== false,
    );
    const primaryAssignment =
      myAssignments.find((assignment) => Boolean(assignment.primary_role)) || myAssignments[0];
    const roleId = primaryAssignment?.role_id || roles[0]?.id || 'wf_role_server';
    const roleRate =
      Number(primaryAssignment?.hourly_rate || roleById[roleId]?.hourly_rate || 24);
    const now = new Date();
    const end = addDays(now, 0);
    end.setHours(now.getHours() + 8);

    const { data, error } = await supabase
      .from('workforce_shifts')
      .insert([
        {
          employee_id: myEmployee.id,
          role_id: roleId,
          location_id: 'wf_loc_main',
          station_id: null,
          start_time: now.toISOString(),
          end_time: end.toISOString(),
          break_rules: 'ca_standard',
          wage_rate: roleRate,
          status: 'in_progress',
        },
      ])
      .select('*')
      .single();

    if (error) throw error;
    return data as WorkforceShift;
  };

  const clockIn = async () => {
    if (!myEmployee) {
      alert('No workforce profile is linked to this login.');
      return;
    }
    if (myOpenPunch) return;

    setSavingAction(true);
    try {
      const shift = await ensureShiftForClockIn();
      const { error } = await supabase.from('workforce_punches').insert([
        {
          employee_id: myEmployee.id,
          shift_id: shift.id,
          clock_in: new Date().toISOString(),
          status: 'open',
          verified_location: true,
          verified_photo: false,
        },
      ]);
      if (error) throw error;

      await supabase.from('workforce_shifts').update({ status: 'in_progress' }).eq('id', shift.id);
      await refreshAfterAction();
    } catch (error) {
      alert(`Clock in failed: ${(error as Error).message}`);
    } finally {
      setSavingAction(false);
    }
  };

  const clockOut = async () => {
    if (!myOpenPunch) return;

    setSavingAction(true);
    try {
      if (myOpenBreak) {
        await supabase
          .from('workforce_breaks')
          .update({ end_time: new Date().toISOString() })
          .eq('id', myOpenBreak.id);
      }

      const { error } = await supabase
        .from('workforce_punches')
        .update({ clock_out: new Date().toISOString(), status: 'closed' })
        .eq('id', myOpenPunch.id);
      if (error) throw error;

      await supabase.from('workforce_shifts').update({ status: 'completed' }).eq('id', myOpenPunch.shift_id);
      await refreshAfterAction();
    } catch (error) {
      alert(`Clock out failed: ${(error as Error).message}`);
    } finally {
      setSavingAction(false);
    }
  };

  const startBreak = async (type: 'rest_15_paid' | 'meal_30_unpaid') => {
    if (!myOpenPunch) {
      alert('Clock in before starting a break.');
      return;
    }
    if (myOpenBreak) {
      alert('End the current break first.');
      return;
    }

    const expectedMinutes = type === 'rest_15_paid' ? 15 : 30;
    const paidBreak = type === 'rest_15_paid';

    setSavingAction(true);
    try {
      const { error } = await supabase.from('workforce_breaks').insert([
        {
          punch_id: myOpenPunch.id,
          start_time: new Date().toISOString(),
          break_type: type,
          expected_minutes: expectedMinutes,
          paid_break: paidBreak,
        },
      ]);
      if (error) throw error;
      await refreshAfterAction();
    } catch (error) {
      alert(`Failed to start break: ${(error as Error).message}`);
    } finally {
      setSavingAction(false);
    }
  };

  const endBreak = async () => {
    if (!myOpenBreak) return;

    setSavingAction(true);
    try {
      const { error } = await supabase
        .from('workforce_breaks')
        .update({ end_time: new Date().toISOString() })
        .eq('id', myOpenBreak.id);
      if (error) throw error;
      await refreshAfterAction();
    } catch (error) {
      alert(`Failed to end break: ${(error as Error).message}`);
    } finally {
      setSavingAction(false);
    }
  };

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
          <h1 className="text-3xl font-display font-bold text-gray-900">Nest</h1>
          <p className="text-gray-600 font-garamond">Live view of scheduling, labor, reservations, alerts, and shift handoff intelligence.</p>
        </div>

        {!hasAnySectionAccess(capabilities) && (
          <div className="bg-white border border-gray-100 rounded-lg shadow p-6 text-gray-600">
            No dashboard sections are assigned to your account yet.
          </div>
        )}

        {!canSeeOperations && !canSeeWorkforce && hasAnySectionAccess(capabilities) && (
          <div className="bg-white border border-gray-100 rounded-lg shadow p-6 text-gray-600">
            Operations dashboard widgets are hidden for your account. Enable Operations or Workforce access in Team.
          </div>
        )}

        {(canSeeOperations || canSeeWorkforce) && (
          <section className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-display font-bold text-gray-900 flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-ocean-600" />
                My Time Clock
              </h2>
              {myEmployee && (
                <div className="text-sm text-gray-500">
                  {myEmployee.name} {myEmployee.title ? `• ${myEmployee.title}` : ''}
                </div>
              )}
            </div>

            {!myEmployee && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                This login is not linked to a workforce employee profile yet.
              </div>
            )}

            {myEmployee && (
              <>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-gray-100 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Current Shift</div>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {myCurrentShift
                        ? formatTimeWindow(myCurrentShift.start_time, myCurrentShift.end_time)
                        : 'No shift found'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Clock Status</div>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {myOpenPunch ? 'Clocked In' : 'Clocked Out'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Break Status</div>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {myOpenBreak
                        ? `On break (${String(myOpenBreak.break_type || '').includes('15') ? '15 paid' : '30 unpaid'})`
                        : 'Not on break'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!myOpenPunch ? (
                    <button
                      type="button"
                      onClick={() => void clockIn()}
                      disabled={savingAction}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Clock In
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void clockOut()}
                      disabled={savingAction}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      <PauseCircle className="h-4 w-4" />
                      Clock Out
                    </button>
                  )}

                  {myOpenPunch && !myOpenBreak && (
                    <>
                      <button
                        type="button"
                        onClick={() => void startBreak('rest_15_paid')}
                        disabled={savingAction}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-ocean-200 text-ocean-700 hover:bg-ocean-50 disabled:opacity-60"
                      >
                        15m Paid Break
                      </button>
                      <button
                        type="button"
                        onClick={() => void startBreak('meal_30_unpaid')}
                        disabled={savingAction}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        30m Unpaid Break
                      </button>
                    </>
                  )}

                  {myOpenBreak && (
                    <button
                      type="button"
                      onClick={() => void endBreak()}
                      disabled={savingAction}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      End Break
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
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
                    <div className="font-semibold text-gray-900 mb-2">
                      {departmentName} ({departmentShifts.length})
                    </div>
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

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">CA Labor Cost (Week)</div>
                  <div className="font-semibold text-gray-900">${laborSummary.caSummary.totalCost.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">CA OT / DT (Week)</div>
                  <div className="font-semibold text-gray-900">
                    {laborSummary.caSummary.overtimeHours.toFixed(1)}h / {laborSummary.caSummary.doubleTimeHours.toFixed(1)}h
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-4">
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-display font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-ocean-600" />
                  Manager&apos;s Log
                </h2>
                <button
                  type="button"
                  onClick={() => setShowLogEntryForm((current) => !current)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-ocean-200 rounded-md text-ocean-700 hover:bg-ocean-50 text-sm"
                >
                  <PlayCircle className="h-4 w-4" />
                  Add Entry
                </button>
              </div>

              {showLogEntryForm && (
                <form onSubmit={(event) => void createManagerLogEntry(event)} className="mb-4 grid gap-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={logDraft.category}
                      onChange={(event) => setLogDraft((current) => ({ ...current, category: event.target.value }))}
                      className="px-3 py-2 border rounded-lg"
                    >
                      <option value="operations">Operations</option>
                      <option value="incident">Incident</option>
                      <option value="inventory">Inventory</option>
                      <option value="safety">Safety</option>
                      <option value="staffing">Staffing</option>
                    </select>
                    <select
                      value={logDraft.severity}
                      onChange={(event) => setLogDraft((current) => ({ ...current, severity: event.target.value }))}
                      className="px-3 py-2 border rounded-lg"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <textarea
                    rows={3}
                    value={logDraft.message}
                    onChange={(event) => setLogDraft((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Add manager handoff notes, incidents, maintenance updates, 86 notices..."
                    className="px-3 py-2 border rounded-lg"
                    required
                  />
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="px-3 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-60"
                  >
                    Save Entry
                  </button>
                </form>
              )}

              <div className="space-y-3">
                {managerLog.map((entry) => (
                  <div key={entry.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{entry.author_name || 'Manager'}</span>
                      <span className="text-xs text-gray-500">{formatDateTime(entry.timestamp)}</span>
                    </div>
                    <div className="text-xs uppercase text-gray-500 mb-1">
                      {entry.category || 'operations'} • {entry.severity || 'info'}
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-line">{entry.message}</div>
                  </div>
                ))}
                {!managerLog.length && <div className="text-sm text-gray-500">No manager log entries yet.</div>}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-display font-bold text-gray-900 flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-ocean-600" />
                    Station Tasks
                  </h2>
                  <div className="text-xs text-gray-500 mt-1">Open alerts: {stationAlerts.length}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTaskForm((current) => !current)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-ocean-200 rounded-md text-ocean-700 hover:bg-ocean-50 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </button>
              </div>

              {showTaskForm && (
                <form onSubmit={(event) => void createStationTask(event)} className="grid grid-cols-1 gap-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <input
                    value={taskDraft.title}
                    onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Task title"
                    className="px-3 py-2 border rounded-lg"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={taskDraft.assigned_role_id}
                      onChange={(event) => setTaskDraft((current) => ({ ...current, assigned_role_id: event.target.value }))}
                      className="px-3 py-2 border rounded-lg"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={taskDraft.station_id}
                      onChange={(event) => setTaskDraft((current) => ({ ...current, station_id: event.target.value }))}
                      className="px-3 py-2 border rounded-lg"
                    >
                      {stations.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={taskDraft.due_date}
                      onChange={(event) => setTaskDraft((current) => ({ ...current, due_date: event.target.value }))}
                      className="px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="time"
                      value={taskDraft.due_time}
                      onChange={(event) => setTaskDraft((current) => ({ ...current, due_time: event.target.value }))}
                      className="px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={taskDraft.critical}
                      onChange={(event) => setTaskDraft((current) => ({ ...current, critical: event.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    Critical task
                  </label>
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="px-3 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-60"
                  >
                    Save Task
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {tasks
                  .slice()
                  .sort((a, b) => String(a.due_time || '').localeCompare(String(b.due_time || '')))
                  .slice(0, 12)
                  .map((task) => {
                    const completed = String(task.completion_status || '').toLowerCase() === 'completed';
                    const isAlert = stationAlerts.some((alert) => alert.id === task.id);
                    return (
                      <div key={task.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between gap-3">
                        <div>
                          <div className={`text-sm font-medium ${completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {task.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {roleById[task.assigned_role_id || '']?.name || 'Role'} • {stationById[task.station_id || '']?.name || 'Station'}
                          </div>
                          <div className="text-xs text-gray-500">Due {formatDateTime(task.due_time)}</div>
                          {isAlert && !completed && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              <AlertTriangle className="h-3 w-3" />
                              Alert
                            </div>
                          )}
                        </div>
                        {!completed ? (
                          <button
                            type="button"
                            onClick={() => void completeStationTask(task)}
                            disabled={savingAction}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-green-200 rounded-md text-green-700 hover:bg-green-50 text-sm disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Complete
                          </button>
                        ) : (
                          <span className="text-sm text-green-700">Done</span>
                        )}
                      </div>
                    );
                  })}
                {!tasks.length && <div className="text-sm text-gray-500">No station tasks yet.</div>}
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-display font-bold text-gray-900 flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-ocean-600" />
                  86&apos;d Items
                </h2>
                <button
                  type="button"
                  onClick={() => setShowEightySixForm((current) => !current)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-ocean-200 rounded-md text-ocean-700 hover:bg-ocean-50 text-sm"
                >
                  <Ban className="h-4 w-4" />
                  Add 86
                </button>
              </div>

              {showEightySixForm && (
                <form onSubmit={(event) => void markItemEightySix(event)} className="mb-4 grid gap-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <select
                    value={eightySixDraft.item_id}
                    onChange={(event) => setEightySixDraft((current) => ({ ...current, item_id: event.target.value }))}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select item to 86</option>
                    {availableEightySixItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={eightySixDraft.note}
                    onChange={(event) => setEightySixDraft((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Optional reason or note"
                    className="px-3 py-2 border rounded-lg"
                  />
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                  >
                    Save 86 Entry
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {eightySixItems.map((item) => (
                  <div key={item.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-800">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => void clearEightySix(item)}
                      disabled={savingAction}
                      className="inline-flex items-center gap-1 px-2 py-1 border border-green-200 rounded-md text-green-700 hover:bg-green-50 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Clear
                    </button>
                  </div>
                ))}
                {!eightySixItems.length && (
                  <div className="text-sm text-gray-500">No 86&apos;d items currently marked.</div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
