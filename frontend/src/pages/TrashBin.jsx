import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  FiTrash2, FiRotateCcw, FiSearch, FiRefreshCw, FiAlertTriangle, 
  FiMessageCircle, FiUser, FiX, FiCheck, FiFileText, FiClock, FiEye
} from 'react-icons/fi';
import { IoCheckmarkDoneOutline, IoCheckmarkOutline, IoTimeOutline } from "react-icons/io5";

const TrashBin = () => {
  const { user } = useContext(AuthContext);
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'chats', 'leads'
  const [selectedPhones, setSelectedPhones] = useState([]);

  // Modals state
  const [previewPhone, setPreviewPhone] = useState(null);
  const [chatPreviewData, setChatPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', phones: [] });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch trash items
  const fetchTrash = async () => {
    setLoading(true);
    try {
      const response = await api.get('/trash');
      setTrashItems(response.data);
    } catch (error) {
      toast.error('Failed to load trash items');
      console.error('Error loading trash items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  // Filtered items
  const filteredItems = trashItems.filter((item) => {
    const matchesSearch =
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.phone || '').includes(searchTerm) ||
      (item.onboarding || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isChat = item.type.includes('Chat');
    const isLead = item.type.includes('Lead');

    if (activeTab === 'chats') return matchesSearch && isChat;
    if (activeTab === 'leads') return matchesSearch && isLead;
    return matchesSearch;
  });

  // Counts for cards & tabs
  const chatCount = trashItems.filter(i => i.type.includes('Chat')).length;
  const leadCount = trashItems.filter(i => i.type.includes('Lead')).length;
  const totalCount = trashItems.length;

  // Selection handlers
  const toggleSelect = (phone) => {
    setSelectedPhones((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPhones.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedPhones([]);
    } else {
      setSelectedPhones(filteredItems.map((item) => item.phone));
    }
  };

  // Restore action
  const handleRestore = async (phones) => {
    if (!phones || phones.length === 0) return;
    setActionLoading(true);
    const toastId = toast.loading(`Recovering ${phones.length} item(s)...`);

    try {
      const response = await api.post('/trash/restore', { phoneNumbers: phones });
      toast.success(response.data.message || 'Recovered successfully with WhatsApp chat!', { id: toastId });
      setSelectedPhones((prev) => prev.filter((p) => !phones.includes(p)));
      if (previewPhone && phones.includes(previewPhone)) {
        setPreviewPhone(null);
        setChatPreviewData(null);
      }
      fetchTrash();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to recover items', { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  // Permanent delete action
  const handlePermanentDelete = async (phones) => {
    if (!phones || phones.length === 0) return;
    setActionLoading(true);
    const toastId = toast.loading(`Permanently deleting ${phones.length} item(s)...`);

    try {
      const response = await api.post('/trash/permanent-delete', { phoneNumbers: phones });
      toast.success(response.data.message || 'Items permanently deleted from database', { id: toastId });
      setSelectedPhones((prev) => prev.filter((p) => !phones.includes(p)));
      setConfirmModal({ isOpen: false, type: '', phones: [] });
      if (previewPhone && phones.includes(previewPhone)) {
        setPreviewPhone(null);
        setChatPreviewData(null);
      }
      fetchTrash();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete items', { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  // Empty entire trash
  const handleEmptyTrash = async () => {
    setActionLoading(true);
    const toastId = toast.loading('Emptying entire trash bin...');

    try {
      const response = await api.delete('/trash/empty');
      toast.success(response.data.message || 'Trash bin emptied successfully', { id: toastId });
      setSelectedPhones([]);
      setConfirmModal({ isOpen: false, type: '', phones: [] });
      fetchTrash();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to empty trash', { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  // Chat preview opener
  const openChatPreview = async (phone) => {
    setPreviewPhone(phone);
    setPreviewLoading(true);
    try {
      const response = await api.get(`/trash/chat/${phone}`);
      setChatPreviewData(response.data);
    } catch (error) {
      toast.error('Failed to load chat history');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeChatPreview = () => {
    setPreviewPhone(null);
    setChatPreviewData(null);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <span className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
              <FiTrash2 size={24} />
            </span>
            Trash Bin
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Deleted WhatsApp chats & leads are stored here. You can recover numbers along with their WhatsApp chat or permanently delete them.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTrash}
            disabled={loading}
            className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            title="Refresh Trash"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {totalCount > 0 && (
            <button
              onClick={() => setConfirmModal({ isOpen: true, type: 'empty', phones: [] })}
              disabled={actionLoading}
              className="bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm text-sm"
            >
              <FiTrash2 size={16} />
              <span>Empty Trash</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total In Trash</p>
            <p className="text-3xl font-extrabold text-gray-800 dark:text-white mt-1">{totalCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Numbers in trash bin</p>
          </div>
          <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center text-xl font-bold">
            🗑️
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">WhatsApp Chats</p>
            <p className="text-3xl font-extrabold text-green-600 dark:text-green-400 mt-1">{chatCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Chats with messages</p>
          </div>
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-2xl flex items-center justify-center text-xl font-bold">
            💬
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">WhatsApp Leads</p>
            <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{leadCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Captured bot leads</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center text-xl font-bold">
            🎯
          </div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            All Items ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'chats'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            WhatsApp Chats ({chatCount})
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'leads'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            WhatsApp Leads ({leadCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <FiSearch size={16} />
          </div>
          <input
            type="text"
            placeholder="Search phone, name, or interest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Selected Action Bar (Sticky or banner when items selected) */}
      {selectedPhones.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
              {selectedPhones.length}
            </span>
            <span className="font-semibold text-sm">
              {selectedPhones.length} item(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRestore(selectedPhones)}
              disabled={actionLoading}
              className="bg-white hover:bg-emerald-50 text-emerald-700 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <FiRotateCcw size={16} />
              Recover Selected (with Chats)
            </button>

            <button
              onClick={() => setConfirmModal({ isOpen: true, type: 'bulk-delete', phones: selectedPhones })}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <FiTrash2 size={16} />
              Delete Permanently
            </button>

            <button
              onClick={() => setSelectedPhones([])}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm font-medium transition"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Trash Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="py-4 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedPhones.length === filteredItems.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-400 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">Customer / Contact</th>
                <th className="py-4 px-6">Type & Source</th>
                <th className="py-4 px-6">Interest / Category</th>
                <th className="py-4 px-6">WhatsApp Chat / Messages</th>
                <th className="py-4 px-6">Deleted At</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading Trash Bin...</p>
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isSelected = selectedPhones.includes(item.phone);
                  return (
                    <tr
                      key={item.phone}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.phone)}
                          className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-400 cursor-pointer"
                        />
                      </td>

                      {/* Customer / Contact */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-sm">
                            {(item.name || 'W').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {item.name || 'WhatsApp User'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-mono">
                              <FiMessageCircle className="text-green-500" size={12} />
                              +{item.phone}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            item.type.includes('Lead & Chat')
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                              : item.type.includes('Lead')
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                              : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>

                      {/* Interest */}
                      <td className="py-4 px-6">
                        {item.onboarding ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
                            {item.onboarding}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">—</span>
                        )}
                      </td>

                      {/* Chat / Messages Preview */}
                      <td className="py-4 px-6">
                        <div className="max-w-xs">
                          {item.messageCount > 0 ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openChatPreview(item.phone)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition"
                                title="Click to view deleted conversation"
                              >
                                <FiEye size={12} />
                                <span>{item.messageCount} msg(s)</span>
                              </button>
                              <span className="text-xs text-gray-400 truncate max-w-[150px]">
                                {item.lastMessage?.content || 'Media message'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No chat messages</span>
                          )}
                        </div>
                      </td>

                      {/* Deleted Date */}
                      <td className="py-4 px-6 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <FiClock size={13} className="text-gray-400" />
                          <span>{formatDateTime(item.deletedAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Recover button */}
                          <button
                            onClick={() => handleRestore([item.phone])}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold transition shadow-sm"
                            title="Recover number and its WhatsApp chat history"
                          >
                            <FiRotateCcw size={13} />
                            <span>Recover</span>
                          </button>

                          {/* Preview button */}
                          {item.messageCount > 0 && (
                            <button
                              onClick={() => openChatPreview(item.phone)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                              title="View Chat"
                            >
                              <FiEye size={15} />
                            </button>
                          )}

                          {/* Delete permanently */}
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, type: 'single-delete', phones: [item.phone] })}
                            disabled={actionLoading}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Delete Permanently from database"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-500 dark:text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center text-3xl">
                      🎉
                    </div>
                    <p className="font-medium text-base text-gray-700 dark:text-gray-300">
                      Trash Bin is empty!
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Whenever you delete a WhatsApp chat or a WhatsApp lead, it will be kept safely here. You can always recover them anytime with their full chat history.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chat Preview Modal */}
      {previewPhone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Modal Header */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center font-bold">
                  {(chatPreviewData?.customer?.name || 'W').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white text-base">
                    {chatPreviewData?.customer?.name || 'WhatsApp User'}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">+{previewPhone}</p>
                </div>
              </div>

              <button
                onClick={closeChatPreview}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2] dark:bg-gray-950">
              {previewLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-b-2 border-green-500 rounded-full"></div>
                </div>
              ) : chatPreviewData?.messages?.length > 0 ? (
                chatPreviewData.messages.map((msg, idx) => {
                  const isOutbound = msg.direction === 'outbound';
                  return (
                    <div key={msg._id || idx} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                          isOutbound
                            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-800 dark:text-gray-100 rounded-tr-sm'
                            : 'bg-white dark:bg-[#202c33] text-gray-800 dark:text-gray-100 rounded-tl-sm'
                        }`}
                      >
                        {msg.type === 'document' ? (
                          <div className="flex items-center gap-2 bg-black/5 dark:bg-black/20 p-2 rounded-lg">
                            <FiFileText className="text-red-500" />
                            <span className="text-xs underline">{msg.content || 'Document'}</span>
                          </div>
                        ) : msg.type === 'image' ? (
                          <div>
                            {msg.mediaUrl && <img src={msg.mediaUrl} alt="Media" className="rounded-lg max-h-48 object-cover mb-1" />}
                            <p className="text-xs">{msg.content}</p>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <div className="text-[10px] text-gray-400 mt-1 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No chat messages found for this number.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center gap-3">
              <button
                onClick={() => setConfirmModal({ isOpen: true, type: 'single-delete', phones: [previewPhone] })}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <FiTrash2 size={16} />
                Delete Permanently
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={closeChatPreview}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-300 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handleRestore([previewPhone])}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition"
                >
                  <FiRotateCcw size={16} />
                  Recover Chat & Number
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiAlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white">
              {confirmModal.type === 'empty'
                ? 'Empty Entire Trash Bin?'
                : 'Delete Permanently?'}
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
              {confirmModal.type === 'empty'
                ? 'Are you sure you want to permanently delete all items in the Trash Bin? All WhatsApp chats and lead profiles will be completely erased from the database and CANNOT be recovered.'
                : `Are you sure you want to permanently delete ${confirmModal.phones.length} item(s)? Their WhatsApp chat history and customer profile will be permanently deleted from the database.`}
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setConfirmModal({ isOpen: false, type: '', phones: [] })}
                disabled={actionLoading}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (confirmModal.type === 'empty') {
                    handleEmptyTrash();
                  } else {
                    handlePermanentDelete(confirmModal.phones);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrashBin;
