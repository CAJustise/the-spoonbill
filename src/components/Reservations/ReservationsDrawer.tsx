import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, CalendarRange, GlassWater } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
}

const ReservationsDrawer: React.FC = () => {
  const [reservationType, setReservationType] = useState<'dining' | 'events'>('dining');
  const [step, setStep] = useState(1);
  const [date, setDate] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data for dining reservation
  const [diningForm, setDiningForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialRequests: ''
  });

  // Form data for event booking
  const [eventForm, setEventForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    eventType: '',
    guestCount: 10,
    duration: 2,
    budgetRange: '',
    cateringNeeded: false,
    barServiceNeeded: false,
    avEquipmentNeeded: false,
    setupRequirements: '',
    specialRequests: ''
  });

  useEffect(() => {
    if (date && partySize) {
      fetchAvailableTimeSlots();
    }
  }, [date, partySize]);

  const fetchAvailableTimeSlots = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get day of week (0-6, where 0 is Sunday)
      const dayOfWeek = new Date(date).getDay();

      const { data: slots, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('is_event_slot', reservationType === 'events')
        .eq('active', true)
        .order('start_time');

      if (error) throw error;
      setTimeSlots(slots || []);

    } catch (error) {
      console.error('Error fetching time slots:', error);
      setError('Error loading available times. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDiningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert([{
          customer_name: diningForm.name,
          customer_email: diningForm.email,
          customer_phone: diningForm.phone,
          party_size: partySize,
          reservation_date: date,
          reservation_time: selectedTimeSlot,
          special_requests: diningForm.specialRequests
        }])
        .select()
        .single();

      if (error) throw error;

      // Show success message and reset form
      alert('Reservation submitted successfully! We will confirm your reservation shortly.');
      setStep(1);
      setDiningForm({
        name: '',
        email: '',
        phone: '',
        specialRequests: ''
      });
      setDate('');
      setPartySize(2);
      setSelectedTimeSlot('');

    } catch (error) {
      console.error('Error submitting reservation:', error);
      setError('Error submitting reservation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('event_bookings')
        .insert([{
          event_type: eventForm.eventType,
          customer_name: eventForm.name,
          customer_email: eventForm.email,
          customer_phone: eventForm.phone,
          company_name: eventForm.companyName,
          guest_count: eventForm.guestCount,
          event_date: date,
          event_time: selectedTimeSlot,
          duration_hours: eventForm.duration,
          budget_range: eventForm.budgetRange,
          catering_needed: eventForm.cateringNeeded,
          bar_service_needed: eventForm.barServiceNeeded,
          av_equipment_needed: eventForm.avEquipmentNeeded,
          setup_requirements: eventForm.setupRequirements,
          special_requests: eventForm.specialRequests
        }])
        .select()
        .single();

      if (error) throw error;

      // Show success message and reset form
      alert('Event booking request submitted successfully! Our events team will contact you shortly.');
      setStep(1);
      setEventForm({
        name: '',
        email: '',
        phone: '',
        companyName: '',
        eventType: '',
        guestCount: 10,
        duration: 2,
        budgetRange: '',
        cateringNeeded: false,
        barServiceNeeded: false,
        avEquipmentNeeded: false,
        setupRequirements: '',
        specialRequests: ''
      });
      setDate('');
      setSelectedTimeSlot('');

    } catch (error) {
      console.error('Error submitting event booking:', error);
      setError('Error submitting event booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  };

  const renderDiningReservationForm = () => (
    <div className="space-y-8">
      {step === 1 ? (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party Size
            </label>
            <select
              value={partySize}
              onChange={(e) => setPartySize(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                <option key={size} value={size}>
                  {size} {size === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>

          {date && partySize && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {timeSlots.map(slot => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedTimeSlot(slot.start_time)}
                    className={`px-4 py-2 rounded-lg border ${
                      selectedTimeSlot === slot.start_time
                        ? 'bg-ocean-600 text-white border-ocean-600'
                        : 'border-gray-300 hover:border-ocean-600'
                    }`}
                  >
                    {formatTime(slot.start_time)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!date || !partySize || !selectedTimeSlot}
              className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleDiningSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={diningForm.name}
              onChange={(e) => setDiningForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={diningForm.email}
              onChange={(e) => setDiningForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={diningForm.phone}
              onChange={(e) => setDiningForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Requests
            </label>
            <textarea
              value={diningForm.specialRequests}
              onChange={(e) => setDiningForm(prev => ({ ...prev, specialRequests: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-2 text-gray-600 hover:text-gray-900"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Reservation'}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  const renderEventBookingForm = () => (
    <div className="space-y-8">
      {step === 1 ? (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              value={eventForm.eventType}
              onChange={(e) => setEventForm(prev => ({ ...prev, eventType: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            >
              <option value="">Select event type</option>
              <option value="Corporate">Corporate Event</option>
              <option value="Birthday">Birthday Celebration</option>
              <option value="Anniversary">Anniversary</option>
              <option value="Wedding">Wedding Reception</option>
              <option value="Holiday">Holiday Party</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guest Count
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value={eventForm.guestCount}
              onChange={(e) => setEventForm(prev => ({ ...prev, guestCount: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            />
          </div>

          {date && eventForm.eventType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {timeSlots.map(slot => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedTimeSlot(slot.start_time)}
                    className={`px-4 py-2 rounded-lg border ${
                      selectedTimeSlot === slot.start_time
                        ? 'bg-ocean-600 text-white border-ocean-600'
                        : 'border-gray-300 hover:border-ocean-600'
                    }`}
                  >
                    {formatTime(slot.start_time)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!date || !eventForm.eventType || !selectedTimeSlot}
              className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleEventSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <input
              type="text"
              value={eventForm.name}
              onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={eventForm.email}
              onChange={(e) => setEventForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={eventForm.phone}
              onChange={(e) => setEventForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name (if applicable)
            </label>
            <input
              type="text"
              value={eventForm.companyName}
              onChange={(e) => setEventForm(prev => ({ ...prev, companyName: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (hours)
            </label>
            <input
              type="number"
              min="2"
              max="8"
              value={eventForm.duration}
              onChange={(e) => setEventForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Budget Range
            </label>
            <select
              value={eventForm.budgetRange}
              onChange={(e) => setEventForm(prev => ({ ...prev, budgetRange: e.target.value }))}
              className="w- full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              required
            >
              <option value="">Select budget range</option>
              <option value="$1,000 - $2,500">$1,000 - $2,500</option>
              <option value="$2,500 - $5,000">$2,500 - $5,000</option>
              <option value="$5,000 - $10,000">$5,000 - $10,000</option>
              <option value="$10,000+">$10,000+</option>
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="catering"
                checked={eventForm.cateringNeeded}
                onChange={(e) => setEventForm(prev => ({ ...prev, cateringNeeded: e.target.checked }))}
                className="rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
              />
              <label htmlFor="catering" className="text-sm text-gray-700">
                Catering Service Needed
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bar"
                checked={eventForm.barServiceNeeded}
                onChange={(e) => setEventForm(prev => ({ ...prev, barServiceNeeded: e.target.checked }))}
                className="rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
              />
              <label htmlFor="bar" className="text-sm text-gray-700">
                Bar Service Needed
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="av"
                checked={eventForm.avEquipmentNeeded}
                onChange={(e) => setEventForm(prev => ({ ...prev, avEquipmentNeeded: e.target.checked }))}
                className="rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
              />
              <label htmlFor="av" className="text-sm text-gray-700">
                AV Equipment Needed
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Setup Requirements
            </label>
            <textarea
              value={eventForm.setupRequirements}
              onChange={(e) => setEventForm(prev => ({ ...prev, setupRequirements: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
              placeholder="Describe any specific setup needs..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Requests
            </label>
            <textarea
              value={eventForm.specialRequests}
              onChange={(e) => setEventForm(prev => ({ ...prev, specialRequests: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-2 text-gray-600 hover:text-gray-900"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Event Request'}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="prose prose-lg max-w-none">
        <p className="text-xl text-gray-600 font-garamond leading-relaxed">
          Reserve your spot at The Spoonbill Lounge. Whether you're joining us for dinner, planning a special event, or booking a mixology class, we're here to ensure your experience is exceptional.
        </p>

        {/* Reservation Type Selector */}
        <div className="grid grid-cols-2 gap-px bg-gray-200 rounded-lg overflow-hidden my-8">
          <button
            onClick={() => {
              setReservationType('dining');
              setStep(1);
            }}
            className={`py-4 text-lg font-garamond transition-colors ${
              reservationType === 'dining'
                ? 'bg-ocean-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Dining Reservations
          </button>
          <button
            onClick={() => {
              setReservationType('events');
              setStep(1);
            }}
            className={`py-4 text-lg font-garamond transition-colors ${
              reservationType === 'events'
                ? 'bg-ocean-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Events & Classes
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg">
          <h3 className="text-2xl font-display font-bold text-gray-900 mb-4">
            {reservationType === 'dining' ? 'Make a Reservation' : 'Book an Event'}
          </h3>
          
          {reservationType === 'dining' ? renderDiningReservationForm() : renderEventBookingForm()}
        </div>
      </div>
    </div>
  );
};

export default ReservationsDrawer;