import { supabase } from './supabase';

export type ReservationBookingType = 'dining' | 'events';

const NON_COUNTING_STATUSES = new Set(['cancelled', 'declined']);

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return fallback;
  return numberValue;
};

const shouldCountAgainstCapacity = (status: unknown) => {
  const normalizedStatus = String(status ?? 'pending').trim().toLowerCase();
  return !NON_COUNTING_STATUSES.has(normalizedStatus);
};

const getDayOfWeek = (isoDate: string) => new Date(`${isoDate}T00:00:00`).getDay();

export const getTimeSlotsForType = async (isoDate: string, bookingType: ReservationBookingType) => {
  const dayOfWeek = getDayOfWeek(isoDate);
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .eq('is_event_slot', bookingType === 'events')
    .eq('active', true)
    .order('start_time');

  if (error) {
    throw new Error(error.message || 'Unable to load time slots');
  }

  return Array.isArray(data) ? data : [];
};

const fetchSlotLoadMap = async (isoDate: string, bookingType: ReservationBookingType) => {
  if (bookingType === 'dining') {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('reservation_date', isoDate);
    if (error) {
      throw new Error(error.message || 'Unable to load reservations');
    }

    return (Array.isArray(data) ? data : []).reduce((accumulator, row) => {
      if (!shouldCountAgainstCapacity((row as { status?: unknown }).status)) {
        return accumulator;
      }
      const time = String((row as { reservation_time?: unknown }).reservation_time ?? '').trim();
      if (!time) return accumulator;
      accumulator[time] = (accumulator[time] || 0) + toNumber((row as { party_size?: unknown }).party_size, 0);
      return accumulator;
    }, {} as Record<string, number>);
  }

  const { data, error } = await supabase
    .from('event_bookings')
    .select('*')
    .eq('event_date', isoDate);
  if (error) {
    throw new Error(error.message || 'Unable to load event bookings');
  }

  return (Array.isArray(data) ? data : []).reduce((accumulator, row) => {
    if (!shouldCountAgainstCapacity((row as { status?: unknown }).status)) {
      return accumulator;
    }
    const time = String((row as { event_time?: unknown }).event_time ?? '').trim();
    if (!time) return accumulator;
    accumulator[time] = (accumulator[time] || 0) + toNumber((row as { guest_count?: unknown }).guest_count, 0);
    return accumulator;
  }, {} as Record<string, number>);
};

export interface SlotAvailability {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  used: number;
  remaining: number;
  isFull: boolean;
}

export const getSlotAvailability = async (isoDate: string, bookingType: ReservationBookingType) => {
  const [slots, slotLoadMap] = await Promise.all([
    getTimeSlotsForType(isoDate, bookingType),
    fetchSlotLoadMap(isoDate, bookingType),
  ]);

  return slots.map((slot) => {
    const startTime = String((slot as { start_time?: unknown }).start_time ?? '');
    const used = toNumber(slotLoadMap[startTime], 0);
    const capacity = toNumber((slot as { capacity?: unknown }).capacity, 0);
    const remaining = Math.max(0, capacity - used);
    return {
      id: String((slot as { id?: unknown }).id ?? ''),
      startTime,
      endTime: String((slot as { end_time?: unknown }).end_time ?? ''),
      capacity,
      used,
      remaining,
      isFull: remaining <= 0,
    };
  });
};

export const validateSlotCapacity = async (
  isoDate: string,
  startTime: string,
  requestSize: number,
  bookingType: ReservationBookingType,
) => {
  const slotAvailability = await getSlotAvailability(isoDate, bookingType);
  const slot = slotAvailability.find((candidate) => candidate.startTime === startTime);

  if (!slot) {
    return {
      allowed: false,
      capacity: 0,
      used: 0,
      remaining: 0,
      message: 'Selected time is no longer available.',
    };
  }

  if (slot.remaining < requestSize) {
    return {
      allowed: false,
      capacity: slot.capacity,
      used: slot.used,
      remaining: slot.remaining,
      message: `Only ${slot.remaining} spots remain for this time.`,
    };
  }

  return {
    allowed: true,
    capacity: slot.capacity,
    used: slot.used,
    remaining: slot.remaining,
    message: '',
  };
};

export const validateClassCapacity = async (eventId: string, requestSize: number) => {
  const { data: classEvent, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError) {
    throw new Error(eventError.message || 'Unable to load class details');
  }

  if (!classEvent) {
    throw new Error('Class event not found');
  }

  const capacity = toNumber((classEvent as { booking_capacity?: unknown }).booking_capacity, 0);

  const { data: bookings, error: bookingsError } = await supabase
    .from('class_bookings')
    .select('*')
    .eq('event_id', eventId);

  if (bookingsError) {
    throw new Error(bookingsError.message || 'Unable to load class bookings');
  }

  const used = (Array.isArray(bookings) ? bookings : []).reduce((total, row) => {
    if (!shouldCountAgainstCapacity((row as { status?: unknown }).status)) {
      return total;
    }
    return total + toNumber((row as { guest_count?: unknown }).guest_count, 0);
  }, 0);

  const remaining = Math.max(0, capacity - used);
  if (remaining < requestSize) {
    return {
      allowed: false,
      capacity,
      used,
      remaining,
      message: `Only ${remaining} class spots remain.`,
      classEvent,
    };
  }

  return {
    allowed: true,
    capacity,
    used,
    remaining,
    message: '',
    classEvent,
  };
};
