import React from 'react';
// Force HMR reload
import { FiMessageSquare, FiBookOpen, FiHelpCircle, FiMic, FiThumbsUp, FiUser } from 'react-icons/fi';

const CallingScriptSection = ({ customer }) => {
  const name    = customer?.name        || null;
  const company = customer?.companyName || null;

  // Helper: wrap real data in highlighted span, or show placeholder style
  const Name = name
    ? <strong className="text-primary font-bold">{name}</strong>
    : <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1 rounded text-xs font-mono">[Customer Name]</span>;

  const Company = company
    ? <strong className="text-secondary font-bold">{company}</strong>
    : <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1 rounded text-xs font-mono">[Company]</span>;

  const scripts = [
    {
      step: 1,
      label: 'Greeting',
      icon: <FiMic className="text-blue-500" />,
      color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/10',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      text: <span>Hello {Name}, I am calling from Multi Maart regarding our exclusive services. Am I speaking with {Name} from {Company}?</span>,
    },
    {
      step: 2,
      label: 'Product Introduction',
      icon: <FiBookOpen className="text-purple-500" />,
      color: 'border-purple-400 bg-purple-50 dark:bg-purple-900/10',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      text: <span>{Name}, we are a leading provider of services that help businesses like {Company} improve efficiency and grow sales. Our solution is trusted by over 500 businesses across the country.</span>,
    },
    {
      step: 3,
      label: 'Sales Pitch',
      icon: <FiThumbsUp className="text-green-500" />,
      color: 'border-green-400 bg-green-50 dark:bg-green-900/10',
      badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      text: <span>{Name}, businesses like yours have seen a 30% increase in sales within the first month of using our service. We have a special limited-time offer running only this week — I would love to walk you through it.</span>,
    },
    {
      step: 4,
      label: 'Common Questions & Rebuttals',
      icon: <FiHelpCircle className="text-yellow-500" />,
      color: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10',
      badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      text: (
        <span className="whitespace-pre-line block space-y-2">
          <span className="block"><strong>Q: Is there a free trial?</strong>{'\n'}→ Yes {Name}, we offer a full 14-day free trial with no credit card required.</span>
          <span className="block"><strong>Q: What is the pricing?</strong>{'\n'}→ Our plans start at just ₹999/month, with flexible options for every business size.</span>
          <span className="block"><strong>Q: I'm not interested right now.</strong>{'\n'}→ I completely understand, {Name}! Can I just take 2 more minutes to share one key benefit?</span>
          <span className="block"><strong>Q: We already use another product.</strong>{'\n'}→ That's great! Many clients switched because of our key advantages. Would you like a quick comparison?</span>
        </span>
      ),
    },
    {
      step: 5,
      label: 'Closing Statement',
      icon: <FiMessageSquare className="text-primary" />,
      color: 'border-primary bg-primary/5 dark:bg-primary/10',
      badge: 'bg-primary/10 text-primary',
      text: <span>{Name}, shall I schedule a brief 10-minute demo for you tomorrow? I can also send you our brochure on WhatsApp or email right now. Which would you prefer?</span>,
    },
  ];

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

      {/* Script Steps */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {scripts.map((s) => (
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
