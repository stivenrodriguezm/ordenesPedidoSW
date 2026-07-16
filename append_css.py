import sys

css_content = '''
/* ==========================================================================
   Premium Glass Header & Filters (OrdenesPage Specific)
   ========================================================================== */
.o-glass-header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 0.75rem 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 1rem;
  z-index: 50;
}

.o-btn-primary-glow {
  background: #274385;
  color: white;
  border: none;
  padding: 0 0.85rem;
  height: 34px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 0 15px rgba(39, 67, 133, 0.4);
  transition: all 0.2s;
  flex-shrink: 0;
}

.o-btn-primary-glow:hover {
  background: #1a2d59;
  transform: translateY(-2px);
  box-shadow: 0 5px 20px #192b54;
}

.o-btn-ghost {
  background: transparent;
  border: 1px solid var(--slate-200, #e2e8f0);
  color: var(--slate-600, #475569);
  padding: 0 0.6rem;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.o-btn-ghost:hover {
  background: white;
  border-color: #cbd5e1;
  color: #1e293b;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.o-filters-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.o-search-pill, .o-select-pill {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--slate-200, #e2e8f0);
  border-radius: 20px;
  padding: 0 0.75rem;
  height: 34px;
  transition: all 0.2s;
}

.o-search-pill:focus-within, .o-select-pill:hover {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.o-search-pill svg {
  color: #94a3b8;
  font-size: 0.85rem;
  margin-right: 0.5rem;
}

.o-search-pill input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.85rem;
  color: #334155;
  width: 150px;
}

.o-search-pill input::placeholder {
  color: #94a3b8;
}

.o-select-pill select {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.85rem;
  color: #334155;
  cursor: pointer;
  padding-right: 0.5rem;
  font-weight: 500;
  appearance: none;
}

.o-select-pill select:focus {
  outline: none;
}
/* Hide long text on mobile */
@media (max-width: 768px) {
  .o-btn-primary-glow .long-text { display: none; }
  .o-btn-primary-glow .short-text { display: inline; }
}
@media (min-width: 769px) {
  .o-btn-primary-glow .long-text { display: inline; }
  .o-btn-primary-glow .short-text { display: none; }
}
'''

with open('src/pages/OrdenesPage.css', 'a') as f:
    f.write('\\n' + css_content)
