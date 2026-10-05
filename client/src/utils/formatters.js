export function formatCurrency(amount, currency = 'TZS') {
  if (amount === null || amount === undefined || isNaN(amount)) return `${currency} 0`;
  const num = Number(amount);
  return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '—';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateTimeStr;
  }
}

export function getConditionBadge(condition) {
  const c = (condition || '').toLowerCase();
  switch (c) {
    case 'new':
      return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'New' };
    case 'good':
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', label: 'Good' };
    case 'fair':
      return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', label: 'Fair' };
    case 'poor':
      return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', label: 'Poor' };
    case 'damaged':
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: 'Damaged' };
    case 'obsolete':
      return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', label: 'Obsolete' };
    case 'under_repair':
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: 'Under Repair' };
    case 'missing':
    case 'lost':
    case 'stolen':
      return { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', label: condition.toUpperCase() };
    case 'disposed':
      return { bg: 'bg-slate-200', text: 'text-slate-700', border: 'border-slate-300', label: 'Disposed' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', label: condition || 'Unknown' };
  }
}

export function getStatusBadge(status) {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'active':
      return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Active' };
    case 'in_store':
      return { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', label: 'In Store' };
    case 'assigned':
      return { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', label: 'Assigned' };
    case 'under_maintenance':
      return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', label: 'Under Maintenance' };
    case 'pending_disposal':
      return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', label: 'Pending Disposal' };
    case 'disposed':
      return { bg: 'bg-slate-200', text: 'text-slate-700', border: 'border-slate-400', label: 'Disposed' };
    case 'missing':
    case 'lost':
    case 'stolen':
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: s.replace('_', ' ').toUpperCase() };
    case 'transferred':
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: 'Transferred' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', label: status || 'Unknown' };
  }
}
