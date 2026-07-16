import re

with open('src/pages/CrearPedidoPage.css', 'r') as f:
    css = f.read()

# 1. Fix .form-group input heights
css = re.sub(
    r'\.form-group input,\s*\.form-group select,\s*\.form-group textarea \{([^}]+)\}',
    r'.form-group input, .form-group select, .form-group textarea {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  border: 1px solid var(--color-border);\n  border-radius: 6px;\n  font-size: 0.9rem;\n  background-color: #fff;\n  color: var(--color-text-primary);\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}',
    css
)

# 2. Fix .producto-item min-height
css = re.sub(
    r'\.producto-item input,\s*\.producto-item select,\s*\.producto-item textarea \{[^}]+\}',
    '',
    css
)

# 3. Update .premium classes
# Update inputs padding
css = re.sub(
    r'\.form-group input,\s*\.form-group select,\s*\.form-group textarea,\s*\.producto-item input,\s*\.producto-item select,\s*\.producto-item textarea \{[^}]+\}',
    r'.form-group input, .form-group select, .form-group textarea, .producto-item input, .producto-item select, .producto-item textarea {\n  background-color: #f8fafc;\n  border: 1px solid #cbd5e1;\n  color: #0f172a;\n  border-radius: 8px;\n  font-size: 0.9rem;\n  font-weight: 500;\n  padding: 0.5rem 0.75rem;\n}',
    css
)

# Update title wrapper and icon
css = css.replace(
    '  font-size: 2.2rem;\n  color: #3b82f6;\n  background: #eff6ff;\n  padding: 0.75rem;\n  border-radius: 12px;',
    '  font-size: 1.5rem;\n  color: #3b82f6;\n  background: #eff6ff;\n  padding: 0.5rem;\n  border-radius: 10px;'
)
css = css.replace('  font-size: 1.6rem;', '  font-size: 1.3rem;') # Fallback for h1
css = css.replace(
    '  font-size: 1.4rem;',
    '  font-size: 1.25rem;'
)

# Update form section title
css = css.replace(
    '  font-size: 1.15rem;\n  font-weight: 600;',
    '  font-size: 1rem;\n  font-weight: 600;'
)

# Update producto item premium card padding
css = css.replace(
    '  padding: 1rem;\n  transition: all 0.2s;',
    '  padding: 0.75rem 1rem;\n  transition: all 0.2s;'
)
# Make checkbox smaller
css = css.replace(
    '  width: 1.25rem;\n  height: 1.25rem;',
    '  width: 1rem;\n  height: 1rem;'
)
css = css.replace(
    '  font-size: 0.9rem;',
    '  font-size: 0.85rem;'
)

# Update buttons
css = css.replace(
    '  padding: 0.75rem 1.5rem;',
    '  padding: 0.5rem 1rem;'
)

# Update grid gap and container gap
css = css.replace(
    '  gap: 1.5rem;',
    '  gap: 1rem;'
)
css = css.replace(
    '  gap: 1.25rem;',
    '  gap: 0.85rem;'
)

# label specific adjustment
css = css.replace(
    '  font-size: 0.85rem;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  margin-bottom: 0.4rem !important;',
    '  font-size: 0.75rem;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  margin-bottom: 0.2rem !important;'
)


with open('src/pages/CrearPedidoPage.css', 'w') as f:
    f.write(css)
