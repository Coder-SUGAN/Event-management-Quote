import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates and downloads a clean, professional PDF from a DOM element
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  options?: { title?: string }
): Promise<void> {
  // Hide interactive action buttons if any were inside
  const canvas = await html2canvas(element, {
    scale: 2, // High resolution (retina-like crispness)
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1200, // standard desktop rendering width
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Add first page
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  // Multi-page handling if content exceeds A4 height
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
