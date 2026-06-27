import React, { useState, useEffect, useRef, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { FiSend, FiPaperclip, FiUser, FiSearch, FiMessageCircle, FiCheck, FiCheckCircle, FiFileText } from 'react-icons/fi';
import { IoCheckmarkDoneOutline, IoCheckmarkOutline, IoTimeOutline } from "react-icons/io5";

const WhatsAppChat = () => {
  const { user } = useContext(AuthContext);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef(null);

  const fetchChats = async () => {
    try {
      const response = await api.get('/whatsapp/chats');
      setChats(response.data);
    } catch (error) {
      console.error('Failed to load chats', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (phone) => {
    try {
      const response = await api.get(`/whatsapp/chats/${phone}`);
      setMessages(response.data);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages', error);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(() => {
      fetchChats();
      if (activeChat) {
        fetchMessages(activeChat.phone);
      }
    }, 10000); // Poll every 10 seconds for new messages
    return () => clearInterval(interval);
  }, [activeChat]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.phone);
    }
  }, [activeChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat) return;

    setSending(true);
    try {
      const response = await api.post(`/whatsapp/chats/${activeChat.phone}/send`, {
        text: messageText,
        type: 'text'
      });
      
      setMessages([...messages, response.data]);
      setMessageText('');
      scrollToBottom();
      fetchChats(); // Update last message in sidebar
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    // In a real scenario, you would upload this file to your server or S3 first,
    // get a public URL, and then send that URL to Meta API.
    // For now, we will simulate this by asking for a URL directly.
    const url = prompt("Enter the public URL of the PDF/Image to send (Meta requires a public URL):");
    if (!url) return;

    const isImage = file.type.startsWith('image/');
    const type = isImage ? 'image' : 'document';

    setSending(true);
    try {
      const response = await api.post(`/whatsapp/chats/${activeChat.phone}/send`, {
        text: file.name,
        type: type,
        mediaUrl: url
      });
      
      setMessages([...messages, response.data]);
      scrollToBottom();
      fetchChats();
      toast.success(`${type} sent successfully!`);
    } catch (error) {
      toast.error(`Failed to send ${type}`);
    } finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter(chat => 
    (chat.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    chat.phone.includes(searchTerm)
  );

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-6rem)] -m-4 sm:-m-6 flex bg-white dark:bg-gray-900 border-t dark:border-gray-800 shadow-inner rounded-xl overflow-hidden animate-fade-in">
      {/* Sidebar - Chat List */}
      <div className={`w-full sm:w-1/3 md:w-80 lg:w-96 flex flex-col border-r border-gray-200 dark:border-gray-800 ${activeChat ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiMessageCircle className="text-green-500" /> WhatsApp Inbox
          </h2>
        </div>
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500 dark:text-white transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-6 w-6 border-b-2 border-green-500 rounded-full"></div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No chats found.</div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.phone}
                onClick={() => setActiveChat(chat)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  activeChat?.phone === chat.phone ? 'bg-green-50 dark:bg-green-900/20' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold flex-shrink-0">
                  {chat.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{chat.name}</h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                      {chat.lastMessage?.direction === 'outbound' && <span className="mr-1">✓</span>}
                      {chat.lastMessage?.type === 'document' ? '📄 Document' : chat.lastMessage?.type === 'image' ? '📷 Image' : chat.lastMessage?.content || chat.lastMessage?.type}
                    </p>
                    {chat.onboarding && (
                       <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                         {chat.onboarding}
                       </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#efeae2] dark:bg-gray-900 ${!activeChat ? 'hidden sm:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 shadow-sm z-10">
              <button 
                onClick={() => setActiveChat(null)}
                className="sm:hidden p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
              >
                ←
              </button>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                {activeChat.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 dark:text-white">{activeChat.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">+{activeChat.phone}</p>
              </div>
              <div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${activeChat.status === 'Agree' || activeChat.status === 'Interested' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {activeChat.status || 'Lead'}
                </span>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')] bg-repeat dark:bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')] dark:opacity-90">
              {messages.map((msg, idx) => {
                const isOutbound = msg.direction === 'outbound';
                return (
                  <div key={msg._id || idx} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[75%] sm:max-w-md rounded-2xl p-2.5 shadow-sm relative group ${
                        isOutbound 
                          ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-800 dark:text-gray-100 rounded-tr-sm' 
                          : 'bg-white dark:bg-[#202c33] text-gray-800 dark:text-gray-100 rounded-tl-sm'
                      }`}
                    >
                      {msg.type === 'document' ? (
                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-black/5 dark:bg-black/20 p-2 rounded-xl mb-1 hover:bg-black/10 transition">
                          <div className="bg-red-500 text-white p-2 rounded-lg"><FiFileText size={20} /></div>
                          <span className="text-sm font-medium underline underline-offset-2">{msg.content || 'Document'}</span>
                        </a>
                      ) : msg.type === 'image' ? (
                        <div className="mb-1">
                          <img src={msg.mediaUrl} alt="Media" className="rounded-xl max-h-60 object-cover" />
                          {msg.content && <p className="text-sm mt-2 px-1">{msg.content}</p>}
                        </div>
                      ) : (
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}
                      
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isOutbound ? 'text-[#667781] dark:text-[#8696a0]' : 'text-gray-400 dark:text-gray-500'}`}>
                        <span className="text-[10px] uppercase font-medium">{formatTime(msg.timestamp)}</span>
                        {isOutbound && (
                          <span className="ml-1">
                            {msg.status === 'read' ? <IoCheckmarkDoneOutline size={14} className="text-[#53bdeb]" /> :
                             msg.status === 'delivered' ? <IoCheckmarkDoneOutline size={14} /> :
                             msg.status === 'sent' ? <IoCheckmarkOutline size={14} /> :
                             <IoTimeOutline size={14} />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t dark:border-gray-800 flex items-center gap-2">
              <label className="p-3 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full cursor-pointer transition-colors">
                <FiPaperclip size={20} />
                <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} disabled={sending} />
              </label>
              <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 py-3 px-4 bg-white dark:bg-[#2a3942] border-none rounded-xl text-[15px] focus:ring-0 dark:text-white"
                  disabled={sending}
                />
                <button 
                  type="submit" 
                  disabled={!messageText.trim() || sending}
                  className="p-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:dark:bg-green-800 text-white rounded-full transition-colors flex items-center justify-center shadow-md"
                >
                  <FiSend size={20} className="ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-70">
            <div className="w-32 h-32 mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <FiMessageCircle size={64} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-light text-gray-800 dark:text-gray-200 mb-2">WhatsApp Web for CRM</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Select a conversation from the left to start sending messages, PDFs, and media directly to your customers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppChat;
