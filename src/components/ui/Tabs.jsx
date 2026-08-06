import React from 'react';
import './ui.css';

/**
 * Tabs tipo segmented control.
 * tabs: [{ id, label }]
 */
const Tabs = ({ tabs, active, onChange }) => (
  <div className="ds-tabs" role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        role="tab"
        aria-selected={active === tab.id}
        className={`ds-tabs__tab ${active === tab.id ? 'ds-tabs__tab--active' : ''}`}
        onClick={() => onChange(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default Tabs;
