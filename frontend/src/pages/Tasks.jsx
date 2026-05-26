import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiCheckSquare, FiSearch, FiCheck, FiCalendar, FiCheckCircle } from 'react-icons/fi';

const Tasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', type: 'Call', dueDate: '', relatedCustomer: '', relatedLead: ''
  });

  const fetchData = async () => {
    try {
      const [taskRes, custRes, leadRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/customers'),
        api.get('/leads')
      ]);
      setTasks(taskRes.data);
      setCustomers(custRes.data);
      setLeads(leadRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.relatedCustomer) delete payload.relatedCustomer;
      if (!payload.relatedLead) delete payload.relatedLead;

      await api.post('/tasks', payload);
      toast.success('Task scheduled successfully');
      
      setIsModalOpen(false);
      setFormData({ title: '', description: '', type: 'Call', dueDate: '', relatedCustomer: '', relatedLead: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule task');
    }
  };

  const completeTask = async (id) => {
    try {
      await api.put(`/tasks/${id}/status`, { status: 'Completed' });
      toast.success('Task marked as completed');
      fetchData();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await api.delete(`/tasks/${id}`);
        toast.success('Task deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
            <FiCheckSquare className="mr-2 text-primary" /> Task & Follow-up Management
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Schedule calls and set reminders</p>
        </div>
        
        <button 
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setFormData({ title: '', description: '', type: 'Call', dueDate: tomorrow.toISOString().slice(0, 16), relatedCustomer: '', relatedLead: '' });
            setIsModalOpen(true);
          }}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-sm"
        >
          <FiPlus className="mr-2" /> Schedule Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <FiCalendar className="mr-2 text-secondary" /> Upcoming Follow-ups
          </h3>
          {loading ? (
             <div className="flex justify-center p-8">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
             </div>
          ) : tasks.filter(t => t.status === 'Pending').length > 0 ? (
            tasks.filter(t => t.status === 'Pending').map(task => (
              <div key={task._id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-l-4 border-l-primary border-gray-100 dark:border-gray-700 flex justify-between items-start transition-all hover:shadow-md">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      task.type === 'Call' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {task.type}
                    </span>
                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">{task.title}</h4>
                  </div>
                  {task.description && <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{task.description}</p>}
                  
                  <div className="flex items-center space-x-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center text-orange-500">
                      <FiCalendar className="mr-1" /> {new Date(task.dueDate).toLocaleString()}
                    </span>
                    {task.relatedCustomer && (
                      <span>👤 {task.relatedCustomer.name} {task.relatedCustomer.phone ? `- 📞 ${task.relatedCustomer.phone}` : ''}</span>
                    )}
                    {task.relatedLead && (
                      <span>🎯 {task.relatedLead.name} {task.relatedLead.phone ? `- 📞 ${task.relatedLead.phone}` : ''}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => completeTask(task._id)}
                    className="p-2 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                    title="Mark as Completed"
                  >
                    <FiCheck className="text-xl" />
                  </button>
                  <button 
                    onClick={() => deleteTask(task._id)}
                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                    title="Delete Task"
                  >
                    <FiTrash2 className="text-xl" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">No upcoming tasks. You're all caught up!</p>
            </div>
          )}
        </div>

        {/* Completed Tasks (Recent) */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <FiCheckCircle className="mr-2 text-green-500" /> Recently Completed
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-4">
            {!loading && tasks.filter(t => t.status === 'Completed').slice(0, 5).length > 0 ? (
              tasks.filter(t => t.status === 'Completed').slice(0, 5).map(task => (
                <div key={task._id} className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-through opacity-70">{task.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completed recently</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recently completed tasks.</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Schedule New Task</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title</label>
                <input 
                  type="text" required placeholder="e.g. Follow up call regarding pricing"
                  value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Type</label>
                  <select 
                    value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  >
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Reminder">Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date & Time</label>
                  <input 
                    type="datetime-local" required
                    value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to Customer (Optional)</label>
                <select 
                  value={formData.relatedCustomer} onChange={(e) => setFormData({...formData, relatedCustomer: e.target.value, relatedLead: ''})}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                >
                  <option value="">None</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes / Description</label>
                <textarea 
                  value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white resize-none"
                  rows="2"
                ></textarea>
              </div>
            </form>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end space-x-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleSubmit} className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium shadow-sm shadow-primary/30">
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
