/**
 * Pricing Calculation Service for Kids Jump 4 Joy
 *
 * Core Business Rules:
 * 1. Base prices for all equipment cover UP TO 3 HOURS of event duration.
 * 2. Beyond 3 hours, additional hours are billed at each item's configured additional_hourly_rate.
 * 3. Fractional hours rule: Hourly billing rounded UP to the next hour after the included 3 hours.
 *    - Example: 3 hours 30 mins -> 1 additional hour
 *    - Example: 4 hours 10 mins -> 2 additional hours
 *    - Example: 3 hours or less -> 0 additional hours (included in base price)
 * 4. Formula:
 *    additionalHours = max(0, ceil((totalMinutes - 180) / 60))
 *    itemTotal = (basePrice * quantity) + (additionalHourlyRate * additionalHours * quantity) - discount
 */

export interface EventDurationInfo {
  isValid: boolean;
  error?: string;
  totalMinutes: number;
  totalHoursDecimal: number;
  hoursPart: number;
  minutesPart: number;
  formattedDuration: string;
  includedHours: number; // always 3
  additionalHours: number; // 0 if totalMinutes <= 180, otherwise Math.ceil((totalMinutes - 180) / 60)
  durationBadgeText: string;
  isIncludedDuration: boolean;
}

export interface ItemPricingBreakdown {
  basePrice: number;
  additionalHourlyRate: number;
  quantity: number;
  additionalHours: number;
  baseTotal: number;
  additionalTotal: number;
  grossTotal: number;
  discount: number;
  total: number;
}

/**
 * Parses "HH:mm" time string to minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Calculates event duration and additional billing hours based on event start and end time.
 */
export function calculateEventDuration(startTime: string, endTime: string): EventDurationInfo {
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);

  if (startMins === null || endMins === null) {
    return {
      isValid: false,
      error: 'Please enter valid start and end times in HH:mm format.',
      totalMinutes: 0,
      totalHoursDecimal: 0,
      hoursPart: 0,
      minutesPart: 0,
      formattedDuration: '0 hours',
      includedHours: 3,
      additionalHours: 0,
      durationBadgeText: 'Invalid event time',
      isIncludedDuration: true,
    };
  }

  const diffMinutes = endMins - startMins;

  if (diffMinutes <= 0) {
    return {
      isValid: false,
      error: 'End time must be after the start time.',
      totalMinutes: 0,
      totalHoursDecimal: 0,
      hoursPart: 0,
      minutesPart: 0,
      formattedDuration: 'Invalid duration',
      includedHours: 3,
      additionalHours: 0,
      durationBadgeText: 'End time must be after the start time.',
      isIncludedDuration: true,
    };
  }

  const hoursPart = Math.floor(diffMinutes / 60);
  const minutesPart = diffMinutes % 60;
  const totalHoursDecimal = Number((diffMinutes / 60).toFixed(2));

  let formattedDuration = '';
  if (minutesPart === 0) {
    formattedDuration = `${hoursPart} ${hoursPart === 1 ? 'hour' : 'hours'}`;
  } else if (hoursPart === 0) {
    formattedDuration = `${minutesPart} mins`;
  } else {
    formattedDuration = `${hoursPart} ${hoursPart === 1 ? 'hr' : 'hrs'} ${minutesPart} mins`;
  }

  const INCLUDED_MINUTES = 180; // 3 hours included
  let additionalHours = 0;

  if (diffMinutes > INCLUDED_MINUTES) {
    const extraMinutes = diffMinutes - INCLUDED_MINUTES;
    // Fractional hours: hourly billing rounded UP to next hour after 3 hours
    additionalHours = Math.ceil(extraMinutes / 60);
  }

  const isIncludedDuration = additionalHours === 0;
  const durationBadgeText = isIncludedDuration
    ? 'Included duration: Up to 3 hours'
    : `Additional time: ${additionalHours} ${additionalHours === 1 ? 'hour' : 'hours'}`;

  return {
    isValid: true,
    totalMinutes: diffMinutes,
    totalHoursDecimal,
    hoursPart,
    minutesPart,
    formattedDuration,
    includedHours: 3,
    additionalHours,
    durationBadgeText,
    isIncludedDuration,
  };
}

export interface SinglePricingParams {
  basePrice: number;
  additionalHourlyCharge: number;
  quantity: number;
  eventDuration: number | string | { startTime: string; endTime: string };
  discount?: number;
}

export interface SinglePricingResult {
  additionalHours: number;
  baseCost: number;
  additionalCost: number;
  subtotal: number;
  finalItemTotal: number;
  // Extra detailed metrics
  basePrice: number;
  additionalHourlyCharge: number;
  quantity: number;
  discount: number;
  eventDurationHours: number;
  durationFormatted: string;
}

/**
 * Requirement 11: Single Reusable Pricing Engine
 * Receives:
 * - basePrice
 * - additionalHourlyCharge
 * - quantity
 * - eventDuration
 * Returns:
 * - additionalHours
 * - baseCost
 * - additionalCost
 * - subtotal
 * - finalItemTotal
 */
export function calculateSingleItemPricing(params: SinglePricingParams): SinglePricingResult {
  const safeQty = Math.max(1, Number(params.quantity) || 1);
  const safeBasePrice = Math.max(0, Number(params.basePrice) || 0);
  const safeAddRate = Math.max(0, Number(params.additionalHourlyCharge) || 0);
  const safeDisc = Math.max(0, Number(params.discount) || 0);

  let durationHours = 3;
  let additionalHours = 0;
  let durationFormatted = '3 Hours';

  if (typeof params.eventDuration === 'object' && params.eventDuration !== null && 'startTime' in params.eventDuration && 'endTime' in params.eventDuration) {
    const info = calculateEventDuration(params.eventDuration.startTime, params.eventDuration.endTime);
    if (info.isValid) {
      durationHours = info.totalHoursDecimal;
      additionalHours = info.additionalHours;
      durationFormatted = info.formattedDuration;
    }
  } else if (typeof params.eventDuration === 'number') {
    durationHours = Math.max(0, params.eventDuration);
    // Fractional hours rule: ceil(max(0, durationInHours - 3))
    additionalHours = Math.ceil(Math.max(0, durationHours - 3));
    durationFormatted = `${durationHours} ${durationHours === 1 ? 'Hour' : 'Hours'}`;
  } else if (typeof params.eventDuration === 'string') {
    // If string contains time format like "10:00 - 15:00" or just a number like "5" or "5 Hours"
    const parsedNum = parseFloat(params.eventDuration);
    if (!isNaN(parsedNum)) {
      durationHours = Math.max(0, parsedNum);
      additionalHours = Math.ceil(Math.max(0, durationHours - 3));
      durationFormatted = `${durationHours} ${durationHours === 1 ? 'Hour' : 'Hours'}`;
    }
  }

  const baseCost = Math.round(safeBasePrice * safeQty);
  const additionalCost = Math.round(safeAddRate * additionalHours * safeQty);
  const subtotal = baseCost + additionalCost;
  const finalItemTotal = Math.max(0, subtotal - safeDisc);

  return {
    additionalHours,
    baseCost,
    additionalCost,
    subtotal,
    finalItemTotal,
    basePrice: safeBasePrice,
    additionalHourlyCharge: safeAddRate,
    quantity: safeQty,
    discount: safeDisc,
    eventDurationHours: durationHours,
    durationFormatted,
  };
}

/**
 * Calculates item pricing with duration-based additional charges
 */
export function calculateItemTotal(
  basePrice: number,
  additionalHourlyRate: number,
  quantity: number,
  additionalHours: number,
  discount: number = 0
): ItemPricingBreakdown {
  const safeQty = Math.max(1, Number(quantity) || 1);
  const safeBasePrice = Math.max(0, Number(basePrice) || 0);
  const safeAddRate = Math.max(0, Number(additionalHourlyRate) || 0);
  const safeAddHours = Math.max(0, Number(additionalHours) || 0);
  const safeDisc = Math.max(0, Number(discount) || 0);

  const baseTotal = safeBasePrice * safeQty;
  const additionalTotal = safeAddRate * safeAddHours * safeQty;
  const grossTotal = baseTotal + additionalTotal;
  const total = Math.max(0, grossTotal - safeDisc);

  return {
    basePrice: safeBasePrice,
    additionalHourlyRate: safeAddRate,
    quantity: safeQty,
    additionalHours: safeAddHours,
    baseTotal,
    additionalTotal,
    grossTotal,
    discount: safeDisc,
    total,
  };
}

/**
 * Calculates complete quotation financial breakdown
 */
export function calculateQuotationTotals(params: {
  items: Array<{
    basePrice: number;
    additionalHourlyRate: number;
    quantity: number;
    discount?: number;
  }>;
  additionalHours: number;
  deliveryFee?: number;
  setupFee?: number;
  transportFee?: number;
  otherCharges?: number;
  discount?: number;
  customDeposit?: number | null;
}) {
  const itemsBreakdown = params.items.map((item) =>
    calculateItemTotal(
      item.basePrice,
      item.additionalHourlyRate,
      item.quantity,
      params.additionalHours,
      item.discount || 0
    )
  );

  const subtotal = itemsBreakdown.reduce((sum, it) => sum + it.total, 0);
  const deliveryFee = Math.max(0, Number(params.deliveryFee || 0));
  const setupFee = Math.max(0, Number(params.setupFee || 0));
  const transportFee = Math.max(0, Number(params.transportFee || 0));
  const otherCharges = Math.max(0, Number(params.otherCharges || 0));
  const quoteDiscount = Math.max(0, Number(params.discount || 0));

  const totalAmount = Math.max(
    0,
    subtotal + deliveryFee + setupFee + transportFee + otherCharges - quoteDiscount
  );

  const depositRequired =
    params.customDeposit !== null && params.customDeposit !== undefined
      ? Number(params.customDeposit)
      : Math.round(totalAmount * 0.5);

  const remainingBalance = Math.max(0, totalAmount - depositRequired);

  return {
    itemsBreakdown,
    subtotal,
    deliveryFee,
    setupFee,
    transportFee,
    otherCharges,
    discount: quoteDiscount,
    totalAmount,
    depositRequired,
    remainingBalance,
  };
}

/**
 * Formats a date string (YYYY-MM-DD or other formats) into DD-MM-YYYY format.
 * Example: '2026-09-17' -> '17-09-2026'
 */
export function formatToDDMMYYYY(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  // Check for YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }
  // Check for DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${day}-${month}-${year}`;
  }
  // Try Date object parsing
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return trimmed;
}

/**
 * Automatically generates human-readable quotation name based on:
 * EVENT DATE + CUSTOMER NAME
 * Format: DD-MM-YYYY - Customer Name
 * Examples:
 * 17-09-2026 - Suga Sugantahan
 * 25-09-2026 - Kamal Perera
 * 03-10-2026 - Nimal Fernando
 *
 * Rules:
 * - Uses actual event date from the quotation (DD-MM-YYYY)
 * - Uses the customer's current name from the customer record
 * - Trims unnecessary spaces from the customer name
 * - Preserves quotation number (e.g. QT-2026-00006) separately
 */
export function generateQuotationName(eventDate: string, customerName: string): string {
  const formattedDate = formatToDDMMYYYY(eventDate);
  const cleanName = (customerName || '').trim().replace(/\s+/g, ' ');
  if (!formattedDate && !cleanName) return 'Untitled Quotation';
  if (!formattedDate) return cleanName;
  if (!cleanName) return formattedDate;
  return `${formattedDate} - ${cleanName}`;
}
