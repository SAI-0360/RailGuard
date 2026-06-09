import React from 'react';

export default function MetricCards({ stats }) {
  // Hardcode defaults if stats is not provided (as per task description: total=100, healthy=97, warning=2, critical=1)
  const {
    total = 100,
    healthy = 97,
    warning = 2,
    critical = 1
  } = stats || {};

  const cards = [
    {
      label: 'Total Segments',
      value: total,
      valueClass: 'text-white'
    },
    {
      label: 'Healthy Segments',
      value: healthy,
      valueClass: 'text-healthy'
    },
    {
      label: 'Warning Segments',
      value: warning,
      valueClass: 'text-warning'
    },
    {
      label: 'Critical Segments',
      value: critical,
      valueClass: 'text-critical'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col justify-between transition-all duration-300 hover:border-white/20 hover:bg-white/10"
        >
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {card.label}
          </span>
          <span className={`text-4xl font-extrabold ${card.valueClass}`}>
            {card.value}
          </span>
        </div>
      ))}
    </div>
  );
}
