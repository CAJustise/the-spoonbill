import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ClassEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  price: string | null;
  image_url: string;
  booking_type: 'class' | 'event' | 'reservation' | null;
  booking_url: string | null;
  booking_capacity?: number;
  active: boolean;
  display_order: number;
}

interface ClassBooking {
  id: string;
  event_id: string;
  class_title?: string;
  class_date?: string;
  class_time?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  guest_count: number;
  special_requests?: string;
  status?: string;
  created_at?: string;
}

const CLASS_STATUS_OPTIONS = ['pending', 'confirmed', 'checked-in', 'completed', 'cancelled'];

const formatClock = (value: string) => {
  if (!value) return '';
  const [hours, minutes] = value.split(':');
  const date = new Date();
  date.setHours(Number(hours || 0), Number(minutes || 0), 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const BOHClasses: React.FC = () => {
  const [classEvents, setClassEvents] = useState<ClassEvent[]>([]);
  const [classBookings, setClassBookings] = useState<ClassBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isClassFormOpen, setIsClassFormOpen] = useState(false);
  const [editingClassEvent, setEditingClassEvent] = useState<ClassEvent | null>(null);
  const [editingBooking, setEditingBooking] = useState<ClassBooking | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchClassEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('booking_type', 'class')
      .order('date')
      .order('time');

    if (error) {
      throw new Error(error.message || 'Failed to load class schedule');
    }

    setClassEvents((data as ClassEvent[]) || []);
  };

  const fetchClassBookings = async () => {
    const { data, error } = await supabase
      .from('class_bookings')
      .select('*')
      .order('class_date')
      .order('class_time');

    if (error) {
      throw new Error(error.message || 'Failed to load class bookings');
    }

    setClassBookings((data as ClassBooking[]) || []);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchClassEvents(), fetchClassBookings()]);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classEventMap = useMemo(
    () =>
      classEvents.reduce((accumulator, classEvent) => {
        accumulator[classEvent.id] = classEvent;
        return accumulator;
      }, {} as Record<string, ClassEvent>),
    [classEvents],
  );

  const bookingLoadByEvent = useMemo(
    () =>
      classBookings.reduce((accumulator, booking) => {
        const status = (booking.status || 'pending').toLowerCase();
        if (status === 'cancelled' || status === 'declined') {
          return accumulator;
        }
        accumulator[booking.event_id] = (accumulator[booking.event_id] || 0) + Number(booking.guest_count || 0);
        return accumulator;
      }, {} as Record<string, number>),
    [classBookings],
  );

  const filteredBookings = useMemo(
    () =>
      classBookings.filter((booking) => {
        if (filterStatus === 'all') return true;
        return (booking.status || 'pending').toLowerCase() === filterStatus;
      }),
    [classBookings, filterStatus],
  );

  const handleOpenCreateClass = () => {
    setEditingClassEvent(null);
    setIsClassFormOpen(true);
  };

  const handleOpenEditClass = (classEvent: ClassEvent) => {
    setEditingClassEvent(classEvent);
    setIsClassFormOpen(true);
  };

  const handleClassSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get('title') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      date: String(formData.get('date') || '').trim(),
      time: String(formData.get('time') || '').trim(),
      price: String(formData.get('price') || '').trim() || null,
      image_url: String(formData.get('image_url') || '').trim(),
      booking_type: 'class' as const,
      booking_url: null,
      booking_capacity: Number(formData.get('booking_capacity') || 16),
      display_order: Number(formData.get('display_order') || 0),
      active: Boolean(formData.get('active')),
    };

    if (!payload.title || !payload.description || !payload.date || !payload.time || !payload.image_url) {
      alert('Title, description, date, time, and image URL are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingClassEvent) {
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editingClassEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('events')
          .insert([payload]);
        if (error) throw error;
      }

      await fetchClassEvents();
      setIsClassFormOpen(false);
      setEditingClassEvent(null);
    } catch (error) {
      alert(`Failed to save class schedule: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Delete this class schedule item? Existing signups will remain in class bookings.')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', classId);
      if (error) throw error;
      await fetchClassEvents();
    } catch (error) {
      alert(`Failed to delete class schedule item: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBookingDelete = async (bookingId: string) => {
    if (!confirm('Delete this class signup?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('class_bookings')
        .delete()
        .eq('id', bookingId);
      if (error) throw error;
      await fetchClassBookings();
    } catch (error) {
      alert(`Failed to delete class booking: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBookingUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingBooking) return;

    const formData = new FormData(event.currentTarget);
    const payload = {
      customer_name: String(formData.get('customer_name') || '').trim(),
      customer_email: String(formData.get('customer_email') || '').trim(),
      customer_phone: String(formData.get('customer_phone') || '').trim(),
      guest_count: Number(formData.get('guest_count') || 1),
      special_requests: String(formData.get('special_requests') || '').trim(),
      status: String(formData.get('status') || 'pending').trim().toLowerCase(),
    };

    if (!payload.customer_name || !payload.customer_email) {
      alert('Name and email are required.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('class_bookings')
        .update(payload)
        .eq('id', editingBooking.id);
      if (error) throw error;
      await fetchClassBookings();
      setEditingBooking(null);
    } catch (error) {
      alert(`Failed to update class booking: ${(error as Error).message}`);
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Classes Calendar</h1>
            <p className="text-gray-600 font-garamond">
              Schedule classes, set capacities, and manage class attendee signups.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateClass}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700"
          >
            <Plus className="h-4 w-4" />
            Add Class
          </button>
        </div>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-4">Class Schedule</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date / Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Capacity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classEvents.map((classEvent) => {
                  const enrolled = bookingLoadByEvent[classEvent.id] || 0;
                  const capacity = Number(classEvent.booking_capacity || 0);
                  const remaining = Math.max(0, capacity - enrolled);

                  return (
                    <tr key={classEvent.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{classEvent.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-2">{classEvent.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{classEvent.date}</div>
                        <div className="text-sm text-gray-500">{formatClock(classEvent.time)}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{classEvent.price || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">
                          {enrolled}/{capacity}
                        </div>
                        <div className="text-sm text-gray-500">{remaining} remaining</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={classEvent.active ? 'text-green-600' : 'text-gray-500'}>
                          {classEvent.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditClass(classEvent)}
                          className="inline-flex items-center justify-center p-2 text-ocean-600 hover:text-ocean-700"
                          title="Edit class"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteClass(classEvent.id)}
                          className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-700"
                          title="Delete class"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!classEvents.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No classes scheduled yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <h2 className="text-xl font-display font-bold text-gray-900">Class Bookings</h2>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">All Statuses</option>
              {CLASS_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status[0].toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Guest</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Party</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map((booking) => {
                  const classEvent = classEventMap[booking.event_id];
                  return (
                    <tr key={booking.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {booking.class_title || classEvent?.title || 'Class Session'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.class_date || classEvent?.date || '-'} {formatClock(booking.class_time || classEvent?.time || '')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{booking.customer_name}</div>
                        <div className="text-sm text-gray-500">{booking.customer_email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{booking.guest_count}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-gray-700">{booking.status || 'pending'}</span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingBooking(booking)}
                          className="inline-flex items-center justify-center p-2 text-ocean-600 hover:text-ocean-700"
                          title="Edit booking"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleBookingDelete(booking.id)}
                          className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-700"
                          title="Delete booking"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filteredBookings.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No class bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isClassFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-display font-bold text-gray-900">
                {editingClassEvent ? 'Edit Class' : 'Add Class'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsClassFormOpen(false);
                  setEditingClassEvent(null);
                }}
                className="p-2 text-gray-500 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(event) => void handleClassSubmit(event)} className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    name="title"
                    defaultValue={editingClassEvent?.title || ''}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    name="price"
                    defaultValue={editingClassEvent?.price || ''}
                    placeholder="$85"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingClassEvent?.date || ''}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    name="time"
                    defaultValue={editingClassEvent?.time || ''}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    name="booking_capacity"
                    defaultValue={editingClassEvent?.booking_capacity ?? 16}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    min={0}
                    name="display_order"
                    defaultValue={editingClassEvent?.display_order ?? 0}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    name="image_url"
                    defaultValue={editingClassEvent?.image_url || ''}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue={editingClassEvent?.description || ''}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={editingClassEvent?.active ?? true}
                      className="rounded border-gray-300"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsClassFormOpen(false);
                    setEditingClassEvent(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-ocean-600 text-white hover:bg-ocean-700 disabled:opacity-60"
                >
                  {editingClassEvent ? 'Save Class' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingBooking && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-display font-bold text-gray-900">Edit Class Booking</h3>
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="p-2 text-gray-500 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(event) => void handleBookingUpdate(event)} className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    name="customer_name"
                    defaultValue={editingBooking.customer_name}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="customer_email"
                    defaultValue={editingBooking.customer_email}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    name="customer_phone"
                    defaultValue={editingBooking.customer_phone}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    name="guest_count"
                    defaultValue={editingBooking.guest_count}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingBooking.status || 'pending'}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {CLASS_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status[0].toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                <textarea
                  rows={3}
                  name="special_requests"
                  defaultValue={editingBooking.special_requests || ''}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-ocean-600 text-white hover:bg-ocean-700 disabled:opacity-60"
                >
                  Save Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BOHClasses;
