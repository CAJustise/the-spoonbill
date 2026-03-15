import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  NotebookPen,
  Plus,
  Save,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface WorkforceEmployee {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  title?: string;
  status: 'active' | 'inactive' | string;
  default_location_id: string;
  pay_basis?: string;
  hourly_rate?: number;
  attendance_score?: number;
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

const WorkforceManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employees, setEmployees] = useState<WorkforceEmployee[]>([]);
  const [roles, setRoles] = useState<WorkforceRole[]>([]);
  const [stations, setStations] = useState<WorkforceStation[]>([]);
  const [shifts, setShifts] = useState<WorkforceShift[]>([]);
  const [punches, setPunches] = useState<WorkforcePunch[]>([]);
  const [breaks, setBreaks] = useState<WorkforceBreak[]>([]);
  const [tasks, setTasks] = useState<WorkforceTask[]>([]);
  const [logEntries, setLogEntries] = useState<WorkforceLogEntry[]>([]);
  const [events, setEvents] = useState<WorkforceEvent[]>([]);

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  const [actorUserId, setActorUserId] = useState('system');
  const [actorName, setActorName] = useState('Manager');

  const [employeeDraft, setEmployeeDraft] = useState({
    name: '',
    email: '',
    title: '',
    role_id: '',
    hourly_rate: '24',
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

  const fetchAll = async () => {
    const [
      employeesRes,
      rolesRes,
      stationsRes,
      shiftsRes,
      punchesRes,
      breaksRes,
      tasksRes,
      logsRes,
      eventsRes,
    ] = await Promise.all([
      supabase.from('workforce_employees').select('*').order('name'),
      supabase.from('workforce_roles').select('*').order('name'),
      supabase.from('workforce_stations').select('*').order('name'),
      supabase.from('workforce_shifts').select('*').order('start_time'),
      supabase.from('workforce_punches').select('*').order('clock_in'),
      supabase.from('workforce_breaks').select('*').order('start_time'),
      supabase.from('workforce_tasks').select('*').order('due_time'),
      supabase.from('workforce_log_entries').select('*').order('timestamp'),
      supabase.from('workforce_events').select('*').order('timestamp', { ascending: false }),
    ]);

    const errors = [
      employeesRes.error,
      rolesRes.error,
      stationsRes.error,
      shiftsRes.error,
      punchesRes.error,
      breaksRes.error,
      tasksRes.error,
      logsRes.error,
      eventsRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      throw new Error(errors[0]?.message || 'Failed loading Workforce data');
    }

    setEmployees((employeesRes.data as WorkforceEmployee[]) || []);
    setRoles((rolesRes.data as WorkforceRole[]) || []);
    setStations((stationsRes.data as WorkforceStation[]) || []);
    setShifts((shiftsRes.data as WorkforceShift[]) || []);
    setPunches((punchesRes.data as WorkforcePunch[]) || []);
    setBreaks((breaksRes.data as WorkforceBreak[]) || []);
    setTasks((tasksRes.data as WorkforceTask[]) || []);
    setLogEntries((logsRes.data as WorkforceLogEntry[]) || []);
    setEvents((eventsRes.data as WorkforceEvent[]) || []);
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
  }, [employeeDraft.role_id, roles]);

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

  const today = startOfToday();
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

  const workedHours = useMemo(
    () =>
      punches.reduce((total, punch) => {
        const clockIn = new Date(punch.clock_in).getTime();
        const clockOut = new Date(punch.clock_out || new Date().toISOString()).getTime();
        if (Number.isNaN(clockIn) || Number.isNaN(clockOut) || clockOut <= clockIn) return total;
        return total + (clockOut - clockIn) / 3600000;
      }, 0),
    [punches],
  );

  const laborCost = useMemo(
    () =>
      punches.reduce((total, punch) => {
        const shift = shifts.find((candidate) => candidate.id === punch.shift_id);
        if (!shift) return total;

        const clockIn = new Date(punch.clock_in).getTime();
        const clockOut = new Date(punch.clock_out || new Date().toISOString()).getTime();
        if (Number.isNaN(clockIn) || Number.isNaN(clockOut) || clockOut <= clockIn) return total;

        const hours = (clockOut - clockIn) / 3600000;
        const roleRate = Number(roleById[shift.role_id]?.hourly_rate || 0);
        const rate = Number(shift.wage_rate || roleRate || 0);
        return total + hours * rate;
      }, 0),
    [punches, roleById, shifts],
  );

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

      if (durationHours > 5 && linkedBreaks.length === 0) {
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

  const createEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeDraft.name.trim()) {
      alert('Employee name is required.');
      return;
    }

    setSaving(true);
    try {
      const { data: employeeRows, error: employeeError } = await supabase
        .from('workforce_employees')
        .insert([
          {
            name: employeeDraft.name.trim(),
            email: employeeDraft.email.trim(),
            title: employeeDraft.title.trim() || roleById[employeeDraft.role_id]?.name || 'Employee',
            status: 'active',
            default_location_id: 'wf_loc_main',
            pay_basis: 'hourly',
            hourly_rate: Number(employeeDraft.hourly_rate || roleById[employeeDraft.role_id]?.hourly_rate || 24),
            attendance_score: 100,
          },
        ])
        .select('*')
        .single();

      if (employeeError) throw employeeError;
      if (!employeeRows?.id) throw new Error('Employee was created without an id.');

      const { error: roleError } = await supabase.from('workforce_employee_roles').insert([
        {
          employee_id: String(employeeRows.id),
          role_id: employeeDraft.role_id,
          primary_role: true,
          active: true,
        },
      ]);

      if (roleError) throw roleError;

      await recordEvent('EMPLOYEE_CREATED', 'employee', String(employeeRows.id), {
        role_id: employeeDraft.role_id,
      });

      await fetchAll();
      setShowEmployeeForm(false);
      setEmployeeDraft({ name: '', email: '', title: '', role_id: employeeDraft.role_id, hourly_rate: '24' });
    } catch (error) {
      alert(`Failed to create employee: ${(error as Error).message}`);
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
            wage_rate: Number(shiftDraft.wage_rate || roleById[shiftDraft.role_id]?.hourly_rate || 24),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">BOH Workforce OS</h1>
            <p className="text-gray-600 font-garamond">
              Unified labor ledger for team, scheduling, live shift control, tasks, compliance, and operations memory.
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
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-display font-bold text-gray-900">Team</h2>
            <button
              type="button"
              onClick={() => setShowEmployeeForm((current) => !current)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-ocean-200 text-ocean-700 rounded-lg hover:bg-ocean-50"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </div>

          {showEmployeeForm && (
            <form onSubmit={(event) => void createEmployee(event)} className="grid md:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-lg">
              <input
                value={employeeDraft.name}
                onChange={(event) => setEmployeeDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Employee name"
                className="px-3 py-2 border rounded-lg"
                required
              />
              <input
                value={employeeDraft.email}
                onChange={(event) => setEmployeeDraft((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email"
                className="px-3 py-2 border rounded-lg"
              />
              <select
                value={employeeDraft.role_id}
                onChange={(event) => {
                  const roleId = event.target.value;
                  const role = roleById[roleId];
                  setEmployeeDraft((current) => ({
                    ...current,
                    role_id: roleId,
                    title: role?.name || current.title,
                    hourly_rate: String(role?.hourly_rate || current.hourly_rate || '24'),
                  }));
                }}
                className="px-3 py-2 border rounded-lg"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={employeeDraft.hourly_rate}
                onChange={(event) =>
                  setEmployeeDraft((current) => ({ ...current, hourly_rate: event.target.value }))
                }
                placeholder="Hourly rate"
                className="px-3 py-2 border rounded-lg"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-60"
              >
                Save Employee
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Attendance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((employee) => {
                  const currentShift = shiftsToday.find((shift) => shift.employee_id === employee.id);
                  return (
                    <tr key={employee.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.email || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{currentShift ? roleById[currentShift.role_id]?.name : employee.title || '-'}</td>
                      <td className="px-4 py-3 text-gray-900">${Number(employee.hourly_rate || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-900">{Math.round(Number(employee.attendance_score || 0))}%</td>
                      <td className="px-4 py-3">
                        <span className={employee.status === 'active' ? 'text-green-600' : 'text-gray-500'}>
                          {employee.status || 'active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-display font-bold text-gray-900">Schedule + Live Shift Control</h2>
            <button
              type="button"
              onClick={() => setShowShiftForm((current) => !current)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-ocean-200 text-ocean-700 rounded-lg hover:bg-ocean-50"
            >
              <Plus className="h-4 w-4" />
              Add Shift
            </button>
          </div>

          {showShiftForm && (
            <form onSubmit={(event) => void createShift(event)} className="grid md:grid-cols-7 gap-3 bg-gray-50 p-4 rounded-lg">
              <select
                value={shiftDraft.employee_id}
                onChange={(event) => setShiftDraft((current) => ({ ...current, employee_id: event.target.value }))}
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
                    wage_rate: String(roleById[roleId]?.hourly_rate || current.wage_rate || ''),
                  }));
                }}
                className="px-3 py-2 border rounded-lg"
              >
                {roles.map((role) => (
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
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-60"
              >
                Save Shift
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role / Station</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Shift Window</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Live</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shiftsToday.map((shift) => {
                  const employeeName = employeeById[shift.employee_id]?.name || 'Unassigned';
                  const roleName = roleById[shift.role_id]?.name || 'Role';
                  const stationName = stationById[shift.station_id || '']?.name || 'Station';
                  const openPunch = (punchByShiftId[shift.id] || []).find((punch) => !punch.clock_out);

                  return (
                    <tr key={shift.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{employeeName}</td>
                      <td className="px-4 py-3 text-gray-900">
                        {roleName}
                        <div className="text-sm text-gray-500">{stationName}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {formatDateTime(shift.start_time)} - {formatDateTime(shift.end_time)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-gray-700">{shift.status || 'draft'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {openPunch ? (
                          <button
                            type="button"
                            onClick={() => void clockOutShift(shift)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            <Clock3 className="h-4 w-4" />
                            Clock Out
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void clockInShift(shift)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            <Clock3 className="h-4 w-4" />
                            Clock In
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!shiftsToday.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No shifts scheduled today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

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
      </div>
    </div>
  );
};

export default WorkforceManagement;
