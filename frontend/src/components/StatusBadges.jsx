import React from 'react';
import './StatusBadges.css';

// Individual Badge Component
export const Badge = ({ status, icon, label, onClick }) => {
  const statusClass = `badge badge--${status}`;
  return (
    <div 
      className={statusClass} 
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <span className="badge-icon">{icon}</span>
      <span className="badge-label">{label}</span>
    </div>
  );
};

// Status Badges Container
const StatusBadges = ({ onBadgeClick }) => {
  const statuses = [
    { status: 'pending', icon: '⚠️', label: 'Pending' },
    { status: 'inProgress', icon: '⚙️', label: 'In progress' },
    { status: 'submitted', icon: '➤', label: 'Submitted' },
    { status: 'inReview', icon: '📝', label: 'In review' },
    { status: 'success', icon: '✓', label: 'Success' },
    { status: 'failed', icon: '✕', label: 'Failed' },
    { status: 'expired', icon: '⏱', label: 'Expired' }
  ];

  return (
    <div className="badges-grid">
      {statuses.map((item) => (
        <Badge 
          key={item.status} 
          {...item} 
          onClick={() => onBadgeClick?.(item)}
        />
      ))}
    </div>
  );
};

export default StatusBadges;
