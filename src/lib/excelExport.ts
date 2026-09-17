import * as XLSX from 'xlsx';
import type { DailyScheduleEntry } from '../types.ts';

export function exportScheduleToExcel(schedule: DailyScheduleEntry[], filename?: string): void {
  const safeFilename = filename || `Event_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`;

  const rows = schedule.map((s, idx) => ({
    '#': idx + 1,
    'Event Date': s.event_date,
    'Start Time': s.start_time || 'N/A',
    'End Time': s.end_time || 'N/A',
    'Customer Name': s.customer_name,
    'Customer Phone': s.customer_phone,
    'Location': s.location,
    'Equipment Item': s.item_name,
    'Quantity': s.quantity,
    'Booking Number': s.booking_number,
    'Status': s.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 14 }, // Event Date
    { wch: 12 }, // Start Time
    { wch: 12 }, // End Time
    { wch: 22 }, // Customer Name
    { wch: 16 }, // Customer Phone
    { wch: 28 }, // Location
    { wch: 26 }, // Equipment Item
    { wch: 10 }, // Quantity
    { wch: 16 }, // Booking Number
    { wch: 14 }, // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Schedule');

  XLSX.writeFile(workbook, safeFilename);
}
