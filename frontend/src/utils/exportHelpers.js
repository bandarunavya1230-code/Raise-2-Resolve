import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format date for reports
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * EXPORT TO CSV
 */
export function exportToCSV(complaints = []) {
  if (!complaints || complaints.length === 0) {
    alert('No complaint records available to export.');
    return;
  }

  const headers = [
    'Complaint ID',
    'Issue',
    'Category',
    'Location',
    'Severity',
    'Priority Score',
    'Priority Level',
    'Status',
    'Verification',
    'Date'
  ];

  const rows = complaints.map(c => {
    const code = c.complaint_code || `R2R-2026-${String(c.id).padStart(4, '0')}`;
    const title = `"${(c.title || '').replace(/"/g, '""')}"`;
    const category = `"${(c.category || '').replace(/"/g, '""')}"`;
    const location = `"${(c.location || '').replace(/"/g, '""')}"`;
    const severity = (c.severity || 'medium').toUpperCase();
    const priorityScore = c.priority_score || 0;
    const priorityLevel = c.priority_level || (c.priority_score >= 65 ? 'Urgent' : c.priority_score >= 45 ? 'High' : 'Normal');
    const status = (c.status || 'pending').replace('_', ' ').toUpperCase();
    const verification = c.is_verified === 1 ? 'VERIFIED' : 'UNVERIFIED';
    const date = formatDate(c.created_at);

    return [
      code,
      title,
      category,
      location,
      severity,
      priorityScore,
      priorityLevel,
      status,
      verification,
      date
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Raise2Resolve_Complaints_Report_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * EXPORT TO PDF
 */
export function exportToPDF(complaints = []) {
  if (!complaints || complaints.length === 0) {
    alert('No complaint records available to export.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape' });

  // Header Banner
  doc.setFillColor(30, 58, 138); // #1e3a8a Primary Blue
  doc.rect(0, 0, 297, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Raise 2 Resolve – Municipal Complaints Report', 14, 16);

  // Sub-header metadata
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${complaints.length}`, 14, 32);

  // Define Table Columns & Data
  const tableHeaders = [
    ['Complaint ID', 'Issue', 'Category', 'Location', 'Severity', 'Priority', 'Status', 'Verification', 'Date']
  ];

  const tableData = complaints.map(c => [
    c.complaint_code || `R2R-2026-${String(c.id).padStart(4, '0')}`,
    c.title,
    c.category,
    c.location,
    (c.severity || 'medium').toUpperCase(),
    `${c.priority_score || 0} (${c.priority_level || 'Normal'})`,
    (c.status || 'pending').replace('_', ' ').toUpperCase(),
    c.is_verified === 1 ? 'Verified ✓' : 'Unverified',
    formatDate(c.created_at)
  ]);

  // Generate Table using jsPDF AutoTable
  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: 38,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // #2563eb
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 28 }, // ID
      1: { cellWidth: 48 }, // Issue
      2: { cellWidth: 32 }, // Category
      3: { cellWidth: 42 }, // Location
      4: { cellWidth: 20 }, // Severity
      5: { cellWidth: 28 }, // Priority
      6: { cellWidth: 24 }, // Status
      7: { cellWidth: 24 }, // Verification
      8: { cellWidth: 22 }  // Date
    }
  });

  // Footer Page Numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount} - Confidential Municipal Document`, 14, 202);
  }

  doc.save(`Raise2Resolve_Complaints_Report_${Date.now()}.pdf`);
}
