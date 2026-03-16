import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Edit2,
  FileText,
  Mail,
  MessageSquareText,
  NotebookPen,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
  Users,
} from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { calculateCaliforniaLaborSummary } from '../../lib/caLabor';

interface WorkforceEmployee {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  status: 'active' | 'inactive' | string;
  default_location_id: string;
  hire_date?: string;
  pay_basis?: string;
  hourly_rate?: number;
  availability?: string;
  login_username?: string;
  login_password?: string;
  attendance_score?: number;
}

interface TeamMemberPermissions {
  id: string;
  user_id: string;
  email: string;
  name: string;
  title: string;
  portal?: string;
  can_view_reservations: boolean;
  can_view_events_parties: boolean;
  can_view_classes: boolean;
  can_access_menu_management: boolean;
  can_access_operations: boolean;
  can_access_workforce: boolean;
  can_access_content_management: boolean;
  can_access_career_management: boolean;
  can_access_investment: boolean;
  can_access_settings: boolean;
  operations_classes_read_only: boolean;
  active: boolean;
}

interface WorkforceEmployeeDocument {
  id: string;
  employee_id: string;
  doc_type: string;
  file_name: string;
  file_path: string;
  public_url: string;
  notes?: string;
  uploaded_at?: string;
  created_at?: string;
}

interface WorkforceRole {
  id: string;
  name: string;
  hourly_rate?: number;
  department_id?: string;
}

interface WorkforceStation {
  id: string;
  name: string;
  department_id?: string;
}

interface WorkforceShift {
  id: string;
  employee_id: string;
  role_id: string;
  location_id: string;
  station_id?: string;
  start_time: string;
  end_time: string;
  wage_rate?: number;
  status?: string;
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

interface WorkforceEmployeeRoleAssignment {
  id: string;
  employee_id: string;
  role_id: string;
  hourly_rate?: number;
  primary_role?: boolean;
  active?: boolean;
  created_at?: string;
}

interface WorkforceTask {
  id: string;
  title: string;
  assigned_role_id?: string;
  station_id?: string;
  due_time?: string;
  completion_status?: string;
  critical?: boolean;
  completed_by?: string;
  completed_at?: string;
}

interface WorkforceLogEntry {
  id: string;
  author_name?: string;
  timestamp: string;
  category?: string;
  severity?: string;
  message: string;
}

interface WorkforceEvent {
  id: string;
  event_type: string;
  actor_id?: string;
  subject_type?: string;
  subject_id?: string;
  timestamp: string;
  metadata_json?: string;
}

interface WorkforceScheduleTemplate {
  id: string;
  name: string;
  location_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface WorkforceScheduleTemplateShift {
  id: string;
  template_id: string;
  day_offset: number;
  employee_id: string;
  role_id: string;
  station_id?: string;
  start_time: string;
  end_time: string;
  wage_rate?: number;
}

interface WorkforceTimeOffRequest {
  id: string;
  employee_id: string;
  request_type: 'sick' | 'day_off' | 'pto' | string;
  start_date: string;
  end_date: string;
  hours?: number;
  status?: 'pending' | 'approved' | 'denied' | string;
  notes?: string;
  created_at?: string;
}

interface WorkforcePtoBalance {
  id: string;
  employee_id: string;
  accrued_hours?: number;
  used_hours?: number;
  available_hours?: number;
  updated_at?: string;
}

type ScheduleViewMode = 'week' | 'day';

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

const formatHours = (value: number) => `${value.toFixed(1)}h`;

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateKey = (value: Date) => {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().slice(0, 10);
};

const fromDateKey = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const startOfWeek = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
};

const clampDate = (value: Date, minDate: Date, maxDate: Date) => {
  if (value.getTime() < minDate.getTime()) return new Date(minDate);
  if (value.getTime() > maxDate.getTime()) return new Date(maxDate);
  return value;
};

const extractTimePart = (dateTimeValue: string) => {
  const value = String(dateTimeValue || '').trim();
  if (!value) return '00:00:00';
  if (value.includes('T')) {
    return value.split('T')[1].slice(0, 8).padEnd(8, '0');
  }
  return value.slice(0, 8).padEnd(8, '0');
};

const toTimeLabel = (dateTimeValue: string) => extractTimePart(dateTimeValue).slice(0, 5);

const toMinutes = (timeValue: string) => {
  const [hours, minutes] = timeValue.split(':');
  return Number(hours || 0) * 60 + Number(minutes || 0);
};

const toDateTime = (dateKey: string, timeValue: string) => `${dateKey}T${extractTimePart(timeValue)}`;

const shiftDurationMinutes = (shift: WorkforceShift) => {
  const startMinutes = toMinutes(toTimeLabel(shift.start_time));
  const endMinutes = toMinutes(toTimeLabel(shift.end_time));
  if (endMinutes > startMinutes) {
    return endMinutes - startMinutes;
  }
  return endMinutes + 24 * 60 - startMinutes;
};

const formatDateShort = (value: Date) =>
  value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

const formatDateHeader = (value: Date) =>
  value.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

const buildEmployeeDraft = (roleId = '', hourlyRate = '24') => ({
  name: '',
  email: '',
  phone: '',
  title: '',
  role_id: roleId,
  hourly_rate: hourlyRate,
  hire_date: new Date().toISOString().slice(0, 10),
  availability: 'Open availability',
  login_username: '',
  login_password: '',
  pto_accrued_hours: '80',
  pto_used_hours: '0',
  pto_available_hours: '80',
  can_access_menu_management: false,
  can_access_operations: true,
  can_access_workforce: true,
  can_access_content_management: false,
  can_access_career_management: false,
  can_access_investment: false,
  can_access_settings: false,
  can_view_reservations: false,
  can_view_events_parties: false,
  can_view_classes: false,
  operations_classes_read_only: false,
  active: true,
});

const buildRoleRateDraft = (
  roleId = '',
  hourlyRate = '24',
  primaryRole = false,
) => ({
  id: `role_draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  role_id: roleId,
  hourly_rate: hourlyRate,
  primary_role: primaryRole,
  active: true,
});

const WorkforceManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employees, setEmployees] = useState<WorkforceEmployee[]>([]);
  const [employeeRoles, setEmployeeRoles] = useState<WorkforceEmployeeRoleAssignment[]>([]);
  const [roles, setRoles] = useState<WorkforceRole[]>([]);
  const [stations, setStations] = useState<WorkforceStation[]>([]);
  const [shifts, setShifts] = useState<WorkforceShift[]>([]);
  const [punches, setPunches] = useState<WorkforcePunch[]>([]);
  const [breaks, setBreaks] = useState<WorkforceBreak[]>([]);
  const [tasks, setTasks] = useState<WorkforceTask[]>([]);
  const [logEntries, setLogEntries] = useState<WorkforceLogEntry[]>([]);
  const [events, setEvents] = useState<WorkforceEvent[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberPermissions[]>([]);
  const [employeeDocuments, setEmployeeDocuments] = useState<WorkforceEmployeeDocument[]>([]);
  const [scheduleTemplates, setScheduleTemplates] = useState<WorkforceScheduleTemplate[]>([]);
  const [scheduleTemplateShifts, setScheduleTemplateShifts] = useState<WorkforceScheduleTemplateShift[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<WorkforceTimeOffRequest[]>([]);
  const [ptoBalances, setPtoBalances] = useState<WorkforcePtoBalance[]>([]);

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<WorkforceEmployee | null>(null);
  const [employeeEditorMode, setEmployeeEditorMode] = useState<'create' | 'edit'>('edit');
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const [actorUserId, setActorUserId] = useState('system');
  const [actorName, setActorName] = useState('Manager');
  const [scheduleView, setScheduleView] = useState<ScheduleViewMode>('week');
  const [scheduleAnchorDate, setScheduleAnchorDate] = useState(startOfToday());
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [draggingShiftId, setDraggingShiftId] = useState<string | null>(null);

  const [employeeDraft, setEmployeeDraft] = useState(() => buildEmployeeDraft());
  const [employeeRoleDrafts, setEmployeeRoleDrafts] = useState<Array<ReturnType<typeof buildRoleRateDraft>>>([]);

  const [documentDraft, setDocumentDraft] = useState({
    doc_type: 'ID Scan',
    notes: '',
  });

  const [shiftDraft, setShiftDraft] = useState({
    employee_id: '',
    role_id: '',
    station_id: '',
    date: new Date().toISOString().slice(0, 10),
    start_time: '17:00',
    end_time: '23:00',
    wage_rate: '',
  });

  const [taskDraft, setTaskDraft] = useState({
    title: '',
    assigned_role_id: '',
    station_id: '',
    due_date: new Date().toISOString().slice(0, 10),
    due_time: '18:00',
    critical: false,
  });

  const [logDraft, setLogDraft] = useState({
    category: 'operations',
    severity: 'info',
    message: '',
  });

  const [timeOffDraft, setTimeOffDraft] = useState({
    employee_id: '',
    request_type: 'day_off',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    hours: '8',
    notes: '',
  });

  const fetchAll = async () => {
    const [
      employeesRes,
      employeeRolesRes,
      rolesRes,
      stationsRes,
      shiftsRes,
      punchesRes,
      breaksRes,
      tasksRes,
      logsRes,
      eventsRes,
      teamMembersRes,
      employeeDocumentsRes,
      scheduleTemplatesRes,
      scheduleTemplateShiftsRes,
      timeOffRequestsRes,
      ptoBalancesRes,
    ] = await Promise.all([
      supabase.from('workforce_employees').select('*').order('name'),
      supabase.from('workforce_employee_roles').select('*').order('created_at'),
      supabase.from('workforce_roles').select('*').order('name'),
      supabase.from('workforce_stations').select('*').order('name'),
      supabase.from('workforce_shifts').select('*').order('start_time'),
      supabase.from('workforce_punches').select('*').order('clock_in'),
      supabase.from('workforce_breaks').select('*').order('start_time'),
      supabase.from('workforce_tasks').select('*').order('due_time'),
      supabase.from('workforce_log_entries').select('*').order('timestamp'),
      supabase.from('workforce_events').select('*').order('timestamp', { ascending: false }),
      supabase.from('team_members').select('*').order('name'),
      supabase.from('workforce_employee_documents').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('workforce_schedule_templates').select('*').order('name'),
      supabase.from('workforce_schedule_template_shifts').select('*').order('day_offset'),
      supabase.from('workforce_time_off_requests').select('*').order('start_date'),
      supabase.from('workforce_pto_balances').select('*').order('employee_id'),
    ]);

    const errors = [
      employeesRes.error,
      employeeRolesRes.error,
      rolesRes.error,
      stationsRes.error,
      shiftsRes.error,
      punchesRes.error,
      breaksRes.error,
      tasksRes.error,
      logsRes.error,
      eventsRes.error,
      teamMembersRes.error,
      employeeDocumentsRes.error,
      scheduleTemplatesRes.error,
      scheduleTemplateShiftsRes.error,
      timeOffRequestsRes.error,
      ptoBalancesRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      throw new Error(errors[0]?.message || 'Failed loading Workforce data');
    }

    setEmployees((employeesRes.data as WorkforceEmployee[]) || []);
    setEmployeeRoles((employeeRolesRes.data as WorkforceEmployeeRoleAssignment[]) || []);
    setRoles((rolesRes.data as WorkforceRole[]) || []);
    setStations((stationsRes.data as WorkforceStation[]) || []);
    setShifts((shiftsRes.data as WorkforceShift[]) || []);
    setPunches((punchesRes.data as WorkforcePunch[]) || []);
    setBreaks((breaksRes.data as WorkforceBreak[]) || []);
    setTasks((tasksRes.data as WorkforceTask[]) || []);
    setLogEntries((logsRes.data as WorkforceLogEntry[]) || []);
    setEvents((eventsRes.data as WorkforceEvent[]) || []);
    setTeamMembers((teamMembersRes.data as TeamMemberPermissions[]) || []);
    setEmployeeDocuments((employeeDocumentsRes.data as WorkforceEmployeeDocument[]) || []);
    setScheduleTemplates((scheduleTemplatesRes.data as WorkforceScheduleTemplate[]) || []);
    setScheduleTemplateShifts((scheduleTemplateShiftsRes.data as WorkforceScheduleTemplateShift[]) || []);
    setTimeOffRequests((timeOffRequestsRes.data as WorkforceTimeOffRequest[]) || []);
    setPtoBalances((ptoBalancesRes.data as WorkforcePtoBalance[]) || []);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          setActorUserId(session.user.id);
          setActorName(String(session.user.email || 'Manager'));
        }

        await fetchAll();
      } catch (error) {
        alert((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  useEffect(() => {
    if (!employeeDraft.role_id && roles.length > 0) {
      setEmployeeDraft((current) => ({
        ...current,
        role_id: roles[0].id,
        title: current.title || roles[0].name,
        hourly_rate: current.hourly_rate || String(roles[0].hourly_rate || 24),
      }));
    }

    if (employeeRoleDrafts.length === 0 && roles.length > 0) {
      setEmployeeRoleDrafts([
        buildRoleRateDraft(roles[0].id, String(roles[0].hourly_rate || 24), true),
      ]);
    }
  }, [employeeDraft.role_id, employeeRoleDrafts.length, roles]);

  useEffect(() => {
    if (!shiftDraft.employee_id && employees.length > 0) {
      const firstEmployee = employees[0];
      setShiftDraft((current) => ({
        ...current,
        employee_id: firstEmployee.id,
      }));
    }

    if (!shiftDraft.role_id && roles.length > 0) {
      setShiftDraft((current) => ({
        ...current,
        role_id: roles[0].id,
        wage_rate: current.wage_rate || String(roles[0].hourly_rate || 24),
      }));
    }

    if (!shiftDraft.station_id && stations.length > 0) {
      setShiftDraft((current) => ({
        ...current,
        station_id: stations[0].id,
      }));
    }
  }, [employees, roles, shiftDraft.employee_id, shiftDraft.role_id, shiftDraft.station_id, stations]);

  useEffect(() => {
    if (!taskDraft.assigned_role_id && roles.length > 0) {
      setTaskDraft((current) => ({ ...current, assigned_role_id: roles[0].id }));
    }

    if (!taskDraft.station_id && stations.length > 0) {
      setTaskDraft((current) => ({ ...current, station_id: stations[0].id }));
    }
  }, [roles, stations, taskDraft.assigned_role_id, taskDraft.station_id]);

  useEffect(() => {
    if (!timeOffDraft.employee_id && employees.length > 0) {
      setTimeOffDraft((current) => ({
        ...current,
        employee_id: employees[0].id,
      }));
    }
  }, [employees, timeOffDraft.employee_id]);

  useEffect(() => {
    if (!selectedTemplateId && scheduleTemplates.length > 0) {
      setSelectedTemplateId(scheduleTemplates[0].id);
    }
  }, [scheduleTemplates, selectedTemplateId]);

  const roleById = useMemo(
    () =>
      roles.reduce((accumulator, role) => {
        accumulator[role.id] = role;
        return accumulator;
      }, {} as Record<string, WorkforceRole>),
    [roles],
  );

  const employeeById = useMemo(
    () =>
      employees.reduce((accumulator, employee) => {
        accumulator[employee.id] = employee;
        return accumulator;
      }, {} as Record<string, WorkforceEmployee>),
    [employees],
  );

  const stationById = useMemo(
    () =>
      stations.reduce((accumulator, station) => {
        accumulator[station.id] = station;
        return accumulator;
      }, {} as Record<string, WorkforceStation>),
    [stations],
  );

  const teamMemberByUserId = useMemo(
    () =>
      teamMembers.reduce((accumulator, member) => {
        if (!member.user_id) return accumulator;
        accumulator[member.user_id] = member;
        return accumulator;
      }, {} as Record<string, TeamMemberPermissions>),
    [teamMembers],
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
      }, {} as Record<string, WorkforceEmployeeRoleAssignment[]>),
    [employeeRoles],
  );

  const primaryEmployeeRoleByEmployeeId = useMemo(
    () =>
      Object.entries(employeeRoleAssignmentsByEmployeeId).reduce((accumulator, [employeeId, assignments]) => {
        const primary = assignments.find((assignment) => Boolean(assignment.primary_role)) || assignments[0];
        if (primary) {
          accumulator[employeeId] = primary;
        }
        return accumulator;
      }, {} as Record<string, WorkforceEmployeeRoleAssignment>),
    [employeeRoleAssignmentsByEmployeeId],
  );

  const roleRateByEmployeeIdRoleId = useMemo(
    () =>
      employeeRoles.reduce((accumulator, assignment) => {
        if (!assignment.employee_id || !assignment.role_id) return accumulator;
        const employeeId = assignment.employee_id;
        if (!accumulator[employeeId]) {
          accumulator[employeeId] = {};
        }
        accumulator[employeeId][assignment.role_id] = Number(
          assignment.hourly_rate ?? roleById[assignment.role_id]?.hourly_rate ?? 0,
        );
        return accumulator;
      }, {} as Record<string, Record<string, number>>),
    [employeeRoles, roleById],
  );

  const ptoByEmployeeId = useMemo(
    () =>
      ptoBalances.reduce((accumulator, balance) => {
        accumulator[balance.employee_id] = balance;
        return accumulator;
      }, {} as Record<string, WorkforcePtoBalance>),
    [ptoBalances],
  );

  const rolesForSelectedShiftEmployee = useMemo(() => {
    if (!shiftDraft.employee_id) return roles;
    const assignments = (employeeRoleAssignmentsByEmployeeId[shiftDraft.employee_id] || []).filter(
      (assignment) => assignment.active !== false,
    );
    if (!assignments.length) return roles;
    const allowedRoleIds = new Set(assignments.map((assignment) => assignment.role_id));
    return roles.filter((role) => allowedRoleIds.has(role.id));
  }, [employeeRoleAssignmentsByEmployeeId, roles, shiftDraft.employee_id]);

  useEffect(() => {
    if (!shiftDraft.employee_id) return;

    const assignments = (employeeRoleAssignmentsByEmployeeId[shiftDraft.employee_id] || []).filter(
      (assignment) => assignment.active !== false,
    );
    if (!assignments.length) return;

    const primaryAssignment =
      assignments.find((assignment) => Boolean(assignment.primary_role)) || assignments[0];
    const allowedRoleIds = new Set(assignments.map((assignment) => assignment.role_id));
    const currentRate =
      roleRateByEmployeeIdRoleId[shiftDraft.employee_id]?.[shiftDraft.role_id] ??
      roleById[shiftDraft.role_id]?.hourly_rate ??
      24;

    setShiftDraft((current) => {
      const nextRoleId = allowedRoleIds.has(current.role_id) ? current.role_id : primaryAssignment.role_id;
      const nextRate =
        roleRateByEmployeeIdRoleId[current.employee_id]?.[nextRoleId] ??
        roleById[nextRoleId]?.hourly_rate ??
        currentRate;
      const shouldReplaceRate = !current.wage_rate || current.role_id !== nextRoleId;

      if (current.role_id === nextRoleId && !shouldReplaceRate) {
        return current;
      }

      return {
        ...current,
        role_id: nextRoleId,
        wage_rate: shouldReplaceRate ? String(nextRate) : current.wage_rate,
      };
    });
  }, [employeeRoleAssignmentsByEmployeeId, roleById, roleRateByEmployeeIdRoleId, shiftDraft.employee_id, shiftDraft.role_id]);

  const today = startOfToday();
  const schedulerMinDate = addDays(today, -28);
  const schedulerMaxDate = addDays(today, 28);

  const scheduleWindowStart = useMemo(() => {
    if (scheduleView === 'week') {
      return startOfWeek(scheduleAnchorDate);
    }
    const normalized = new Date(scheduleAnchorDate);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }, [scheduleAnchorDate, scheduleView]);

  const scheduleDates = useMemo(() => {
    const count = scheduleView === 'week' ? 7 : 1;
    return Array.from({ length: count }, (_, index) => addDays(scheduleWindowStart, index));
  }, [scheduleView, scheduleWindowStart]);

  const scheduleDateKeys = useMemo(
    () => scheduleDates.map((date) => formatDateKey(date)),
    [scheduleDates],
  );

  const scheduleDateSet = useMemo(
    () => new Set(scheduleDateKeys),
    [scheduleDateKeys],
  );

  const shiftsInWindow = useMemo(
    () =>
      shifts.filter((shift) => {
        const key = formatDateKey(new Date(shift.start_time));
        return scheduleDateSet.has(key);
      }),
    [scheduleDateSet, shifts],
  );

  const shiftsByEmployeeAndDate = useMemo(
    () =>
      shiftsInWindow.reduce((accumulator, shift) => {
        const dateKey = formatDateKey(new Date(shift.start_time));
        const key = `${shift.employee_id}::${dateKey}`;
        if (!accumulator[key]) {
          accumulator[key] = [];
        }
        accumulator[key].push(shift);
        return accumulator;
      }, {} as Record<string, WorkforceShift[]>),
    [shiftsInWindow],
  );

  const approvedTimeOffDatesByEmployee = useMemo(() => {
    const accumulator: Record<string, Set<string>> = {};

    timeOffRequests.forEach((request) => {
      const status = String(request.status || 'pending').toLowerCase();
      if (status !== 'approved') return;
      if (!request.employee_id || !request.start_date || !request.end_date) return;

      const start = fromDateKey(request.start_date);
      const end = fromDateKey(request.end_date);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      if (!accumulator[request.employee_id]) {
        accumulator[request.employee_id] = new Set<string>();
      }

      const cursor = new Date(start);
      while (cursor.getTime() <= end.getTime()) {
        accumulator[request.employee_id].add(formatDateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return accumulator;
  }, [timeOffRequests]);

  const todayKey = today.toISOString().slice(0, 10);

  const shiftsToday = useMemo(
    () =>
      shifts.filter((shift) => {
        const start = new Date(shift.start_time);
        if (Number.isNaN(start.getTime())) return false;
        return start.toISOString().slice(0, 10) === todayKey;
      }),
    [shifts, todayKey],
  );

  const punchByShiftId = useMemo(
    () =>
      punches.reduce((accumulator, punch) => {
        if (!accumulator[punch.shift_id]) {
          accumulator[punch.shift_id] = [];
        }
        accumulator[punch.shift_id].push(punch);
        return accumulator;
      }, {} as Record<string, WorkforcePunch[]>),
    [punches],
  );

  const openPunches = useMemo(() => punches.filter((punch) => !punch.clock_out), [punches]);
  const currentWeekStart = useMemo(() => startOfWeek(today), [today]);
  const currentWeekEnd = useMemo(() => addDays(currentWeekStart, 7), [currentWeekStart]);

  const currentWeekPunches = useMemo(
    () =>
      punches.filter((punch) => {
        const startsAt = new Date(punch.clock_in).getTime();
        if (Number.isNaN(startsAt)) return false;
        return startsAt >= currentWeekStart.getTime() && startsAt < currentWeekEnd.getTime();
      }),
    [currentWeekEnd, currentWeekStart, punches],
  );

  const scheduledHours = useMemo(
    () =>
      shiftsToday.reduce((total, shift) => {
        const start = new Date(shift.start_time).getTime();
        const end = new Date(shift.end_time).getTime();
        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return total;
        return total + (end - start) / 3600000;
      }, 0),
    [shiftsToday],
  );

  const caLaborSummary = useMemo(() => {
    const punchInput = currentWeekPunches.map((punch) => {
      const shift = shifts.find((candidate) => candidate.id === punch.shift_id);
      const fallbackRoleRate = shift?.role_id ? Number(roleById[shift.role_id]?.hourly_rate || 0) : 0;
      const fallbackAssignedRate = shift?.employee_id && shift?.role_id
        ? Number(roleRateByEmployeeIdRoleId[shift.employee_id]?.[shift.role_id] || 0)
        : 0;
      const rate = Number(shift?.wage_rate || fallbackAssignedRate || fallbackRoleRate || 0);

      return {
        id: punch.id,
        employee_id: punch.employee_id,
        clock_in: punch.clock_in,
        clock_out: punch.clock_out,
        rate,
        breaks: breaks.filter((entry) => entry.punch_id === punch.id),
      };
    });

    return calculateCaliforniaLaborSummary(punchInput, new Date());
  }, [breaks, currentWeekPunches, roleById, roleRateByEmployeeIdRoleId, shifts]);

  const workedHours = caLaborSummary.totalHours;
  const laborCost = caLaborSummary.totalCost;

  const unresolvedCriticalTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          Boolean(task.critical) && String(task.completion_status || 'open').toLowerCase() !== 'completed',
      ),
    [tasks],
  );

  const complianceWarnings = useMemo(() => {
    const warnings: Array<{ code: string; message: string; severity: 'warning' | 'critical' }> = [];

    shiftsToday.forEach((shift) => {
      const start = new Date(shift.start_time);
      if (Number.isNaN(start.getTime())) return;
      const hasPunch = (punchByShiftId[shift.id] || []).length > 0;
      if (start.getTime() < Date.now() && !hasPunch) {
        const employeeName = employeeById[shift.employee_id]?.name || 'Unassigned';
        warnings.push({
          code: 'LATE_OR_MISSED_PUNCH',
          severity: 'warning',
          message: `${employeeName} is scheduled but has not punched in for ${formatDateTime(shift.start_time)}.`,
        });
      }
    });

    openPunches.forEach((punch) => {
      const clockInTime = new Date(punch.clock_in).getTime();
      if (Number.isNaN(clockInTime)) return;
      const durationHours = (Date.now() - clockInTime) / 3600000;

      const linkedBreaks = breaks.filter((candidate) => candidate.punch_id === punch.id);
      const employeeName = employeeById[punch.employee_id]?.name || 'Employee';
      const hasMealBreak = linkedBreaks.some((entry) => {
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

      if (durationHours > 5 && !hasMealBreak) {
        warnings.push({
          code: 'MEAL_BREAK_MISSING',
          severity: durationHours > 6 ? 'critical' : 'warning',
          message: `${employeeName} has worked ${durationHours.toFixed(1)}h with no recorded break.`,
        });
      }

      if (durationHours > 8) {
        warnings.push({
          code: 'OVERTIME_RISK',
          severity: 'warning',
          message: `${employeeName} is in overtime risk at ${durationHours.toFixed(1)}h.`,
        });
      }
    });

    return warnings;
  }, [breaks, employeeById, openPunches, punchByShiftId, shiftsToday]);

  const recordEvent = async (
    eventType: string,
    subjectType: string,
    subjectId: string,
    metadata: Record<string, unknown> = {},
  ) => {
    const { error } = await supabase.from('workforce_events').insert([
      {
        event_type: eventType,
        actor_id: actorUserId,
        subject_type: subjectType,
        subject_id: subjectId,
        location_id: 'wf_loc_main',
        timestamp: new Date().toISOString(),
        metadata_json: JSON.stringify(metadata),
        correlation_id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      },
    ]);

    if (error) {
      throw new Error(error.message || 'Failed to write event log');
    }
  };

  const openCreateEmployeeEditor = () => {
    const defaultRole = roles[0];
    const defaultRate = String(defaultRole?.hourly_rate || 24);
    setEmployeeEditorMode('create');
    setEditingEmployee(null);
    setEmployeeDraft(
      buildEmployeeDraft(defaultRole?.id || '', defaultRate),
    );
    setEmployeeRoleDrafts([buildRoleRateDraft(defaultRole?.id || '', defaultRate, true)]);
    setDocumentDraft({ doc_type: 'ID Scan', notes: '' });
    setShowEmployeeForm(true);
  };

  const openEditEmployeeEditor = (employee: WorkforceEmployee) => {
    const assignments = (employeeRoleAssignmentsByEmployeeId[employee.id] || []).filter(
      (assignment) => assignment.active !== false,
    );
    const primaryAssignment =
      assignments.find((assignment) => Boolean(assignment.primary_role)) || assignments[0];
    const primaryRoleId = primaryAssignment?.role_id || roles[0]?.id || '';
    const primaryRate = Number(
      primaryAssignment?.hourly_rate ?? employee.hourly_rate ?? roleById[primaryRoleId]?.hourly_rate ?? 24,
    );
    const teamMember = teamMemberByUserId[String(employee.user_id || '')];
    const pto = ptoByEmployeeId[employee.id];

    const assignmentDrafts =
      assignments.length > 0
        ? assignments.map((assignment, index) =>
            buildRoleRateDraft(
              assignment.role_id,
              String(assignment.hourly_rate ?? roleById[assignment.role_id]?.hourly_rate ?? 24),
              Boolean(assignment.primary_role) || index === 0,
            ),
          )
        : [buildRoleRateDraft(primaryRoleId, String(primaryRate), true)];

    setEmployeeEditorMode('edit');
    setEditingEmployee(employee);
    setEmployeeRoleDrafts(assignmentDrafts);
    setEmployeeDraft({
      name: employee.name || '',
      email: String(employee.email || ''),
      phone: String(employee.phone || ''),
      title: String(employee.title || roleById[primaryRoleId]?.name || ''),
      role_id: primaryRoleId,
      hourly_rate: String(primaryRate),
      hire_date: String(employee.hire_date || new Date().toISOString().slice(0, 10)),
      availability: String(employee.availability || 'Open availability'),
      login_username: String(employee.login_username || employee.email || ''),
      login_password: String(employee.login_password || ''),
      pto_accrued_hours: String(pto?.accrued_hours ?? 80),
      pto_used_hours: String(pto?.used_hours ?? 0),
      pto_available_hours: String(pto?.available_hours ?? 80),
      can_access_menu_management: Boolean(teamMember?.can_access_menu_management),
      can_access_operations:
        teamMember?.can_access_operations !== undefined
          ? Boolean(teamMember.can_access_operations)
          : true,
      can_access_workforce:
        teamMember?.can_access_workforce !== undefined
          ? Boolean(teamMember.can_access_workforce)
          : true,
      can_access_content_management: Boolean(teamMember?.can_access_content_management),
      can_access_career_management: Boolean(teamMember?.can_access_career_management),
      can_access_investment: Boolean(teamMember?.can_access_investment),
      can_access_settings: Boolean(teamMember?.can_access_settings),
      can_view_reservations: Boolean(teamMember?.can_view_reservations),
      can_view_events_parties: Boolean(teamMember?.can_view_events_parties),
      can_view_classes: Boolean(teamMember?.can_view_classes),
      operations_classes_read_only: Boolean(teamMember?.operations_classes_read_only),
      active: employee.status !== 'inactive',
    });
    setDocumentDraft({ doc_type: 'ID Scan', notes: '' });
    setShowEmployeeForm(true);
  };

  const closeEmployeeEditor = () => {
    setShowEmployeeForm(false);
    setEditingEmployee(null);
    setEmployeeRoleDrafts([]);
  };

  const addRoleDraftRow = () => {
    const fallbackRole = roles[0]?.id || '';
    const fallbackRate = String(roleById[fallbackRole]?.hourly_rate || 24);
    setEmployeeRoleDrafts((current) => [
      ...current,
      buildRoleRateDraft(fallbackRole, fallbackRate, current.length === 0),
    ]);
  };

  const updateRoleDraft = (
    rowId: string,
    patch: Partial<ReturnType<typeof buildRoleRateDraft>>,
  ) => {
    setEmployeeRoleDrafts((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        const nextRoleId = patch.role_id ?? row.role_id;
        const nextHourlyRate =
          patch.hourly_rate ??
          (patch.role_id ? String(roleById[nextRoleId]?.hourly_rate ?? row.hourly_rate ?? '24') : row.hourly_rate);
        return {
          ...row,
          ...patch,
          role_id: nextRoleId,
          hourly_rate: nextHourlyRate,
        };
      }),
    );
  };

  const removeRoleDraft = (rowId: string) => {
    setEmployeeRoleDrafts((current) => {
      const remaining = current.filter((row) => row.id !== rowId);
      if (remaining.length === 0) {
        return [buildRoleRateDraft(roles[0]?.id || '', String(roles[0]?.hourly_rate || 24), true)];
      }
      if (!remaining.some((row) => row.primary_role)) {
        remaining[0] = { ...remaining[0], primary_role: true };
      }
      return remaining;
    });
  };

  const setPrimaryRoleDraft = (rowId: string) => {
    setEmployeeRoleDrafts((current) =>
      current.map((row) => ({
        ...row,
        primary_role: row.id === rowId,
      })),
    );
  };

  const upsertTeamMemberPermissions = async (
    userId: string,
    email: string,
    name: string,
    title: string,
    active: boolean,
  ) => {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = teamMembers.find(
      (member) =>
        (userId && member.user_id === userId) ||
        (normalizedEmail && String(member.email || '').trim().toLowerCase() === normalizedEmail),
    );

    const canAccessOperations = Boolean(employeeDraft.can_access_operations);
    const canViewClasses = canAccessOperations && Boolean(employeeDraft.can_view_classes);

    const payload = {
      user_id: userId,
      email,
      name,
      title,
      portal: existing?.portal || 'staff',
      can_access_menu_management: Boolean(employeeDraft.can_access_menu_management),
      can_access_operations: canAccessOperations,
      can_access_workforce: Boolean(employeeDraft.can_access_workforce),
      can_access_content_management: Boolean(employeeDraft.can_access_content_management),
      can_access_career_management: Boolean(employeeDraft.can_access_career_management),
      can_access_investment: Boolean(employeeDraft.can_access_investment),
      can_access_settings: Boolean(employeeDraft.can_access_settings),
      can_view_reservations: canAccessOperations && Boolean(employeeDraft.can_view_reservations),
      can_view_events_parties: canAccessOperations && Boolean(employeeDraft.can_view_events_parties),
      can_view_classes: canViewClasses,
      operations_classes_read_only:
        canViewClasses && Boolean(employeeDraft.operations_classes_read_only),
      active,
    };

    if (existing?.id) {
      const { error } = await supabase.from('team_members').update(payload).eq('id', existing.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from('team_members').insert([
      {
        id: `tm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ...payload,
      },
    ]);
    if (error) throw error;
  };

  const ensureUserLogin = async (fallbackEmail: string) => {
    const loginUsername = employeeDraft.login_username.trim() || fallbackEmail.trim();
    const loginPassword = employeeDraft.login_password.trim();
    let nextUserId = String(editingEmployee?.user_id || '').trim();

    if (!loginUsername) {
      return {
        userId: nextUserId,
        loginUsername: '',
      };
    }

    const adminApi = (supabaseAdmin as any)?.auth?.admin;
    if (!adminApi) {
      return {
        userId: nextUserId,
        loginUsername,
      };
    }

    if (!nextUserId && typeof adminApi.createUser === 'function') {
      const { data, error } = await adminApi.createUser({
        email: loginUsername,
        password: loginPassword || 'spoonbill-temp',
      });

      if (error) {
        const existingTeam = teamMembers.find(
          (member) =>
            String(member.email || '').trim().toLowerCase() === loginUsername.trim().toLowerCase(),
        );
        if (existingTeam?.user_id) {
          nextUserId = existingTeam.user_id;
        } else {
          throw error;
        }
      } else if (data?.user?.id) {
        nextUserId = String(data.user.id);
      }
    }

    if (nextUserId && typeof adminApi.updateUserById === 'function') {
      const updatePayload: Record<string, string> = {};
      if (loginUsername) updatePayload.email = loginUsername;
      if (loginPassword) updatePayload.password = loginPassword;

      if (Object.keys(updatePayload).length > 0) {
        const { error } = await adminApi.updateUserById(nextUserId, updatePayload);
        if (error) throw error;
      }
    }

    return {
      userId: nextUserId,
      loginUsername,
    };
  };

  const saveEmployeeProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeDraft.name.trim()) {
      alert('Employee name is required.');
      return;
    }
    const normalizedRoleAssignments = employeeRoleDrafts
      .map((row, index) => ({
        role_id: String(row.role_id || '').trim(),
        hourly_rate: Number(row.hourly_rate || 0),
        primary_role: Boolean(row.primary_role) || index === 0,
      }))
      .filter((row) => row.role_id)
      .filter((row, index, rows) => rows.findIndex((candidate) => candidate.role_id === row.role_id) === index);

    if (normalizedRoleAssignments.length === 0) {
      alert('At least one role is required.');
      return;
    }

    const primaryRoleAssignment =
      normalizedRoleAssignments.find((row) => row.primary_role) || normalizedRoleAssignments[0];
    const primaryRoleId = primaryRoleAssignment.role_id;
    const primaryRoleRate = Number(primaryRoleAssignment.hourly_rate || roleById[primaryRoleId]?.hourly_rate || 24);

    if (!employeeDraft.login_username.trim() && !employeeDraft.email.trim()) {
      alert('Login username is required so this employee can access BOH tools.');
      return;
    }

    setSaving(true);
    try {
      const normalizedEmail = employeeDraft.email.trim();
      const { userId, loginUsername } = await ensureUserLogin(normalizedEmail);
      const employeeEmail = normalizedEmail || loginUsername;
      const active = Boolean(employeeDraft.active);

      const employeePayload = {
        user_id: userId || null,
        name: employeeDraft.name.trim(),
        email: employeeEmail || null,
        phone: employeeDraft.phone.trim() || null,
        title: employeeDraft.title.trim() || roleById[primaryRoleId]?.name || 'Employee',
        status: active ? 'active' : 'inactive',
        default_location_id: 'wf_loc_main',
        hire_date: employeeDraft.hire_date,
        pay_basis: 'hourly',
        hourly_rate: primaryRoleRate,
        availability: employeeDraft.availability.trim() || 'Open availability',
        login_username: loginUsername || null,
        login_password: employeeDraft.login_password.trim() || null,
        attendance_score: editingEmployee?.attendance_score ?? 100,
      };

      let employeeId = editingEmployee?.id || '';

      if (employeeEditorMode === 'create') {
        const { data: employeeRow, error } = await supabase
          .from('workforce_employees')
          .insert([employeePayload])
          .select('*')
          .single();
        if (error) throw error;
        employeeId = String(employeeRow.id || '');
      } else {
        const { error } = await supabase
          .from('workforce_employees')
          .update(employeePayload)
          .eq('id', employeeId);
        if (error) throw error;
      }

      const { error: clearRoleError } = await supabase
        .from('workforce_employee_roles')
        .delete()
        .eq('employee_id', employeeId);
      if (clearRoleError) throw clearRoleError;

      const roleAssignmentRows = normalizedRoleAssignments.map((assignment, index) => ({
        id: `wf_er_${employeeId}_${assignment.role_id}_${Date.now()}_${index}`,
        employee_id: employeeId,
        role_id: assignment.role_id,
        hourly_rate: Number(assignment.hourly_rate || roleById[assignment.role_id]?.hourly_rate || 24),
        primary_role: assignment.role_id === primaryRoleId,
        active: true,
      }));

      const { error: roleInsertError } = await supabase
        .from('workforce_employee_roles')
        .insert(roleAssignmentRows);
      if (roleInsertError) throw roleInsertError;

      const { error: shiftRateUpdateError } = await supabase
        .from('workforce_shifts')
        .update({
          wage_rate: primaryRoleRate,
        })
        .eq('employee_id', employeeId)
        .eq('role_id', primaryRoleId);
      if (shiftRateUpdateError) {
        // Non-blocking: historical shifts can keep historical rates.
      }

      const { error: setPrimaryRoleShiftError } = await supabase
        .from('workforce_shifts')
        .update({
          role_id: primaryRoleId,
          wage_rate: primaryRoleRate,
        })
        .eq('employee_id', employeeId)
        .eq('role_id', null);
      if (setPrimaryRoleShiftError) {
        // Non-blocking fallback in case no null-role shifts exist.
      }

      const accrued = Number(employeeDraft.pto_accrued_hours || 0);
      const used = Number(employeeDraft.pto_used_hours || 0);
      const available = Number(employeeDraft.pto_available_hours || Math.max(0, accrued - used));
      const existingPto = ptoByEmployeeId[employeeId];

      if (existingPto?.id) {
        const { error: ptoError } = await supabase
          .from('workforce_pto_balances')
          .update({
            accrued_hours: accrued,
            used_hours: used,
            available_hours: available,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPto.id);
        if (ptoError) throw ptoError;
      } else {
        const { error: ptoInsertError } = await supabase
          .from('workforce_pto_balances')
          .insert([
            {
              employee_id: employeeId,
              accrued_hours: accrued,
              used_hours: used,
              available_hours: available,
              updated_at: new Date().toISOString(),
            },
          ]);
        if (ptoInsertError) throw ptoInsertError;
      }

      if (userId || employeeEmail) {
        await upsertTeamMemberPermissions(
          userId || '',
          employeeEmail,
          employeeDraft.name.trim(),
          employeeDraft.title.trim() || roleById[primaryRoleId]?.name || 'Employee',
          active,
        );
      }

      await recordEvent(
        employeeEditorMode === 'create' ? 'EMPLOYEE_CREATED' : 'EMPLOYEE_UPDATED',
        'employee',
        employeeId,
        {
          role_ids: normalizedRoleAssignments.map((assignment) => assignment.role_id),
        },
      );

      await fetchAll();
      closeEmployeeEditor();
    } catch (error) {
      alert(`Failed to save employee profile: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const uploadEmployeeDocument = async (file: File) => {
    if (!editingEmployee?.id) return;
    setUploadingDocument(true);
    try {
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = `${editingEmployee.id}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('employee-documents').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('workforce_employee_documents').insert([
        {
          employee_id: editingEmployee.id,
          doc_type: documentDraft.doc_type.trim() || 'Document',
          file_name: file.name,
          file_path: filePath,
          public_url: publicUrl,
          notes: documentDraft.notes.trim(),
          uploaded_at: new Date().toISOString(),
        },
      ]);
      if (insertError) throw insertError;

      await recordEvent('EMPLOYEE_DOCUMENT_UPLOADED', 'employee', editingEmployee.id, {
        file_name: file.name,
        doc_type: documentDraft.doc_type.trim() || 'Document',
      });

      await fetchAll();
      setDocumentDraft((current) => ({ ...current, notes: '' }));
    } catch (error) {
      alert(`Failed to upload document: ${(error as Error).message}`);
    } finally {
      setUploadingDocument(false);
    }
  };

  const deleteEmployeeDocument = async (document: WorkforceEmployeeDocument) => {
    if (!confirm('Delete this employee document?')) return;

    setSaving(true);
    try {
      await supabase.storage.from('employee-documents').remove([document.file_path]);
      const { error } = await supabase
        .from('workforce_employee_documents')
        .delete()
        .eq('id', document.id);
      if (error) throw error;

      await recordEvent('EMPLOYEE_DOCUMENT_DELETED', 'employee', document.employee_id, {
        file_name: document.file_name,
      });
      await fetchAll();
    } catch (error) {
      alert(`Failed to delete document: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const createShift = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shiftDraft.employee_id || !shiftDraft.role_id || !shiftDraft.date) {
      alert('Employee, role, and date are required.');
      return;
    }

    const startAt = `${shiftDraft.date}T${shiftDraft.start_time}:00`;
    const endAt = `${shiftDraft.date}T${shiftDraft.end_time}:00`;

    setSaving(true);
    try {
      const { data: shiftRow, error } = await supabase
        .from('workforce_shifts')
        .insert([
          {
            employee_id: shiftDraft.employee_id,
            role_id: shiftDraft.role_id,
            location_id: 'wf_loc_main',
            station_id: shiftDraft.station_id || null,
            start_time: startAt,
            end_time: endAt,
            break_rules: 'ca_standard',
            wage_rate: Number(
              shiftDraft.wage_rate ||
                roleRateByEmployeeIdRoleId[shiftDraft.employee_id]?.[shiftDraft.role_id] ||
                roleById[shiftDraft.role_id]?.hourly_rate ||
                24,
            ),
            status: 'draft',
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      await recordEvent('SHIFT_CREATED', 'shift', String(shiftRow.id), {
        employee_id: shiftDraft.employee_id,
        role_id: shiftDraft.role_id,
        start_time: startAt,
        end_time: endAt,
      });

      await fetchAll();
      setShowShiftForm(false);
    } catch (error) {
      alert(`Failed to create shift: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const createShiftCopy = async (baseShift: WorkforceShift, targetDateKey: string, targetEmployeeId?: string) => {
    const startClock = `${toTimeLabel(baseShift.start_time)}:00`;
    const endClock = `${toTimeLabel(baseShift.end_time)}:00`;
    const startAt = toDateTime(targetDateKey, startClock);

    const startsAtMinutes = toMinutes(toTimeLabel(baseShift.start_time));
    const endsAtMinutes = toMinutes(toTimeLabel(baseShift.end_time));
    const crossesMidnight = endsAtMinutes <= startsAtMinutes;
    const endDateKey = crossesMidnight ? formatDateKey(addDays(fromDateKey(targetDateKey), 1)) : targetDateKey;
    const endAt = toDateTime(endDateKey, endClock);

    const payload = {
      employee_id: targetEmployeeId || baseShift.employee_id,
      role_id: baseShift.role_id,
      location_id: baseShift.location_id || 'wf_loc_main',
      station_id: baseShift.station_id || null,
      start_time: startAt,
      end_time: endAt,
      break_rules: 'ca_standard',
      wage_rate: Number(baseShift.wage_rate || roleById[baseShift.role_id]?.hourly_rate || 24),
      status: 'draft',
    };

    const { data: shiftRow, error } = await supabase
      .from('workforce_shifts')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to duplicate shift');
    }

    await recordEvent('SHIFT_DUPLICATED', 'shift', String(shiftRow.id), {
      source_shift_id: baseShift.id,
      employee_id: payload.employee_id,
      start_time: payload.start_time,
      end_time: payload.end_time,
    });
  };

  const deleteShift = async (shift: WorkforceShift) => {
    if (!confirm('Delete this shift?')) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('workforce_shifts').delete().eq('id', shift.id);
      if (error) throw error;

      await recordEvent('SHIFT_DELETED', 'shift', shift.id, {
        employee_id: shift.employee_id,
      });

      await fetchAll();
    } catch (error) {
      alert(`Failed to delete shift: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const duplicateShiftToCell = async (shift: WorkforceShift, targetDateKey: string, targetEmployeeId?: string) => {
    setSaving(true);
    try {
      await createShiftCopy(shift, targetDateKey, targetEmployeeId);
      await fetchAll();
    } catch (error) {
      alert(`Failed to duplicate shift: ${(error as Error).message}`);
    } finally {
      setSaving(false);
      setDraggingShiftId(null);
    }
  };

  const copyPreviousWeek = async () => {
    if (scheduleView !== 'week') {
      alert('Switch to week view to copy a week schedule.');
      return;
    }

    if (!confirm('Copy previous week shifts into this week? Existing shifts will remain.')) {
      return;
    }

    const currentWeekStart = startOfWeek(scheduleWindowStart);
    const previousWeekStart = addDays(currentWeekStart, -7);
    const previousWeekKeys = Array.from({ length: 7 }, (_, index) => formatDateKey(addDays(previousWeekStart, index)));
    const previousWeekSet = new Set(previousWeekKeys);

    const sourceShifts = shifts.filter((shift) =>
      previousWeekSet.has(formatDateKey(new Date(shift.start_time))),
    );

    if (!sourceShifts.length) {
      alert('No shifts found in the previous week.');
      return;
    }

    setSaving(true);
    try {
      for (const shift of sourceShifts) {
        const sourceDate = fromDateKey(formatDateKey(new Date(shift.start_time)));
        const dayOffset = Math.round((sourceDate.getTime() - previousWeekStart.getTime()) / 86400000);
        const targetDateKey = formatDateKey(addDays(currentWeekStart, dayOffset));
        await createShiftCopy(shift, targetDateKey, shift.employee_id);
      }

      await recordEvent('SCHEDULE_COPIED_PREVIOUS_WEEK', 'schedule', formatDateKey(currentWeekStart), {
        source_week_start: formatDateKey(previousWeekStart),
        shifts_copied: sourceShifts.length,
      });

      await fetchAll();
    } catch (error) {
      alert(`Failed to copy previous week: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const applyScheduleTemplate = async () => {
    if (scheduleView !== 'week') {
      alert('Switch to week view to apply schedule templates.');
      return;
    }

    if (!selectedTemplateId) {
      alert('Choose a template first.');
      return;
    }

    const templateRows = scheduleTemplateShifts.filter((shift) => shift.template_id === selectedTemplateId);
    if (!templateRows.length) {
      alert('This template has no shifts yet.');
      return;
    }

    setSaving(true);
    try {
      const baseWeekStart = startOfWeek(scheduleWindowStart);

      for (const templateShift of templateRows) {
        const targetDate = addDays(baseWeekStart, Number(templateShift.day_offset || 0));
        const targetDateKey = formatDateKey(targetDate);

        const pseudoShift: WorkforceShift = {
          id: templateShift.id,
          employee_id: templateShift.employee_id,
          role_id: templateShift.role_id,
          location_id: 'wf_loc_main',
          station_id: templateShift.station_id,
          start_time: toDateTime(targetDateKey, templateShift.start_time),
          end_time: toDateTime(targetDateKey, templateShift.end_time),
          wage_rate: templateShift.wage_rate,
          status: 'draft',
        };

        await createShiftCopy(pseudoShift, targetDateKey, templateShift.employee_id);
      }

      await recordEvent('SCHEDULE_TEMPLATE_APPLIED', 'schedule_template', selectedTemplateId, {
        week_start: formatDateKey(baseWeekStart),
        shift_count: templateRows.length,
      });

      await fetchAll();
    } catch (error) {
      alert(`Failed to apply template: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveWeekAsTemplate = async () => {
    if (scheduleView !== 'week') {
      alert('Switch to week view to save templates.');
      return;
    }

    const templateName = prompt('Template name');
    if (!templateName || !templateName.trim()) return;

    const baseWeekStart = startOfWeek(scheduleWindowStart);
    const shiftsToSave = shifts.filter((shift) => {
      const shiftDate = fromDateKey(formatDateKey(new Date(shift.start_time)));
      const dayOffset = Math.round((shiftDate.getTime() - baseWeekStart.getTime()) / 86400000);
      return dayOffset >= 0 && dayOffset <= 6;
    });

    if (!shiftsToSave.length) {
      alert('No shifts in this week to save.');
      return;
    }

    setSaving(true);
    try {
      const { data: templateRow, error: templateError } = await supabase
        .from('workforce_schedule_templates')
        .insert([
          {
            name: templateName.trim(),
            location_id: 'wf_loc_main',
            created_by: actorName,
          },
        ])
        .select('*')
        .single();

      if (templateError) throw templateError;

      const templateId = String(templateRow.id);

      const templateShiftRows = shiftsToSave.map((shift) => {
        const shiftDate = fromDateKey(formatDateKey(new Date(shift.start_time)));
        const dayOffset = Math.round((shiftDate.getTime() - baseWeekStart.getTime()) / 86400000);
        return {
          template_id: templateId,
          day_offset: dayOffset,
          employee_id: shift.employee_id,
          role_id: shift.role_id,
          station_id: shift.station_id || null,
          start_time: extractTimePart(shift.start_time),
          end_time: extractTimePart(shift.end_time),
          wage_rate: Number(shift.wage_rate || roleById[shift.role_id]?.hourly_rate || 24),
        };
      });

      const { error: templateShiftsError } = await supabase
        .from('workforce_schedule_template_shifts')
        .insert(templateShiftRows);

      if (templateShiftsError) throw templateShiftsError;

      await recordEvent('SCHEDULE_TEMPLATE_SAVED', 'schedule_template', templateId, {
        week_start: formatDateKey(baseWeekStart),
        shift_count: templateShiftRows.length,
      });

      await fetchAll();
      setSelectedTemplateId(templateId);
    } catch (error) {
      alert(`Failed to save template: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const createTimeOffRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!timeOffDraft.employee_id) {
      alert('Select an employee for this request.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        employee_id: timeOffDraft.employee_id,
        request_type: timeOffDraft.request_type,
        start_date: timeOffDraft.start_date,
        end_date: timeOffDraft.end_date,
        hours: Number(timeOffDraft.hours || 0),
        status: 'pending',
        notes: timeOffDraft.notes.trim(),
      };

      const { data: requestRow, error } = await supabase
        .from('workforce_time_off_requests')
        .insert([payload])
        .select('*')
        .single();

      if (error) throw error;

      await recordEvent('TIME_OFF_REQUEST_CREATED', 'time_off_request', String(requestRow.id), {
        employee_id: payload.employee_id,
        request_type: payload.request_type,
      });

      await fetchAll();
      setShowTimeOffForm(false);
      setTimeOffDraft((current) => ({
        ...current,
        request_type: 'day_off',
        hours: '8',
        notes: '',
      }));
    } catch (error) {
      alert(`Failed to create time-off request: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateTimeOffStatus = async (
    request: WorkforceTimeOffRequest,
    status: 'approved' | 'denied' | 'pending',
  ) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('workforce_time_off_requests')
        .update({ status })
        .eq('id', request.id);

      if (error) throw error;

      if (
        status === 'approved' &&
        String(request.request_type || '').toLowerCase() === 'pto' &&
        String(request.status || '').toLowerCase() !== 'approved'
      ) {
        const pto = ptoByEmployeeId[request.employee_id];
        const requestHours = Number(request.hours || 0);
        const accrued = Number(pto?.accrued_hours || 0);
        const used = Number(pto?.used_hours || 0) + requestHours;
        const available = Math.max(0, accrued - used);

        if (pto?.id) {
          const { error: ptoError } = await supabase
            .from('workforce_pto_balances')
            .update({
              used_hours: used,
              available_hours: available,
              updated_at: new Date().toISOString(),
            })
            .eq('id', pto.id);
          if (ptoError) throw ptoError;
        } else {
          const { error: ptoInsertError } = await supabase
            .from('workforce_pto_balances')
            .insert([
              {
                employee_id: request.employee_id,
                accrued_hours: 80,
                used_hours: requestHours,
                available_hours: Math.max(0, 80 - requestHours),
                updated_at: new Date().toISOString(),
              },
            ]);
          if (ptoInsertError) throw ptoInsertError;
        }
      }

      await recordEvent('TIME_OFF_REQUEST_STATUS_UPDATED', 'time_off_request', request.id, {
        status,
      });
      await fetchAll();
    } catch (error) {
      alert(`Failed to update request status: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const moveScheduleWindow = (direction: -1 | 1) => {
    const step = scheduleView === 'week' ? 7 : 1;
    setScheduleAnchorDate((current) =>
      clampDate(addDays(current, step * direction), schedulerMinDate, schedulerMaxDate),
    );
  };

  const scheduleStep = scheduleView === 'week' ? 7 : 1;
  const canMoveSchedulePrev = addDays(scheduleAnchorDate, -scheduleStep).getTime() >= schedulerMinDate.getTime();
  const canMoveScheduleNext = addDays(scheduleAnchorDate, scheduleStep).getTime() <= schedulerMaxDate.getTime();

  const scheduleLabel = useMemo(() => {
    if (scheduleDates.length === 0) return '';
    if (scheduleView === 'day') {
      return formatDateHeader(scheduleDates[0]);
    }
    return `${formatDateShort(scheduleDates[0])} - ${formatDateShort(scheduleDates[scheduleDates.length - 1])}`;
  }, [scheduleDates, scheduleView]);

  const orderedEmployees = useMemo(
    () =>
      employees
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  );

  const dayViewShifts = useMemo(() => {
    if (scheduleView !== 'day' || scheduleDateKeys.length === 0) return [];
    const currentDateKey = scheduleDateKeys[0];
    return shifts.filter((shift) => formatDateKey(new Date(shift.start_time)) === currentDateKey);
  }, [scheduleDateKeys, scheduleView, shifts]);

  const editingEmployeeDocuments = useMemo(
    () =>
      editingEmployee
        ? employeeDocuments.filter((document) => document.employee_id === editingEmployee.id)
        : [],
    [editingEmployee, employeeDocuments],
  );

  const publishTodaySchedule = async () => {
    setSaving(true);
    try {
      const publishable = shiftsToday.filter(
        (shift) => String(shift.status || '').toLowerCase() !== 'published',
      );

      await Promise.all(
        publishable.map((shift) =>
          supabase.from('workforce_shifts').update({ status: 'published' }).eq('id', shift.id),
        ),
      );

      await recordEvent('SHIFT_PUBLISHED', 'schedule', todayKey, {
        published_count: publishable.length,
      });

      await fetchAll();
    } catch (error) {
      alert(`Failed to publish schedule: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const clockInShift = async (shift: WorkforceShift) => {
    const existingOpen = (punchByShiftId[shift.id] || []).find((punch) => !punch.clock_out);
    if (existingOpen) return;

    setSaving(true);
    try {
      const { data: punchRow, error } = await supabase
        .from('workforce_punches')
        .insert([
          {
            employee_id: shift.employee_id,
            shift_id: shift.id,
            clock_in: new Date().toISOString(),
            status: 'open',
            verified_location: true,
            verified_photo: false,
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      await supabase.from('workforce_shifts').update({ status: 'in_progress' }).eq('id', shift.id);
      await recordEvent('PUNCH_IN', 'punch', String(punchRow.id), { shift_id: shift.id });
      await fetchAll();
    } catch (error) {
      alert(`Failed to clock in: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const clockOutShift = async (shift: WorkforceShift) => {
    const existingOpen = (punchByShiftId[shift.id] || []).find((punch) => !punch.clock_out);
    if (!existingOpen) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('workforce_punches')
        .update({ clock_out: new Date().toISOString(), status: 'closed' })
        .eq('id', existingOpen.id);

      if (error) throw error;

      await supabase.from('workforce_shifts').update({ status: 'completed' }).eq('id', shift.id);
      await recordEvent('PUNCH_OUT', 'punch', String(existingOpen.id), { shift_id: shift.id });
      await fetchAll();
    } catch (error) {
      alert(`Failed to clock out: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const createTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskDraft.title.trim()) {
      alert('Task title is required.');
      return;
    }

    const dueTime = `${taskDraft.due_date}T${taskDraft.due_time}:00`;

    setSaving(true);
    try {
      const { data: taskRow, error } = await supabase
        .from('workforce_tasks')
        .insert([
          {
            title: taskDraft.title.trim(),
            assigned_role_id: taskDraft.assigned_role_id,
            location_id: 'wf_loc_main',
            station_id: taskDraft.station_id || null,
            due_time: dueTime,
            completion_status: 'open',
            critical: taskDraft.critical,
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      await recordEvent('TASK_OPENED', 'task', String(taskRow.id), {
        assigned_role_id: taskDraft.assigned_role_id,
        due_time: dueTime,
      });

      await fetchAll();
      setShowTaskForm(false);
      setTaskDraft((current) => ({ ...current, title: '', critical: false }));
    } catch (error) {
      alert(`Failed to create task: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const completeTask = async (task: WorkforceTask) => {
    if (String(task.completion_status || '').toLowerCase() === 'completed') return;

    setSaving(true);
    try {
      const completedAt = new Date().toISOString();
      const { error } = await supabase
        .from('workforce_tasks')
        .update({
          completion_status: 'completed',
          completed_by: actorName,
          completed_at: completedAt,
        })
        .eq('id', task.id);

      if (error) throw error;

      await recordEvent('TASK_COMPLETED', 'task', task.id, {
        completed_by: actorName,
      });

      await fetchAll();
    } catch (error) {
      alert(`Failed to complete task: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const createLogEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!logDraft.message.trim()) {
      alert('Log entry message is required.');
      return;
    }

    setSaving(true);
    try {
      const { data: row, error } = await supabase
        .from('workforce_log_entries')
        .insert([
          {
            author_name: actorName,
            timestamp: new Date().toISOString(),
            location_id: 'wf_loc_main',
            category: logDraft.category,
            severity: logDraft.severity,
            message: logDraft.message.trim(),
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      await recordEvent('LOG_ENTRY_CREATED', 'log_entry', String(row.id), {
        category: logDraft.category,
        severity: logDraft.severity,
      });

      await fetchAll();
      setShowLogForm(false);
      setLogDraft((current) => ({ ...current, message: '' }));
    } catch (error) {
      alert(`Failed to add log entry: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const buildUpcomingScheduleDigest = (employee: WorkforceEmployee) => {
    const now = startOfToday();
    const end = addDays(now, 7);
    const upcomingShifts = shifts
      .filter((shift) => {
        if (shift.employee_id !== employee.id) return false;
        const start = new Date(shift.start_time);
        if (Number.isNaN(start.getTime())) return false;
        return start.getTime() >= now.getTime() && start.getTime() < end.getTime();
      })
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    if (!upcomingShifts.length) {
      return `Hi ${employee.name},\n\nYou have no scheduled shifts for the next 7 days.\n\n- Spoonbill Workforce`;
    }

    const shiftLines = upcomingShifts.map((shift) => {
      const start = new Date(shift.start_time);
      const endTime = new Date(shift.end_time);
      const dateLabel = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeLabel = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      const roleLabel = roleById[shift.role_id]?.name || 'Shift';
      return `${dateLabel}: ${roleLabel} (${timeLabel})`;
    });

    return `Hi ${employee.name},\n\nHere is your schedule for the next 7 days:\n${shiftLines.join('\n')}\n\n- Spoonbill Workforce`;
  };

  const emailScheduleToEmployee = (employee: WorkforceEmployee) => {
    const toEmail = String(employee.email || '').trim();
    if (!toEmail) {
      alert('Add a contact email first.');
      return;
    }

    const subject = encodeURIComponent('Your Spoonbill Schedule (Next 7 Days)');
    const body = encodeURIComponent(buildUpcomingScheduleDigest(employee));
    window.location.href = `mailto:${encodeURIComponent(toEmail)}?subject=${subject}&body=${body}`;
  };

  const textScheduleToEmployee = (employee: WorkforceEmployee) => {
    const rawPhone = String(employee.phone || '').trim();
    if (!rawPhone) {
      alert('Add a phone number first.');
      return;
    }

    const normalizedPhone = rawPhone.replace(/[^\d+]/g, '');
    const body = encodeURIComponent(buildUpcomingScheduleDigest(employee));
    window.location.href = `sms:${normalizedPhone}?body=${body}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-none px-4 py-6 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">TEAM</h1>
            <p className="text-gray-600 font-garamond">
              Team profiles, scheduling, labor controls, and workforce operations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void publishTodaySchedule()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Publish Today's Schedule
          </button>
        </div>

        <section className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Team Members</div>
            <div className="text-2xl font-display font-bold text-gray-900">{employees.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Shifts Today</div>
            <div className="text-2xl font-display font-bold text-gray-900">{shiftsToday.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Live Clocked In</div>
            <div className="text-2xl font-display font-bold text-green-600">{openPunches.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Critical Tasks</div>
            <div className="text-2xl font-display font-bold text-amber-600">{unresolvedCriticalTasks.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Scheduled Hours</div>
            <div className="text-2xl font-display font-bold text-gray-900">{formatHours(scheduledHours)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Labor Cost (Live)</div>
            <div className="text-2xl font-display font-bold text-gray-900">${laborCost.toFixed(0)}</div>
            <div className="text-xs text-gray-500 mt-1">
              CA OT {caLaborSummary.overtimeHours.toFixed(1)}h, DT {caLaborSummary.doubleTimeHours.toFixed(1)}h
            </div>
          </div>
        </section>

        {showEmployeeForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-xl font-display font-bold text-gray-900">
                  {employeeEditorMode === 'create' ? 'Add Employee' : 'Edit Employee'}
                </h3>
                <button
                  type="button"
                  onClick={closeEmployeeEditor}
                  className="p-2 text-gray-500 hover:text-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(event) => void saveEmployeeProfile(event)} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team Member Name</label>
                    <input
                      value={employeeDraft.name}
                      onChange={(event) => setEmployeeDraft((current) => ({ ...current, name: event.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Title</label>
                    <input
                      value={employeeDraft.title}
                      onChange={(event) => setEmployeeDraft((current) => ({ ...current, title: event.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Manager, Bartender, Line Cook..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={employeeDraft.hire_date}
                      onChange={(event) => setEmployeeDraft((current) => ({ ...current, hire_date: event.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={employeeDraft.email}
                      onChange={(event) => setEmployeeDraft((current) => ({ ...current, email: event.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="teammember@spoonbill.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={employeeDraft.phone}
                      onChange={(event) => setEmployeeDraft((current) => ({ ...current, phone: event.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="(555) 555-5555"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                    <textarea
                      rows={2}
                      value={employeeDraft.availability}
                      onChange={(event) => setEmployeeDraft((current) => ({ ...current, availability: event.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g. Mon-Fri PM, unavailable Sundays"
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Roles + Pay Rates</h4>
                    <button
                      type="button"
                      onClick={addRoleDraftRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-ocean-200 text-ocean-700 rounded-md text-sm hover:bg-ocean-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add Role
                    </button>
                  </div>

                  <div className="space-y-2">
                    {employeeRoleDrafts.map((roleRow, index) => (
                      <div key={roleRow.id} className="grid md:grid-cols-12 gap-2 items-end border border-gray-100 rounded-lg p-2">
                        <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="primary-role"
                            checked={Boolean(roleRow.primary_role)}
                            onChange={() => setPrimaryRoleDraft(roleRow.id)}
                          />
                          Primary
                        </label>

                        <div className="md:col-span-5">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                          <select
                            value={roleRow.role_id}
                            onChange={(event) =>
                              updateRoleDraft(roleRow.id, {
                                role_id: event.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Rate ($/hr)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.25}
                            value={roleRow.hourly_rate}
                            onChange={(event) =>
                              updateRoleDraft(roleRow.id, {
                                hourly_rate: event.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeRoleDraft(roleRow.id)}
                            disabled={employeeRoleDrafts.length <= 1}
                            className="inline-flex items-center gap-1 px-2.5 py-2 border border-gray-200 rounded-md text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title={index === 0 ? 'Keep at least one role' : 'Remove role'}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Login Credentials</h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Login Username</label>
                      <input
                        type="email"
                        value={employeeDraft.login_username}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, login_username: event.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="employee@spoonbill.local"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="text"
                        value={employeeDraft.login_password}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, login_password: event.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder={employeeEditorMode === 'edit' ? 'Leave as-is or enter new password' : 'Required for new login'}
                      />
                    </div>
                    <label className="inline-flex items-end gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={employeeDraft.active}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, active: event.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      Active
                    </label>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">PTO Balance</h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Accrued Hours</label>
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={employeeDraft.pto_accrued_hours}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, pto_accrued_hours: event.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Used Hours</label>
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={employeeDraft.pto_used_hours}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, pto_used_hours: event.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Available Hours</label>
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={employeeDraft.pto_available_hours}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, pto_available_hours: event.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Access Levels</h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-700">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={employeeDraft.can_access_menu_management}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, can_access_menu_management: event.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      Menu Management
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={employeeDraft.can_access_operations}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, can_access_operations: event.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      Operations
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={employeeDraft.can_access_workforce}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, can_access_workforce: event.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      Workforce
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={employeeDraft.can_access_content_management}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, can_access_content_management: event.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      Content Management
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={employeeDraft.can_access_career_management}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, can_access_career_management: event.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      Career Management
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={employeeDraft.can_access_investment}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, can_access_investment: event.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      Investment
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={employeeDraft.can_access_settings}
                        onChange={(event) => setEmployeeDraft((current) => ({ ...current, can_access_settings: event.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      Settings
                    </label>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2">Operations Access</p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-700">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={employeeDraft.can_view_reservations}
                          onChange={(event) => setEmployeeDraft((current) => ({ ...current, can_view_reservations: event.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        Reservations
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={employeeDraft.can_view_events_parties}
                          onChange={(event) => setEmployeeDraft((current) => ({ ...current, can_view_events_parties: event.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        Event / Parties
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={employeeDraft.can_view_classes}
                          onChange={(event) => setEmployeeDraft((current) => ({ ...current, can_view_classes: event.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        Classes
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={employeeDraft.operations_classes_read_only}
                          onChange={(event) => setEmployeeDraft((current) => ({ ...current, operations_classes_read_only: event.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        Classes Read-Only
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Employee Files</h4>
                  {editingEmployee ? (
                    <>
                      <div className="grid md:grid-cols-3 gap-3">
                        <select
                          value={documentDraft.doc_type}
                          onChange={(event) => setDocumentDraft((current) => ({ ...current, doc_type: event.target.value }))}
                          className="px-3 py-2 border rounded-lg"
                        >
                          <option value="ID Scan">ID Scan</option>
                          <option value="Food Handlers Card">Food Handlers Card</option>
                          <option value="Write Up">Write Up</option>
                          <option value="Annual Review">Annual Review</option>
                          <option value="Certification">Certification</option>
                          <option value="Other">Other</option>
                        </select>
                        <input
                          value={documentDraft.notes}
                          onChange={(event) => setDocumentDraft((current) => ({ ...current, notes: event.target.value }))}
                          className="px-3 py-2 border rounded-lg md:col-span-2"
                          placeholder="Optional notes"
                        />
                      </div>
                      <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer w-fit">
                        <Upload className="h-4 w-4" />
                        Upload Document
                        <input
                          type="file"
                          className="hidden"
                          disabled={uploadingDocument}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            void uploadEmployeeDocument(file);
                            event.target.value = '';
                          }}
                        />
                      </label>
                      <div className="space-y-2">
                        {editingEmployeeDocuments.map((document) => (
                          <div key={document.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg p-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{document.file_name}</div>
                              <div className="text-xs text-gray-500">{document.doc_type} • {formatDateTime(document.uploaded_at || document.created_at)}</div>
                              {document.notes && <div className="text-xs text-gray-500">{document.notes}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={document.public_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded-md text-gray-700 hover:bg-gray-50"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                View
                              </a>
                              <button
                                type="button"
                                onClick={() => void deleteEmployeeDocument(document)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded-md text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                        {!editingEmployeeDocuments.length && (
                          <div className="text-sm text-gray-500">No files uploaded yet.</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Save the employee first, then upload ID scans, food handler cards, write-ups, and annual reviews.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEmployeeEditor}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-60"
                  >
                    {employeeEditorMode === 'create' ? 'Create Employee' : 'Save Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-display font-bold text-gray-900">Team</h2>
            <button
              type="button"
              onClick={openCreateEmployeeEditor}
              className="inline-flex items-center gap-2 px-3 py-2 border border-ocean-200 text-ocean-700 rounded-lg hover:bg-ocean-50"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Attendance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((employee) => {
                  const assignments = employeeRoleAssignmentsByEmployeeId[employee.id] || [];
                  const primaryAssignment =
                    assignments.find((assignment) => Boolean(assignment.primary_role)) || assignments[0];
                  const roleName = roleById[primaryAssignment?.role_id || '']?.name || employee.title || '-';
                  return (
                    <tr key={employee.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{employee.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{employee.email || '-'}</div>
                        <div className="text-sm text-gray-500">{employee.phone || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{roleName}</td>
                      <td className="px-4 py-3 text-gray-900">{Math.round(Number(employee.attendance_score || 0))}%</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => emailScheduleToEmployee(employee)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                            title="Email next 7 days schedule"
                          >
                            <Mail className="h-4 w-4" />
                            Email
                          </button>
                          <button
                            type="button"
                            onClick={() => textScheduleToEmployee(employee)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                            title="Text next 7 days schedule"
                          >
                            <MessageSquareText className="h-4 w-4" />
                            Text
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditEmployeeEditor(employee)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-display font-bold text-gray-900">Scheduler</h2>
              <p className="text-sm text-gray-500">
                Drag a shift onto another day/employee cell to duplicate. Range supports 4 weeks back and 4 weeks ahead.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setScheduleView('day')}
                className={`px-3 py-2 rounded-lg border ${scheduleView === 'day' ? 'bg-ocean-600 border-ocean-600 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setScheduleView('week')}
                className={`px-3 py-2 rounded-lg border ${scheduleView === 'week' ? 'bg-ocean-600 border-ocean-600 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setScheduleAnchorDate(startOfToday())}
                className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Today
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border border-gray-100 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveScheduleWindow(-1)}
                disabled={!canMoveSchedulePrev}
                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
                title={scheduleView === 'week' ? 'Previous week' : 'Previous day'}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900">
                <CalendarDays className="h-4 w-4 text-ocean-600" />
                <span className="font-medium">{scheduleLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => moveScheduleWindow(1)}
                disabled={!canMoveScheduleNext}
                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
                title={scheduleView === 'week' ? 'Next week' : 'Next day'}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowShiftForm((current) => !current)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-ocean-200 text-ocean-700 rounded-lg hover:bg-ocean-50"
              >
                <Plus className="h-4 w-4" />
                Add Shift
              </button>
              <button
                type="button"
                onClick={() => void copyPreviousWeek()}
                disabled={saving || scheduleView !== 'week'}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
                Copy Previous Week
              </button>
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                {!scheduleTemplates.length && <option value="">No Templates</option>}
                {scheduleTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void applyScheduleTemplate()}
                disabled={saving || scheduleView !== 'week' || !selectedTemplateId}
                className="px-3 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50"
              >
                Apply Template
              </button>
              <button
                type="button"
                onClick={() => void saveWeekAsTemplate()}
                disabled={saving || scheduleView !== 'week'}
                className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Save Week Template
              </button>
            </div>
          </div>

          {showShiftForm && (
            <form onSubmit={(event) => void createShift(event)} className="grid md:grid-cols-8 gap-3 bg-gray-50 p-4 rounded-lg">
              <select
                value={shiftDraft.employee_id}
                onChange={(event) => {
                  const employeeId = event.target.value;
                  const assignments = (employeeRoleAssignmentsByEmployeeId[employeeId] || []).filter(
                    (assignment) => assignment.active !== false,
                  );
                  const primaryAssignment =
                    assignments.find((assignment) => Boolean(assignment.primary_role)) || assignments[0];
                  const nextRoleId = primaryAssignment?.role_id || shiftDraft.role_id;
                  const nextRate =
                    roleRateByEmployeeIdRoleId[employeeId]?.[nextRoleId] ||
                    roleById[nextRoleId]?.hourly_rate ||
                    shiftDraft.wage_rate ||
                    24;

                  setShiftDraft((current) => ({
                    ...current,
                    employee_id: employeeId,
                    role_id: nextRoleId,
                    wage_rate: String(nextRate),
                  }));
                }}
                className="px-3 py-2 border rounded-lg"
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              <select
                value={shiftDraft.role_id}
                onChange={(event) => {
                  const roleId = event.target.value;
                  setShiftDraft((current) => ({
                    ...current,
                    role_id: roleId,
                    wage_rate: String(
                      roleRateByEmployeeIdRoleId[current.employee_id]?.[roleId] ||
                        roleById[roleId]?.hourly_rate ||
                        current.wage_rate ||
                        '',
                    ),
                  }));
                }}
                className="px-3 py-2 border rounded-lg"
              >
                {rolesForSelectedShiftEmployee.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <select
                value={shiftDraft.station_id}
                onChange={(event) => setShiftDraft((current) => ({ ...current, station_id: event.target.value }))}
                className="px-3 py-2 border rounded-lg"
              >
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={shiftDraft.date}
                onChange={(event) => setShiftDraft((current) => ({ ...current, date: event.target.value }))}
                className="px-3 py-2 border rounded-lg"
                min={formatDateKey(schedulerMinDate)}
                max={formatDateKey(schedulerMaxDate)}
              />
              <input
                type="time"
                value={shiftDraft.start_time}
                onChange={(event) => setShiftDraft((current) => ({ ...current, start_time: event.target.value }))}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="time"
                value={shiftDraft.end_time}
                onChange={(event) => setShiftDraft((current) => ({ ...current, end_time: event.target.value }))}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="number"
                min={1}
                step={0.25}
                value={shiftDraft.wage_rate}
                onChange={(event) => setShiftDraft((current) => ({ ...current, wage_rate: event.target.value }))}
                className="px-3 py-2 border rounded-lg"
                placeholder="Rate"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-60"
              >
                Save Shift
              </button>
            </form>
          )}

          {scheduleView === 'week' ? (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-40 px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    {scheduleDates.map((date) => (
                      <th key={formatDateKey(date)} className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="normal-case text-sm text-gray-700">{formatDateShort(date)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedEmployees.map((employee) => (
                    <tr key={employee.id} className="align-top border-t border-gray-100">
                      <td className="px-3 py-3 border-r border-gray-100">
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-xs text-gray-500">{employee.title || 'Team Member'}</div>
                        <div className="text-xs text-gray-500">
                          PTO: {Number(ptoByEmployeeId[employee.id]?.available_hours || 0).toFixed(1)}h
                        </div>
                      </td>
                      {scheduleDateKeys.map((dateKey) => {
                        const cellKey = `${employee.id}::${dateKey}`;
                        const cellShifts = (shiftsByEmployeeAndDate[cellKey] || [])
                          .slice()
                          .sort((a, b) => a.start_time.localeCompare(b.start_time));
                        const hasApprovedTimeOff = Boolean(
                          approvedTimeOffDatesByEmployee[employee.id]?.has(dateKey),
                        );

                        return (
                          <td
                            key={cellKey}
                            className={`px-1.5 py-2 border-r border-gray-100 ${hasApprovedTimeOff ? 'bg-amber-50/60' : 'bg-white'}`}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                              if (!draggingShiftId) return;
                              const sourceShift = shifts.find((shift) => shift.id === draggingShiftId);
                              if (!sourceShift) return;
                              void duplicateShiftToCell(sourceShift, dateKey, employee.id);
                            }}
                          >
                            {hasApprovedTimeOff && (
                              <div className="text-[11px] uppercase tracking-wide text-amber-700 font-semibold mb-1">
                                Approved Time Off
                              </div>
                            )}
                            <div className="space-y-1">
                              {cellShifts.map((shift) => (
                                <div
                                  key={shift.id}
                                  draggable
                                  onDragStart={() => setDraggingShiftId(shift.id)}
                                  onDragEnd={() => setDraggingShiftId(null)}
                                  className="rounded-md border border-ocean-200 bg-ocean-50 px-2 py-1 text-xs text-ocean-900"
                                >
                                  <div className="font-semibold truncate">{roleById[shift.role_id]?.name || 'Role'}</div>
                                  <div className="truncate">
                                    {toTimeLabel(shift.start_time)} - {toTimeLabel(shift.end_time)}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextDate = addDays(fromDateKey(dateKey), 1);
                                        const nextDateKey = formatDateKey(nextDate);
                                        if (
                                          nextDate.getTime() < schedulerMinDate.getTime() ||
                                          nextDate.getTime() > schedulerMaxDate.getTime()
                                        ) {
                                          alert('Cannot duplicate outside the 4-week range.');
                                          return;
                                        }
                                        void duplicateShiftToCell(shift, nextDateKey, shift.employee_id);
                                      }}
                                      className="text-ocean-700 hover:text-ocean-900"
                                      title="Duplicate to next day"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void deleteShift(shift)}
                                      className="text-red-600 hover:text-red-700"
                                      title="Delete shift"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {!cellShifts.length && (
                                <div className="text-[11px] text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-md">
                                  Drop shift here
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                Daily view for {scheduleLabel}. Dragging shifts is supported in week view.
              </div>
              {orderedEmployees.map((employee) => {
                const employeeShifts = dayViewShifts
                  .filter((shift) => shift.employee_id === employee.id)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));
                const dayKey = scheduleDateKeys[0];
                const hasApprovedTimeOff = dayKey
                  ? Boolean(approvedTimeOffDatesByEmployee[employee.id]?.has(dayKey))
                  : false;

                return (
                  <div key={employee.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-xs text-gray-500">{employee.title || 'Team Member'}</div>
                      </div>
                      {hasApprovedTimeOff && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                          Time Off
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {employeeShifts.map((shift) => (
                        <div key={shift.id} className="rounded-md border border-ocean-200 bg-ocean-50 px-3 py-2 flex items-center justify-between gap-3">
                          <div className="text-sm">
                            <div className="font-semibold text-ocean-900">{roleById[shift.role_id]?.name || 'Role'}</div>
                            <div className="text-ocean-800">
                              {toTimeLabel(shift.start_time)} - {toTimeLabel(shift.end_time)} ({(shiftDurationMinutes(shift) / 60).toFixed(1)}h)
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void clockInShift(shift)}
                              className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-800 hover:bg-green-200"
                            >
                              Clock In
                            </button>
                            <button
                              type="button"
                              onClick={() => void clockOutShift(shift)}
                              className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                            >
                              Clock Out
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteShift(shift)}
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {!employeeShifts.length && (
                        <div className="text-sm text-gray-500">No shift assigned.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-display font-bold text-gray-900">Time Off + PTO</h2>
              <p className="text-sm text-gray-500">Track sick time, day off requests, and PTO balances.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowTimeOffForm((current) => !current)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-ocean-200 text-ocean-700 rounded-lg hover:bg-ocean-50"
            >
              <Plus className="h-4 w-4" />
              Add Request
            </button>
          </div>

          {showTimeOffForm && (
            <form onSubmit={(event) => void createTimeOffRequest(event)} className="grid md:grid-cols-7 gap-3 bg-gray-50 p-4 rounded-lg">
              <select
                value={timeOffDraft.employee_id}
                onChange={(event) => setTimeOffDraft((current) => ({ ...current, employee_id: event.target.value }))}
                className="px-3 py-2 border rounded-lg"
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              <select
                value={timeOffDraft.request_type}
                onChange={(event) => setTimeOffDraft((current) => ({ ...current, request_type: event.target.value }))}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="day_off">Day Off</option>
                <option value="sick">Sick Time</option>
                <option value="pto">PTO</option>
              </select>
              <input
                type="date"
                value={timeOffDraft.start_date}
                onChange={(event) => setTimeOffDraft((current) => ({ ...current, start_date: event.target.value }))}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="date"
                value={timeOffDraft.end_date}
                onChange={(event) => setTimeOffDraft((current) => ({ ...current, end_date: event.target.value }))}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="number"
                min={0}
                step={0.25}
                value={timeOffDraft.hours}
                onChange={(event) => setTimeOffDraft((current) => ({ ...current, hours: event.target.value }))}
                className="px-3 py-2 border rounded-lg"
                placeholder="Hours"
              />
              <input
                value={timeOffDraft.notes}
                onChange={(event) => setTimeOffDraft((current) => ({ ...current, notes: event.target.value }))}
                className="px-3 py-2 border rounded-lg"
                placeholder="Notes"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-60"
              >
                Save Request
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {timeOffRequests
                  .slice()
                  .sort((a, b) => `${a.start_date}${a.created_at || ''}`.localeCompare(`${b.start_date}${b.created_at || ''}`))
                  .map((request) => (
                    <tr key={request.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{employeeById[request.employee_id]?.name || 'Employee'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 capitalize">{String(request.request_type || 'day_off').replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {request.start_date} to {request.end_date}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{Number(request.hours || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="capitalize text-gray-700">{request.status || 'pending'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void updateTimeOffStatus(request, 'approved')}
                            disabled={saving}
                            className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateTimeOffStatus(request, 'denied')}
                            disabled={saving}
                            className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                          >
                            Deny
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {!timeOffRequests.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                      No time-off requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {orderedEmployees.map((employee) => {
              const pto = ptoByEmployeeId[employee.id];
              return (
                <div key={`pto-${employee.id}`} className="rounded-lg border border-gray-100 p-3">
                  <div className="font-medium text-gray-900">{employee.name}</div>
                  <div className="text-xs text-gray-500">{employee.title || 'Employee'}</div>
                  <div className="mt-2 text-sm text-gray-700">
                    <div>Accrued: {Number(pto?.accrued_hours || 0).toFixed(1)}h</div>
                    <div>Used: {Number(pto?.used_hours || 0).toFixed(1)}h</div>
                    <div className="font-semibold">Available: {Number(pto?.available_hours || 0).toFixed(1)}h</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {false && (
          <>
            <section className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-gray-900">Station Tasks</h2>
              <button
                type="button"
                onClick={() => setShowTaskForm((current) => !current)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-ocean-200 text-ocean-700 rounded-lg hover:bg-ocean-50"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </div>

            {showTaskForm && (
              <form onSubmit={(event) => void createTask(event)} className="grid grid-cols-1 gap-3 bg-gray-50 p-4 rounded-lg">
                <input
                  value={taskDraft.title}
                  onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Task title"
                  className="px-3 py-2 border rounded-lg"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={taskDraft.assigned_role_id}
                    onChange={(event) =>
                      setTaskDraft((current) => ({ ...current, assigned_role_id: event.target.value }))
                    }
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
                <div className="grid grid-cols-2 gap-3">
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
                  disabled={saving}
                  className="px-3 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-60"
                >
                  Save Task
                </button>
              </form>
            )}

            <div className="space-y-2">
              {tasks.slice(0, 8).map((task) => {
                const completed = String(task.completion_status || '').toLowerCase() === 'completed';
                return (
                  <div key={task.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className={`font-medium ${completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {task.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {roleById[task.assigned_role_id || '']?.name || 'Role'} • {stationById[task.station_id || '']?.name || 'Station'}
                      </div>
                      <div className="text-sm text-gray-500">Due {formatDateTime(task.due_time)}</div>
                    </div>
                    {!completed ? (
                      <button
                        type="button"
                        onClick={() => void completeTask(task)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
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
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-gray-900">Manager Log Book</h2>
              <button
                type="button"
                onClick={() => setShowLogForm((current) => !current)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-ocean-200 text-ocean-700 rounded-lg hover:bg-ocean-50"
              >
                <NotebookPen className="h-4 w-4" />
                Add Entry
              </button>
            </div>

            {showLogForm && (
              <form onSubmit={(event) => void createLogEntry(event)} className="grid grid-cols-1 gap-3 bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
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
                  placeholder="Shift note, incident, 86, equipment issue, or handoff update..."
                  className="px-3 py-2 border rounded-lg"
                  required
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-60"
                >
                  Save Entry
                </button>
              </form>
            )}

            <div className="space-y-3">
              {logEntries
                .slice()
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .slice(0, 8)
                .map((entry) => (
                  <div key={entry.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{entry.author_name || 'Manager'}</span>
                      <span className="text-xs text-gray-500">{formatDateTime(entry.timestamp)}</span>
                    </div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                      {entry.category || 'operations'} • {entry.severity || 'info'}
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-line">{entry.message}</div>
                  </div>
                ))}
            </div>
              </div>
            </section>

            <section className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-4">Compliance Alerts</h2>
            <div className="space-y-3">
              {complianceWarnings.map((warning, index) => (
                <div key={`${warning.code}-${index}`} className="border border-gray-100 rounded-lg p-3 flex items-start gap-3">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${warning.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`} />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{warning.code}</div>
                    <div className="text-sm text-gray-700">{warning.message}</div>
                  </div>
                </div>
              ))}
              {complianceWarnings.length === 0 && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
                  No active compliance exceptions right now.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">Analytics Snapshot</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">Worked Hours</div>
                  <div className="font-semibold text-gray-900">{formatHours(workedHours)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">Schedule Adherence</div>
                  <div className="font-semibold text-gray-900">
                    {scheduledHours > 0 ? `${Math.min(100, Math.round((workedHours / scheduledHours) * 100))}%` : '0%'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">Open Events</div>
                  <div className="font-semibold text-gray-900">{events.length}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">Live Coverage</div>
                  <div className="font-semibold text-gray-900">{openPunches.length} stations</div>
                </div>
              </div>
            </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-4">Canonical Event Ledger</h2>
            <p className="text-sm text-gray-600 mb-4">
              Every action is captured as a typed event so scheduling, time tracking, tasks, compliance, and analytics stay in sync.
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {events.slice(0, 16).map((event) => (
                <div key={event.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-gray-900">{event.event_type}</div>
                    <div className="text-xs text-gray-500">{formatDateTime(event.timestamp)}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {event.subject_type || 'subject'}:{' '}
                    <span className="font-mono">{event.subject_id || '-'}</span>
                  </div>
                </div>
              ))}
              {!events.length && (
                <div className="text-sm text-gray-500">No events yet.</div>
              )}
            </div>
              </div>
            </section>

            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-display font-bold text-gray-900 mb-4">V1 Scope Anchors</h2>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-lg border border-gray-100 p-4">
                  <div className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-ocean-600" />
                    Workforce Planning
                  </div>
                  <p className="text-gray-600">Team roster, roles, stations, shifts, publish flow, and live reassignment controls.</p>
                </div>
                <div className="rounded-lg border border-gray-100 p-4">
                  <div className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-ocean-600" />
                    Labor Tracking
                  </div>
                  <p className="text-gray-600">Clock in/out ledger, overtime and break signals, and station-level labor cost visibility.</p>
                </div>
                <div className="rounded-lg border border-gray-100 p-4">
                  <div className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-ocean-600" />
                    Operations Control
                  </div>
                  <p className="text-gray-600">Task execution, manager logbook, and event-backed audit trail for reliable BOH decisions.</p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkforceManagement;
