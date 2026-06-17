import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import {
  FiPhone, FiUser, FiBriefcase, FiMapPin, FiMap, FiFileText,
  FiCalendar, FiCheckCircle, FiXCircle, FiSave, FiHash,
  FiChevronDown, FiAlertCircle, FiMail, FiClock
} from 'react-icons/fi';

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", 
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Lakshadweep", "Puducherry"
];

const STATUS_CONFIG = {
  Agree:   { label: 'Interested',     bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500', ring: 'ring-green-300 dark:ring-green-700' },
  Reject:  { label: 'Rejected',       bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-700 dark:text-red-400',   dot: 'bg-red-500',   ring: 'ring-red-300 dark:ring-red-700'   },
  Others:  { label: 'Others',         bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500', ring: 'ring-purple-300 dark:ring-purple-700' },
  Pending: { label: 'Pending',        bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-400', ring: 'ring-yellow-300 dark:ring-yellow-700' },
};

const CustomerDetailsSection = ({ customer, customers, onSelectCustomer, onCustomerUpdated }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [job, setJob] = useState('');
  const [status, setStatus] = useState('Pending');
  const [otherReason, setOtherReason] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [district, setDistrict] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [state, setState] = useState('');
  const [onboarding, setOnboarding] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync form state when active customer changes
  useEffect(() => {
    if (!customer) {
      setName('');
      setPhone('');
      setCompanyName('');
      setJob('');
      setStatus('Pending');
      setOtherReason('');
      setNotes('');
      setFollowUpDate('');
      setDistrict('');
      setFullAddress('');
      setPincode('');
      setState('');
      setOnboarding('');
      setReminderDate('');
    } else {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setCompanyName(customer.companyName || '');
      setJob(customer.job || '');
      setStatus(customer.status || 'Pending');
      setOtherReason(customer.otherReason || '');
      setNotes(customer.notes || '');
      setFollowUpDate(customer.followUpDate ? customer.followUpDate.slice(0, 10) : '');
      setDistrict(customer.district || customer.address || '');
      setFullAddress(customer.fullAddress || '');
      setPincode(customer.pincode || '');
      setState(customer.state || '');
      setOnboarding(customer.onboarding || '');
      setReminderDate('');
    }
  }, [customer?._id]);

  const displayStatus = customer?.status || 'Pending';
  const cfg = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.Pending;

  const handleStatusClick = (newStatus) => {
    setStatus(newStatus);
  };

  const handlePincodeChange = async (val) => {
    setPincode(val);
    if (val.length === 6 && /^\d+$/.test(val)) {
      try {
        const response = await api.get(`/customers/pincode/${val}`);
        const data = response.data;
        if (data && data[0] && data[0].Status === 'Success') {
          const postOffices = data[0].PostOffice;
          if (postOffices && postOffices.length > 0) {
            const po = postOffices.find(p => p.DeliveryStatus === 'Delivery') || postOffices[0];
            setDistrict(po.District);
            setState(po.State);
            toast.success('District and State auto-resolved from Pin Code!');
          }
        }
      } catch (err) {
        console.error('Failed to resolve pincode:', err);
      }
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    
    if (!/^[1-9][0-9]{9}$/.test(phone)) {
      toast.error('Phone number must be exactly 10 digits and cannot start with 0');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        name,
        phone,
        companyName,
        job,
        status,
        notes,
        otherReason: status === 'Others' ? otherReason : '',
        followUpDate: status === 'Agree' ? (followUpDate || null) : null,
        district,
        fullAddress,
        pincode,
        state,
        onboarding,
        newCallLog: { status, remark: notes || otherReason || 'Status updated' }
      };

      let customerIdToUse = customer?._id;

      if (customer?._id) {
        // Update existing customer
        await api.put(`/customers/${customer._id}`, payload);
        toast.success('Customer details updated successfully!');
        onCustomerUpdated({ ...customer, ...payload });
      } else {
        // Create new customer manually
        const res = await api.post('/customers', payload);
        customerIdToUse = res.data._id;
        toast.success('New customer created and saved!');
        onCustomerUpdated(res.data);
      }

      // Schedule a task/reminder if requested
      if (reminderDate) {
        try {
          await api.post('/tasks', {
            title: `Call Back: ${name}`,
            description: `Scheduled reminder to call ${name} at ${phone}. ${notes ? 'Notes: ' + notes : ''}`,
            type: 'Call',
            dueDate: reminderDate,
            relatedCustomer: customerIdToUse
          });
          toast.success('Follow-up task scheduled successfully!');
          setReminderDate('');
        } catch (e) {
          console.error(e);
          toast.error('Customer saved, but failed to schedule the reminder task.');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit customer details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <FiPhone className="text-primary text-lg" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white text-base leading-tight">Customer Details</h2>
            <p className="text-xs text-gray-400">Active Call Panel</p>
          </div>
        </div>

        {/* Customer selector */}
        <div className="relative">
          <select
            className="appearance-none text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl pl-3 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-700 dark:text-gray-200 max-w-[220px] shadow-sm"
            onChange={(e) => {
              if (e.target.value === 'new') {
                onSelectCustomer(null);
              } else {
                onSelectCustomer(customers.find(c => c._id === e.target.value));
              }
            }}
            value={customer?._id || 'new'}
          >
            <option value="new">New Customer / Manual Entry</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </select>
          <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* ── Current Status Badge ─────────────────────── */}
        <div className={`flex items-center justify-between p-3 rounded-xl ring-1 ${cfg.bg} ${cfg.ring}`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${displayStatus === 'Agree' ? 'animate-pulse' : ''}`} />
            <span className={`text-sm font-bold ${cfg.text}`}>Current Status: {cfg.label}</span>
          </div>
          <span className="text-xs text-gray-400 font-mono">ID: {customer?.customerId || 'New'}</span>
        </div>

        {/* ── Customer Info Fields ─────────────────────── */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer Information</p>
          <div className="space-y-4 bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Customer Name</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 transition-all font-semibold"
                  placeholder="Customer Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone Number</label>
              <div className="relative">
                <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="tel"
                  maxLength={10}
                  required
                  pattern="^[1-9][0-9]{9}$"
                  title="Phone number must be exactly 10 digits and cannot start with 0"
                  value={phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    if (val.startsWith('0')) val = val.substring(1); // Remove leading zero
                    setPhone(val);
                  }}
                  className="w-full bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 transition-all font-semibold"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Company</label>
              <div className="relative">
                <FiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 transition-all font-semibold"
                  placeholder="Company Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Onboarding Option</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <select
                  value={onboarding}
                  onChange={e => setOnboarding(e.target.value)}
                  className="w-full bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 transition-all font-semibold appearance-none"
                >
                  <option value="">Select Onboarding Option</option>
                  <option value="District Partner">District Partner</option>
                  <option value="Seller">Seller</option>
                  <option value="Interview Call">Interview Call</option>
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">State</label>
              <div className="relative">
                <FiMap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 transition-all font-semibold appearance-none"
                >
                  <option value="">Select State</option>
                  {indianStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pin Number</label>
              <div className="relative">
                <FiHash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  value={pincode}
                  onChange={e => handlePincodeChange(e.target.value)}
                  className="w-full bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 transition-all font-semibold"
                  placeholder="Enter Pin Number (e.g. 700001)"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">District</label>
              <div className="relative">
                <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="w-full bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 transition-all font-semibold"
                  placeholder="District Name"
                />
              </div>
            </div>

            <div className="col-span-full md:col-span-2 lg:col-span-1">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Address</label>
              <div className="relative">
                <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  value={fullAddress}
                  onChange={e => setFullAddress(e.target.value)}
                  className="w-full bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 transition-all font-semibold"
                  placeholder="Enter Full Address"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Conditional Response Section ── */}
        {customer && customer.status === 'Agree' && (customer.onboarding === 'Seller' || customer.onboarding === 'District Partner' || customer.onboarding === 'Interview Call') ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
            <FiCheckCircle className="text-blue-500 mb-2" size={24} />
            <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
              Already Onboarded as {customer.onboarding}
            </p>
          </div>
        ) : (
          <>
            {/* ── Mark Response ────────────────────────────── */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Mark Customer Response</p>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleStatusClick('Agree')}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl text-xs font-bold transition-all border-2 ${
                    status === 'Agree'
                      ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200 dark:shadow-none'
                      : 'bg-white dark:bg-gray-700 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10'
                  }`}
                >
                  <FiCheckCircle size={18} />
                  <span>Interested</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusClick('Reject')}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl text-xs font-bold transition-all border-2 ${
                    status === 'Reject'
                      ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200 dark:shadow-none'
                      : 'bg-white dark:bg-gray-700 border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                  }`}
                >
                  <FiXCircle size={18} />
                  <span>Rejected</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusClick('Others')}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl text-xs font-bold transition-all border-2 ${
                    status === 'Others'
                      ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-200 dark:shadow-none'
                      : 'bg-white dark:bg-gray-700 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                  }`}
                >
                  <FiAlertCircle size={18} />
                  <span>Others</span>
                </button>
              </div>
            </div>

            {/* ── Reason Field (Only shown when status is Others) ── */}
            {status === 'Others' && (
              <div className="animate-fade-in">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  Reason
                </label>
                <input
                  type="text"
                  placeholder="Enter the reason..."
                  value={otherReason}
                  onChange={e => setOtherReason(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 transition-all font-medium"
                />
              </div>
            )}

            {/* ── Follow-up Date (Only shown when status is Interested / Agree) ── */}
            {status === 'Agree' && (
              <div className="animate-fade-in">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <FiCalendar size={12} /> Follow-up Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 transition-all font-semibold"
                />
              </div>
            )}
          </>
        )}

        {/* ── Remarks ───────────────────────────────────── */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <FiFileText size={12} /> Remarks
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Write your remarks from this call..."
            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 resize-none transition-all"
          />
        </div>

        {/* ── Schedule Call Back Reminder ── */}
        {!(customer && (customer.onboarding === 'Seller' || customer.onboarding === 'District Partner' || customer.onboarding === 'Interview Call')) && (
          <div className="pt-2 animate-fade-in">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <FiClock size={14} className="text-blue-500" /> Schedule Reminder / Call Back (Optional)
            </label>
            <input
              type="datetime-local"
              value={reminderDate}
              onChange={e => setReminderDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 transition-all font-medium"
            />
            <p className="text-[11px] text-gray-500 mt-1.5">If set, a Task will be automatically added to your Tasks panel so you won't forget to call them back.</p>
          </div>
        )}

        {/* ── Submit Data Button ───────────────────────── */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60 shadow-md shadow-primary/20 cursor-pointer"
        >
          <FiSave size={16} />
          {saving ? 'Submitting Data…' : 'Submit Data'}
        </button>
      </form>
    </div>
  );
};

export default CustomerDetailsSection;
