import React, { useState, useEffect, useContext } from 'react';
import { FiBell, FiX, FiCalendar, FiPhone } from 'react-icons/fi';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const ReminderNotification = () => {
  const { user } = useContext(AuthContext);
  const [reminders, setReminders] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  
  const [formData, setFormData] = useState({
    status: '',
    notes: '',
  });

  const fetchReminders = async () => {
    if (!user) return;
    try {
      const response = await api.get('/customers/reminders/today');
      setReminders(response.data);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    }
  };

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.status || !formData.notes) {
      toast.error('Please fill in status and remarks');
      return;
    }

    try {
      const dateStr = new Date(selectedReminder.followUpDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      
      const newCallLog = {
        date: new Date(),
        status: formData.status,
        remark: formData.notes,
        employeeName: user?.name || 'Unknown'
      };

      const payload = {
        status: formData.status,
        notes: formData.notes,
        taskDate: dateStr,
        newCallLog
      };

      await api.put(`/customers/${selectedReminder._id}`, payload);
      toast.success('Reminder updated successfully');
      
      setIsOpen(false);
      setSelectedReminder(null);
      setFormData({ status: '', notes: '' });
      fetchReminders();
      // Dispatch an event to let other components (like Customers list) know to refresh
      window.dispatchEvent(new Event('customersUpdated'));
    } catch (error) {
      toast.error('Failed to update reminder');
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors focus:outline-none"
      >
        <FiBell className="text-xl" />
        {reminders.length > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FiCalendar className="text-primary" /> Today's Reminders
            </h3>
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{reminders.length}</span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {reminders.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm italic">
                No follow-ups scheduled for today.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {reminders.map(rem => (
                  <div key={rem._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{rem.name}</h4>
                        <p className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5"><FiPhone size={10} /> {rem.phone}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedReminder(rem)}
                        className="text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded transition-colors"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Update Modal */}
      {selectedReminder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
              <h3 className="font-bold text-gray-800 dark:text-white">Update Follow-up</h3>
              <button 
                onClick={() => setSelectedReminder(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Customer</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{selectedReminder.name} ({selectedReminder.phone})</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status Update</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                >
                  <option value="">Select Status</option>
                  <option value="Agree">Interested</option>
                  <option value="Reject">Rejected</option>
                  <option value="Others">Others</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                <textarea
                  required
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white resize-none"
                  placeholder="Enter call notes..."
                ></textarea>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedReminder(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-colors"
                >
                  Save Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderNotification;
