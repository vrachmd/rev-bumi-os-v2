/**
 * Authoritative formatters for REV Bumi OS
 */

export function formatIDR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rp 0';
  }
  const rounded = Math.round(amount);
  return 'Rp ' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatVolumeM3(volume: number | undefined | null, includeUnit: boolean = true): string {
  if (volume === undefined || volume === null || isNaN(volume)) {
    return includeUnit ? '0.00 m³' : '0.00';
  }
  const formatted = volume.toFixed(2);
  return includeUnit ? `${formatted} m³` : formatted;
}

export function formatWeightTon(weightKg: number | undefined | null, includeUnit: boolean = true): string {
  if (weightKg === undefined || weightKg === null || isNaN(weightKg)) {
    return includeUnit ? '0,00 ton' : '0,00';
  }
  const ton = weightKg / 1000;
  const formatted = ton.toFixed(2).replace('.', ',');
  return includeUnit ? `${formatted} ton` : formatted;
}

export function formatWeightKg(weightKg: number | undefined | null, includeUnit: boolean = true): string {
  if (weightKg === undefined || weightKg === null || isNaN(weightKg)) {
    return includeUnit ? '0 kg' : '0';
  }
  const rounded = Math.round(weightKg);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return includeUnit ? `${formatted} kg` : formatted;
}

export function formatPercent(percent: number | undefined | null): string {
  if (percent === undefined || percent === null || isNaN(percent)) {
    return '0,00%';
  }
  return `${percent.toFixed(2).replace('.', ',')}%`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString: string | undefined | null): string {
  if (!dateTimeString) return '-';
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return dateTimeString;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTimeString;
  }
}
