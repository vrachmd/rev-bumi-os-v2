import { Invoice, Customer, Project, Company } from '../../../types';
import { formatDate, formatIDR } from '../../../lib/formatters';

export type ImciPdfDeps = {
  invoice: Invoice;
  customers: Customer[];
  projects: Project[];
  company: Company;
};

/**
 * Template IMCI-AGREGAT — group by product+price, kolom Deskripsi|Kuantitas|Harga|Jumlah
 * Warna hijau brand #003C16, deskripsi: tgl plat imci vol (KBS alias) + sort IMCI, Batu Split bold / detail courier
 */
export async function generateImciAgregatPdf({ invoice: inv, customers, projects, company }: ImciPdfDeps) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const cust = customers.find((c) => c.id === inv.customerId);
  const proj = projects.find((p) => p.id === inv.projectId);

  // ===== Header: RBN 12x12 hijau =====
  doc.setFillColor(0, 60, 22);
  doc.roundedRect(14, 8, 12, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('RBN', 20, 15.2, { align: 'center' });
  doc.setTextColor(0, 60, 22);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CV REV BUMI NUSANTARA', 28, 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  const addrLines = doc.splitTextToSize(
    company.address || 'Kp. Lebakwangi Pasar, Desa/Kelurahan Rengasjajar, Kec. Cigudeg, Kab. Bogor, Provinsi Jawa Barat',
    90
  );
  doc.text(addrLines, 28, 15.5);
  const addrH = Array.isArray(addrLines) ? addrLines.length * 3 : 3;
  doc.text(`NPWP: ${company.npwp || '-'} | Telp: ${company.phone || '-'}`, 28, 15.5 + addrH + 1.5);
  doc.setFillColor(0, 60, 22);
  doc.roundedRect(130, 8, 66, 7, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('FAKTUR PENAGIHAN', 163, 12.6, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text(inv.invoiceNumber, 196, 20.5, { align: 'right' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Tanggal: ${formatDate(inv.invoiceDate)}`, 196, 24, { align: 'right' });
  doc.setTextColor(180, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Jatuh Tempo: ${formatDate(inv.dueDate)}`, 196, 27.5, { align: 'right' });
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(14, 31, 196, 31);

  // Bill-to
  const billY = 33;
  const billH = 18;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, billY, 182, billH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(14, billY, 182, billH, 2, 2, 'S');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DITAGIHKAN KEPADA:', 16, billY + 4);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.line(16, billY + 5.5, 194, billY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(cust?.name || '-', 16, billY + 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Proyek: ${proj?.name || '-'}`, 16, billY + 13);

  // ===== Items — AGREGAT per product+price =====
  const groups = new Map<string, { productName: string; unitPricePerM3: number; items: any[] }>();
  (inv.items || []).forEach((it: any) => {
    const k = `${it.productName}||${it.unitPricePerM3}`;
    if (!groups.has(k)) groups.set(k, { productName: it.productName, unitPricePerM3: it.unitPricePerM3, items: [] });
    groups.get(k)!.items.push(it);
  });
  const groupList = Array.from(groups.values());
  const fmtShortDate = (iso?: string) => {
    if (!iso) return '-';
    try { const d = new Date(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; } catch { return formatDate(iso); }
  };
  const isImci = (cust?.name || '').toLowerCase().includes('imci');
  const kbsAlias = (() => {
    if (!isImci) return '';
    const n = (proj?.name || '').trim();
    if (!n) return '';
    const last = n.split(/\s+/).pop() || '';
    const clean = last.replace(/[^A-Za-z0-9]/g,'');
    return clean ? ` (KBS ${clean})` : '';
  })();
  const body = groupList.map((g) => {
    g.items.sort((a: any,b: any)=>{
      const na = parseInt((a.sjImci||a.deliveryNumber||'').replace(/\D/g,'')||'999999',10);
      const nb = parseInt((b.sjImci||b.deliveryNumber||'').replace(/\D/g,'')||'999999',10);
      return na-nb;
    });
    const lines: string[] = [g.productName];
    g.items.forEach((it: any) => {
      const tgl = fmtShortDate(it.deliveryDate);
      const imci = it.sjImci || '-';
      const plat = it.plateNumber || '-';
      const vol = `${it.approvedVolumeM3.toFixed(2)}m³`;
      const tglW = tgl.padEnd(11,' ');
      const platW = plat.padEnd(11,' ');
      const imciW = imci.padEnd(8,' ');
      lines.push(`${tglW}${platW}${imciW}${vol}${kbsAlias}`);
    });
    const totalVol = g.items.reduce((s: number, it: any) => s + (it.approvedVolumeM3||0), 0);
    const totalIdr = g.items.reduce((s: number, it: any) => s + (it.itemTotalIdr||0), 0);
    return [lines.join('\n'), `${totalVol.toFixed(2)}`, formatIDR(g.unitPricePerM3), formatIDR(totalIdr)];
  });
  const fontSize = 7.5;
  const pad = 2.4;
  const headFontSize = 7.5;
  const tableStartY = billY + billH + 4;
  // @ts-ignore
  autoTable(doc, {
    startY: tableStartY,
    head: [['Deskripsi', 'Kuantitas', 'Harga', 'Jumlah']],
    body,
    theme: 'grid',
    headStyles: { fillColor: [0, 60, 22], textColor: [255, 255, 255], fontSize: headFontSize, halign: 'center', valign: 'middle', fontStyle: 'bold', lineWidth: 0.12, lineColor: [16, 78, 36], cellPadding: pad },
    bodyStyles: { fontSize: fontSize, valign: 'middle', lineColor: [203, 213, 225], textColor: [15,23,42], font: 'helvetica', fontStyle: 'normal' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 102, font: 'courier', fontStyle: 'normal' },
      1: { halign: 'center', cellWidth: 22, font: 'helvetica', fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 28, font: 'helvetica', fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 30, font: 'helvetica', fontStyle: 'bold' },
    },
    styles: { cellPadding: pad, lineWidth: 0.12, fontSize: fontSize, overflow: 'linebreak', minCellHeight: 7 },
    margin: { left: 14, right: 14 },
    rowPageBreak: 'avoid',
    didParseCell: function(data: any){
      if(data.column.index===0 && data.row.section==='body'){
        const lines = data.cell.text as string[];
        const needed = lines.length*3.4 + pad*2 + 2;
        if(!data.row.height || data.row.height < needed) data.row.height = needed;
        (data.cell as any)._h = needed;
      }
    },
    willDrawCell: function(data: any){
      if(data.column.index===0 && data.row.section==='body'){
        const lines = [...(data.cell.text as string[])];
        (data.cell as any)._customLines = lines;
        if((data.cell as any)._h) data.row.height = (data.cell as any)._h;
        data.cell.text = [];
      }
    },
    didDrawCell: function(data: any){
      if(data.column.index===0 && data.row.section==='body'){
        const doc2: any = data.doc;
        const cell: any = data.cell;
        const lines: string[] = (cell as any)._customLines || [];
        if(!lines.length) return;
        const padL = cell.padding('left'); const padT = cell.padding('top');
        const x = cell.x + padL;
        const baseY = cell.y + padT + 3;
        doc2.setFont('helvetica','bold'); doc2.setFontSize(fontSize); doc2.setTextColor(15,23,42);
        doc2.text(lines[0], x, baseY);
        doc2.setFont('courier','normal'); doc2.setFontSize(fontSize-0.2); doc2.setTextColor(55,65,81);
        for(let i=1;i<lines.length;i++){ doc2.text(lines[i], x, baseY + i*3.3); }
      }
    },
  });
  let finalY = (doc as any).lastAutoTable.finalY || tableStartY;
  if (finalY > 235) { doc.addPage(); finalY = 14; }
  const footerY = 255;
  const boxW = 78; const boxX = 196 - boxW; const boxH = 20;
  let totalsY = finalY + 6;
  if (totalsY + boxH + 10 > footerY - 5) { doc.addPage(); totalsY = 22; }
  doc.setFillColor(240, 253, 244); doc.roundedRect(boxX, totalsY, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(167, 243, 208); doc.setLineWidth(0.25); doc.roundedRect(boxX, totalsY, boxW, boxH, 2, 2, 'S');
  doc.setFillColor(0, 60, 22); doc.roundedRect(boxX, totalsY, 1.2, boxH, 0.6, 0.6, 'F');
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(71,85,105);
  doc.text('Subtotal DPP:', boxX+4.5, totalsY+6);
  doc.setTextColor(15,23,42); doc.setFont('helvetica','bold'); doc.text(formatIDR(inv.subtotalIdr), boxX+boxW-3, totalsY+6, {align:'right'});
  doc.setFont('helvetica','normal'); doc.setTextColor(71,85,105); doc.text('PPN (11%):', boxX+4.5, totalsY+10.5);
  doc.setTextColor(15,23,42); doc.setFont('helvetica','bold'); doc.text(formatIDR(inv.taxAmountIdr), boxX+boxW-3, totalsY+10.5, {align:'right'});
  doc.setDrawColor(0,60,22); doc.setLineWidth(0.45); doc.line(boxX+4, totalsY+13.2, boxX+boxW-3, totalsY+13.2);
  doc.setFontSize(7.5); doc.setTextColor(0,60,22); doc.setFont('helvetica','bold');
  doc.text('Total Faktur Tagihan:', boxX+4.5, totalsY+17); doc.text(formatIDR(inv.totalInvoiceIdr), boxX+boxW-3, totalsY+17, {align:'right'});
  doc.setDrawColor(0,60,22); doc.setLineWidth(0.35); doc.line(14, footerY-5, 196, footerY-5);
  doc.setDrawColor(167,243,208); doc.setLineWidth(0.15); doc.line(14, footerY-4.2, 196, footerY-4.2);
  doc.setFontSize(6.5); doc.setFont('helvetica','bold'); doc.setTextColor(0,60,22);
  doc.text('INSTRUKSI PEMBAYARAN TRANSFER BANK', 14, footerY);
  doc.setFontSize(5); doc.setFont('helvetica','normal'); doc.setTextColor(100,116,139);
  doc.text('Harap transfer tepat waktu sesuai jatuh tempo', 14, footerY+3.2);
  doc.setFillColor(240,253,244); doc.roundedRect(14, footerY+5, 92, 19, 2, 2, 'F');
  doc.setDrawColor(167,243,208); doc.setLineWidth(0.2); doc.roundedRect(14, footerY+5, 92, 19, 2, 2, 'S');
  doc.setFillColor(0,60,22); doc.roundedRect(14, footerY+5, 1.2, 19, 0.6, 0.6, 'F');
  doc.setFontSize(6.5); doc.setFont('helvetica','bold'); doc.setTextColor(0,60,22);
  doc.text('BCA  -  Cabang Alam Sutera', 17, footerY+10);
  doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(51,65,85);
  doc.text('No. Rekening:  6044884563', 17, footerY+14);
  doc.setFont('helvetica','bold'); doc.setTextColor(15,23,42); doc.text('a.n. REV BUMI NUSANTARA CV', 17, footerY+17.8);
  const sigCenterX = 152;
  doc.setFontSize(7); doc.setFont('helvetica','italic'); doc.setTextColor(0,60,22);
  doc.text('Hormat Kami,', sigCenterX, footerY, {align:'center'});
  const badgeW=46, badgeX=sigCenterX-badgeW/2, badgeY=footerY+4.2;
  doc.setFillColor(236,253,245); doc.roundedRect(badgeX,badgeY,badgeW,5.2,1,1,'F');
  doc.setDrawColor(16,122,78); doc.setLineWidth(0.18); doc.roundedRect(badgeX,badgeY,badgeW,5.2,1,1,'S');
  doc.setFontSize(4.8); doc.setFont('helvetica','bold'); doc.setTextColor(6,95,70);
  doc.text('DIVERIFIKASI  •  DITANDATANGANI', sigCenterX, badgeY+3.4, {align:'center'});
  doc.setDrawColor(0,60,22); doc.setLineWidth(0.22); doc.line(sigCenterX-29, footerY+16.5, sigCenterX+29, footerY+16.5);
  doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(0,60,22);
  doc.text('( Hendra Gunawan, S.E. )', sigCenterX, footerY+20, {align:'center'});
  doc.setFontSize(6); doc.setFont('helvetica','normal'); doc.setTextColor(100,116,139);
  doc.text('Direktur Keuangan & Akuntansi', sigCenterX, footerY+23.8, {align:'center'});
  // Halaman 2: Foto Kwitansi Bermaterai (jangan sebelum footer)
  const kwitUrl = (inv as any).kwitansiPhotoUrl as string | undefined;
  if (kwitUrl) {
    try {
      const resp = await fetch(kwitUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        const base64: string = await new Promise((res, rej) => { const r = new FileReader(); (r as any).onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob); });
        doc.addPage();
        doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(0,60,22);
        doc.text('Lampiran: Foto Kwitansi Bermaterai (Asli)', 14, 14);
        doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80);
        doc.text(`Faktur ${inv.invoiceNumber} — ${cust?.name || ''} — ${proj?.name || ''}`, 14, 19);
        doc.setDrawColor(167,243,208); doc.setLineWidth(0.15); doc.line(14,21,196,21);
        const imgType = base64.includes('data:image/png') ? 'PNG' : 'JPEG';
        let w = 182, h = 220;
        try { const p = (doc as any).getImageProperties(base64); w = 182; h = (p.height * w) / p.width; if (h > 220) { h = 220; w = (p.width * h) / p.height; } } catch {}
        const x = (210 - w) / 2; const y = 26;
        doc.addImage(base64, imgType, x, y, w, Math.min(h, 220));
        doc.setFontSize(6); doc.setFont('helvetica','italic'); doc.setTextColor(100,116,139);
        doc.text('Dokumen asli bermaterai Rp 10.000 disimpan terpisah — foto sebagai bukti lampiran', 105, 280, { align: 'center' });
      }
    } catch (e) { console.warn('kwitansi pdf hal 2 failed', e); }
  }
  return doc;
}
