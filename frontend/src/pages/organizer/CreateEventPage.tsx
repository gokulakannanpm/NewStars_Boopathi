import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarPlus,
  Bus,
  MessageCircle,
  Clock,
  MapPin,
  Users,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  Building,
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api/client';
import { College, EventCategory, EventFormat } from '../../api/types';
import { Modal } from '../../components/common/Modal';
import { CategoryBadge } from '../../components/common/CategoryBadge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const CreateEventPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [colleges, setColleges] = useState<College[]>([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('Hackathon');
  const [posterUrl, setPosterUrl] = useState('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('18:00');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [venue, setVenue] = useState('Auditorium & Labs');
  const [latitude, setLatitude] = useState<number | undefined>(13.0109);
  const [longitude, setLongitude] = useState<number | undefined>(80.2354);
  const [format, setFormat] = useState<EventFormat>('offline');

  // Natural numeric editing state (avoids "0200" bug and enables smooth backspacing)
  const [feeInput, setFeeInput] = useState('0');
  const [feeError, setFeeError] = useState<string | null>(null);
  const [capacityInput, setCapacityInput] = useState('150');
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState('Enrolled undergraduate and postgraduate college students');

  // Transport toggle & PDF document
  const [hasTransport, setHasTransport] = useState(true);
  const [transportPdfFile, setTransportPdfFile] = useState<File | null>(null);
  const [pickupPointsText, setPickupPointsText] = useState('Central Railway Station, Guindy Metro, Tambaram');
  const [depTime, setDepTime] = useState('07:30 AM');
  const [retTime, setRetTime] = useState('07:00 PM');
  const [transportContact, setTransportContact] = useState('Coordinator: +91 94440 12345');

  // WhatsApp
  const [whatsappLink, setWhatsappLink] = useState('https://chat.whatsapp.com/EveHubDemoEvent');

  // Agenda
  const [agenda, setAgenda] = useState<{ time: string; activity: string }[]>([
    { time: '09:00 AM', activity: 'Registration & Participant Kit Distribution' },
    { time: '10:00 AM', activity: 'Inaugural Keynote & Track Problem Releases' },
    { time: '01:00 PM', activity: 'Working Lunch & Mentorship Phase 1' },
    { time: '05:00 PM', activity: 'Final Submissions & Jury Evaluation' },
  ]);

  // Preview Drawer
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getColleges().then(setColleges).catch(console.error);

    // Set default dates
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const dateStr = d.toISOString().split('T')[0];
    setStartDate(dateStr);
    setEndDate(dateStr);
    const dl = new Date(d);
    dl.setDate(dl.getDate() - 2);
    setDeadlineDate(dl.toISOString().split('T')[0]);
  }, []);

  const handleAddAgendaItem = () => {
    setAgenda([...agenda, { time: '12:00 PM', activity: 'Technical Session' }]);
  };

  const handleRemoveAgendaItem = (idx: number) => {
    setAgenda(agenda.filter((_, i) => i !== idx));
  };

  const handleUpdateAgendaItem = (idx: number, field: 'time' | 'activity', val: string) => {
    const next = [...agenda];
    next[idx][field] = val;
    setAgenda(next);
  };

  const handlePosterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select an image file (JPEG, PNG, WebP, GIF)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Poster image must be smaller than 5MB');
      return;
    }

    setPosterFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPosterPreview(objectUrl);
    setPosterUrl(objectUrl);
    toast.success(`Selected "${file.name}" for upload.`);
  };

  const handleRemovePoster = () => {
    setPosterFile(null);
    setPosterPreview('');
    setPosterUrl('');
  };

  const handleTransportPdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a valid PDF document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Transport PDF must be smaller than 10MB');
      return;
    }

    setTransportPdfFile(file);
    toast.success(`Attached "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  };

  const handleRemoveTransportPdf = () => {
    setTransportPdfFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !startDate || !endDate || !venue) {
      toast.error('Please complete all mandatory fields');
      return;
    }

    // Validate numeric fee input
    const parsedFee = feeInput.trim() === '' ? 0 : Number(feeInput.trim());
    if (isNaN(parsedFee) || parsedFee < 0) {
      setFeeError('Fee must be a valid non-negative number (0 for free).');
      toast.error('Please enter a valid non-negative fee amount.');
      return;
    }

    // Validate numeric capacity input
    const parsedCapacity = parseInt(capacityInput.trim(), 10);
    if (isNaN(parsedCapacity) || parsedCapacity < 1) {
      setCapacityError('Capacity must be at least 1.');
      toast.error('Please enter a valid seat capacity limit.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload poster if local file selected
      let finalPosterUrl = posterUrl;
      if (posterFile) {
        try {
          const uploadRes = await api.uploadPoster(posterFile);
          finalPosterUrl = uploadRes.url;
        } catch (uploadErr: any) {
          toast.error(`Poster upload failed: ${uploadErr.message}`);
          setSubmitting(false);
          return;
        }
      }

      // 2. Upload transport PDF if file attached
      let finalTransportPdfUrl: string | undefined = undefined;
      if (hasTransport && transportPdfFile) {
        try {
          const pdfRes = await api.uploadTransportPdf(transportPdfFile);
          finalTransportPdfUrl = pdfRes.url;
        } catch (pdfErr: any) {
          toast.error(`Transport PDF upload failed: ${pdfErr.message}`);
          setSubmitting(false);
          return;
        }
      }

      const fullStart = `${startDate}T${startTime}:00`;
      const fullEnd = `${endDate}T${endTime}:00`;
      const fullDl = `${deadlineDate}T06:00:00`;

      const transportDetails = hasTransport
        ? {
            available: true,
            pickup_points: pickupPointsText.split(',').map((p) => p.trim()).filter(Boolean),
            departure_time: depTime,
            return_time: retTime,
            contact_person: transportContact,
            notes: 'Valid EveHub QR Pass required to board shuttle.',
          }
        : undefined;

      const newEvt = await api.createEvent({
        title,
        description,
        category,
        poster_url: finalPosterUrl,
        start_date: fullStart,
        end_date: fullEnd,
        registration_deadline: fullDl,
        venue,
        latitude,
        longitude,
        format,
        fee: parsedFee,
        capacity: parsedCapacity,
        eligibility,
        has_transport: hasTransport,
        transport_details: transportDetails,
        transport_pdf_url: finalTransportPdfUrl,
        whatsapp_group_link: whatsappLink || undefined,
        agenda: agenda.length > 0 ? agenda : undefined,
        status: 'open',
      });

      toast.success('Event published successfully!');
      navigate(`/events/${newEvt.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not publish event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            Publish New Collegiate Event
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure institutional guidelines, schedule parameters, transport shuttles, and agenda
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
        >
          <Eye className="w-4 h-4 text-slate-500" />
          <span>Live Preview</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Core Information */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Event Overview
          </h2>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Event Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Shaastra 2026: AI & Edge Robotics Hackathon"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs bg-slate-50/50 outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs bg-slate-50/50 outline-hidden cursor-pointer"
              >
                <option value="Hackathon">Hackathon</option>
                <option value="Technical">Technical</option>
                <option value="Symposium">Symposium</option>
                <option value="Workshop">Workshop</option>
                <option value="Cultural">Cultural</option>
                <option value="Sports">Sports</option>
                <option value="Management">Management</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Format *</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs bg-slate-50/50 outline-hidden cursor-pointer"
              >
                <option value="offline">Offline / On-Campus</option>
                <option value="online">Online / Virtual</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Description & Problem Overview *</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the competition format, challenges, prizes, and institutional significance..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs bg-slate-50/50 outline-hidden focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Event Poster Image</label>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <label className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 border border-indigo-200 text-xs">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Browse Device / Upload Poster</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handlePosterFileChange}
                    className="hidden"
                  />
                </label>
                {posterFile && (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium truncate max-w-xs">{posterFile.name}</span>
                    <button
                      type="button"
                      onClick={handleRemovePoster}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                      title="Remove selected image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Poster Preview */}
              {(posterPreview || posterUrl) && (
                <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-slate-200 shadow-xs group bg-slate-100">
                  <img
                    src={posterPreview || posterUrl}
                    alt="Event poster preview"
                    className="w-full h-36 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={handleRemovePoster}
                      className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                    <span>{posterFile ? `Local file: ${posterFile.name}` : 'Using URL'}</span>
                    <span>Ready for publish</span>
                  </div>
                </div>
              )}

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Or provide direct image URL:</span>
                <input
                  type="url"
                  value={posterUrl}
                  onChange={(e) => {
                    setPosterUrl(e.target.value);
                    setPosterPreview(e.target.value);
                    if (posterFile) setPosterFile(null);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs bg-slate-50/50 outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Venue Parameters */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Schedule & Venue Coordinates
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Start Date & Time *</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-2/3 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
                />
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-1/3 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">End Date & Time *</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-2/3 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
                />
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-1/3 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Registration Cutoff Deadline *</label>
              <input
                type="date"
                required
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Campus Venue & Hall *</label>
              <input
                type="text"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="IC&SR Auditorium & Labs"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Latitude (for Distance Filter)</label>
              <input
                type="number"
                step="0.0001"
                value={latitude ?? ''}
                onChange={(e) => setLatitude(parseFloat(e.target.value) || undefined)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={longitude ?? ''}
                onChange={(e) => setLongitude(parseFloat(e.target.value) || undefined)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Capacity & Fees */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Capacity & Registration Fees
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Fee in INR (0 = Free Event) *</label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={feeInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*$/.test(val)) {
                    setFeeInput(val);
                    setFeeError(null);
                  } else {
                    setFeeError('Please enter numbers only.');
                  }
                }}
                onBlur={() => {
                  if (feeInput.trim() === '') {
                    setFeeInput('0');
                  }
                }}
                placeholder="0"
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  feeError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50'
                } outline-hidden focus:border-indigo-500 text-slate-900 font-medium`}
              />
              {feeError ? (
                <p className="text-[11px] text-rose-500 mt-1">{feeError}</p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1">
                  {feeInput === '0' || feeInput === '' ? '✓ Free event (no ticket fee)' : `Ticket price: ₹${feeInput}`}
                </p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Seat Capacity Limit *</label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={capacityInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*$/.test(val)) {
                    setCapacityInput(val);
                    setCapacityError(null);
                  } else {
                    setCapacityError('Please enter numbers only.');
                  }
                }}
                onBlur={() => {
                  if (capacityInput.trim() === '' || parseInt(capacityInput, 10) < 1) {
                    setCapacityInput('100');
                  }
                }}
                placeholder="100"
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  capacityError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50'
                } outline-hidden focus:border-indigo-500 text-slate-900 font-medium`}
              />
              {capacityError ? (
                <p className="text-[11px] text-rose-500 mt-1">{capacityError}</p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1">Total seats before waitlist activates</p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">WhatsApp Group Link</label>
              <input
                type="url"
                value={whatsappLink}
                onChange={(e) => setWhatsappLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Eligibility Criteria</label>
            <input
              type="text"
              value={eligibility}
              onChange={(e) => setEligibility(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
            />
          </div>
        </div>

        {/* Transport Information Section */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Bus className="w-5 h-5 text-indigo-600" />
              <span>College Shuttle Transport Service</span>
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasTransport}
                onChange={(e) => setHasTransport(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="font-semibold text-xs text-slate-800">Enable College Bus Service</span>
            </label>
          </div>

          {hasTransport && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Designated Pickup Points (Comma Separated)
                </label>
                <input
                  type="text"
                  value={pickupPointsText}
                  onChange={(e) => setPickupPointsText(e.target.value)}
                  placeholder="Central Railway Station, Guindy Metro, Tambaram"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Morning Departure Time</label>
                  <input
                    type="text"
                    value={depTime}
                    onChange={(e) => setDepTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Evening Return Time</label>
                  <input
                    type="text"
                    value={retTime}
                    onChange={(e) => setRetTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bus In-Charge Contact</label>
                  <input
                    type="text"
                    value={transportContact}
                    onChange={(e) => setTransportContact(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
                  />
                </div>
              </div>

              {/* Transport Schedule PDF Document */}
              <div className="pt-2 border-t border-slate-100">
                <label className="font-semibold text-slate-700 block mb-1">
                  Upload Official College Transport PDF / Route Document
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Attach your institution's official bus schedule PDF. EveHub uses this to power the grounded student Ask AI route assistant.
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 border border-slate-200 text-xs">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Browse College Transport PDF</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleTransportPdfChange}
                      className="hidden"
                    />
                  </label>

                  {transportPdfFile && (
                    <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-200">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <div className="text-left">
                        <span className="font-semibold block truncate max-w-xs">{transportPdfFile.name}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {(transportPdfFile.size / 1024 / 1024).toFixed(2)} MB • Ready for AI grounding
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveTransportPdf}
                        className="text-slate-400 hover:text-rose-600 ml-2"
                        title="Remove PDF"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Agenda Timeline Builder */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>Event Agenda Timeline</span>
            </h2>
            <button
              type="button"
              onClick={handleAddAgendaItem}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-2">
            {agenda.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.time}
                  onChange={(e) => handleUpdateAgendaItem(idx, 'time', e.target.value)}
                  placeholder="09:00 AM"
                  className="w-32 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden font-mono"
                />
                <input
                  type="text"
                  value={item.activity}
                  onChange={(e) => handleUpdateAgendaItem(idx, 'activity', e.target.value)}
                  placeholder="Activity description"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAgendaItem(idx)}
                  className="p-2 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-8 py-3 rounded-xl transition-colors shadow-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Publishing Event...' : 'Publish Event Listing'}</span>
          </button>
        </div>
      </form>

      {/* Live Preview Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Event Listing Live Preview"
        subtitle="Simulated public listing card as attendees will see it"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <img src={posterUrl} alt={title} className="w-full h-44 object-cover" />
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <CategoryBadge category={category} />
                <span className="font-bold text-slate-900">{feeInput === '0' || feeInput === '' ? 'Free' : `₹${feeInput}`}</span>
              </div>
              <h3 className="font-bold text-base text-slate-900">{title || 'Untitled Event'}</h3>
              <p className="text-slate-600">{description || 'No description provided.'}</p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
                <span>Date: {startDate}</span>
                <span>Venue: {venue}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setPreviewOpen(false)}
            className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-xs"
          >
            Close Preview
          </button>
        </div>
      </Modal>
    </div>
  );
};
