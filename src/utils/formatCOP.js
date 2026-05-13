/**
 * Formats a number as Colombian Peso currency string.
 * Example: 1234567 → "$1.234.567"
 * Handles Django DecimalField strings like "7500000.00" correctly.
 */
export function formatCOP(value) {
    if (value === null || value === undefined || value === '') return '';
    let num;
    if (typeof value === 'string') {
        // Drop decimals by taking only the part before the dot
        const noDecimals = value.split('.')[0];
        const cleaned = noDecimals.replace(/[^0-9]/g, '');
        num = parseInt(cleaned, 10);
    } else {
        num = Math.floor(value);
    }
    if (isNaN(num)) return '';
    return '$' + num.toLocaleString('es-CO');
}

/**
 * Parses a formatted COP string back to a number.
 * Example: "$1.234.567" → 1234567
 */
export function parseCOP(str) {
    if (!str) return 0;
    const noDecimals = String(str).split('.')[0];
    const cleaned = noDecimals.replace(/[^0-9]/g, '');
    return parseInt(cleaned, 10) || 0;
}

/**
 * Handles keypress on a COP input field - formats on blur, raw on focus.
 */
export function handleCOPInput(rawValue) {
    // Strip non-digits, return formatted
    const noDecimals = String(rawValue).split('.')[0];
    const digits = noDecimals.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return formatCOP(parseInt(digits, 10));
}
