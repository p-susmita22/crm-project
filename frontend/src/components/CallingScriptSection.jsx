import React, { useState } from 'react';
// Force HMR reload
import { FiMessageSquare, FiBookOpen, FiHelpCircle, FiMic, FiThumbsUp, FiUser, FiBriefcase, FiShoppingBag } from 'react-icons/fi';

const CallingScriptSection = ({ customer }) => {
  const [activeTab, setActiveTab] = useState('seller'); // 'seller' or 'districtPartner'
  const name    = customer?.name        || null;
  const company = customer?.companyName || null;

  // Helper: wrap real data in highlighted span, or show placeholder style
  const Name = name
    ? <strong className="text-primary font-bold">{name}</strong>
    : <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1 rounded text-xs font-mono">[Customer Name]</span>;

  const Company = company
    ? <strong className="text-secondary font-bold">{company}</strong>
    : <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1 rounded text-xs font-mono">[Company]</span>;

  const [settings, setSettings] = useState(null);

  React.useEffect(() => {
    import('../api/axios').then(({ default: api }) => {
      api.get('/settings').then(res => setSettings(res.data)).catch(console.error);
    });
  }, []);

  const parseScript = (rawText) => {
    if (!rawText) return [];
    
    // Replace placeholders with spans
    const replacePlaceholders = (text) => {
      const parts = text.split(/(\{Name\}|\{Company\})/g);
      return parts.map((part, i) => {
        if (part === '{Name}') return <React.Fragment key={i}>{Name}</React.Fragment>;
        if (part === '{Company}') return <React.Fragment key={i}>{Company}</React.Fragment>;
        return part;
      });
    };

    const paragraphs = rawText.split('\n\n').filter(p => p.trim() !== '');
    
    return paragraphs.map((p, index) => {
      const colors = [
        { icon: <FiMic className="text-blue-500" />, color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/10', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        { icon: <FiBookOpen className="text-purple-500" />, color: 'border-purple-400 bg-purple-50 dark:bg-purple-900/10', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        { icon: <FiThumbsUp className="text-green-500" />, color: 'border-green-400 bg-green-50 dark:bg-green-900/10', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        { icon: <FiHelpCircle className="text-yellow-500" />, color: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
        { icon: <FiMessageSquare className="text-primary" />, color: 'border-primary bg-primary/5 dark:bg-primary/10', badge: 'bg-primary/10 text-primary' },
      ];
      const style = colors[index % colors.length];

      const lines = p.split('\n');
      const textNode = lines.length > 1 ? (
        <span className="whitespace-pre-line block space-y-2">
          {lines.map((line, li) => (
            <span key={li} className="block">{replacePlaceholders(line)}</span>
          ))}
        </span>
      ) : (
        <span>{replacePlaceholders(p)}</span>
      );

      return {
        step: index + 1,
        label: `Action ${index + 1}`,
        icon: style.icon,
        color: style.color,
        badge: style.badge,
        text: textNode,
      };
    });
  };

  const currentScripts = settings 
    ? (activeTab === 'seller' ? parseScript(settings.sellerScript) : parseScript(settings.districtPartnerScript))
    : [];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-secondary/10 rounded-xl flex items-center justify-center">
            <FiBookOpen className="text-secondary text-lg" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white text-base leading-tight">Calling Script Guide</h2>
            <p className="text-xs text-gray-400">Follow these steps during your call</p>
          </div>
        </div>

        {/* Live customer name badge */}
        {customer ? (
          <div className="flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
            <FiUser size={11} />
            Calling: {customer.name}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-400 px-3 py-1.5 rounded-full text-xs font-medium">
            <FiUser size={11} />
            No customer selected
          </div>
        )}
      </div>

      {/* Script Type Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <button
          onClick={() => setActiveTab('seller')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'seller'
              ? 'text-primary border-b-2 border-primary bg-white dark:bg-gray-800'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <FiShoppingBag size={16} /> Seller Script
        </button>
        <button
          onClick={() => setActiveTab('districtPartner')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'districtPartner'
              ? 'text-secondary border-b-2 border-secondary bg-white dark:bg-gray-800'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <FiBriefcase size={16} /> District Partner Script
        </button>
      </div>

      {/* Script Steps */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {currentScripts.map((s) => (
          <div key={s.step} className={`border-l-4 rounded-r-xl p-4 ${s.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>Step {s.step}</span>
              <span className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                {s.icon} {s.label}
              </span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {s.text}
            </div>
          </div>
        ))}

        {/* Tip */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 <strong>Tip:</strong> Listen actively, speak clearly, and always be polite — even if {customer?.name || 'the customer'} says no.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CallingScriptSection;
