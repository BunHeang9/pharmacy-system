// ສ້າງໄຟລ໌ PDF ຈາກຕາຕະລາງຂໍ້ມູນ — ຝັ່ງ client
// ບໍ່ໃຊ້ວິທີແຕ້ມຕົວອັກສອນທຽມ (custom font embedding) ເພາະ jsPDF/autotable ຝັງ font ພາສາລາວແບບນັ້ນເສຍງ່າຍ
// (header ຂຶ້ນແຕ່ body ຫວ່າງ, ຫຼືຫວ່າງໝົດ) — ແທນທີ່ດ້ວຍການສ້າງ HTML ຈິງ, ໃຫ້ browser ເອງແຕ້ມຕົວອັກສອນ
// (font ດຽວກັນກັບໜ້າອື່ນໆ, ໂຫຼດຈາກ Google Fonts ຢູ່ແລ້ວ) ດ້ວຍ html2canvas ໂດຍກົງ ແລ້ວຝັງຮູບໃສ່ PDF —
// ໃຊ້ html2canvas ໂດຍກົງ (ບໍ່ຜ່ານ jsPDF.html()) ເພາະ jsPDF.html() ມີບັນຫາກັບ element ທີ່ວາງນອກຈໍ
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ຮູບ PDF ບໍ່ມີແນວຄິດ "number format" ຄືກັບ Excel — ຕ້ອງໃສ່ຈໍ້າຄັ່ນຫຼັກພັນເຂົ້າໃນຂໍ້ຄວາມເລີຍ
function formatCell(v: string | number): string {
  return typeof v === 'number' ? v.toLocaleString('en-US') : v
}

export async function downloadPdf(filename: string, title: string, headers: string[], rows: (string | number)[][]): Promise<void> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.zIndex = '-1'
  container.style.width = '1000px'
  container.style.padding = '16px'
  container.style.background = '#ffffff'
  container.style.fontFamily = "'Inter', 'Noto Sans Lao', 'Noto Sans Thai', sans-serif"

  const headHtml = headers.map((h) => `<th style="background:#1d6fcd;color:#fff;text-align:left;padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;">${escapeHtml(h)}</th>`).join('')
  const bodyHtml = rows
    .map((r, i) => {
      const cells = r
        .map((c) => `<td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;text-align:${typeof c === 'number' ? 'right' : 'left'};">${escapeHtml(formatCell(c))}</td>`)
        .join('')
      return `<tr style="background:${i % 2 ? '#f8fafc' : '#ffffff'};">${cells}</tr>`
    })
    .join('')

  container.innerHTML = `
    <h2 style="margin:0 0 4px;font-size:16px;color:#1e293b;">${escapeHtml(title)}</h2>
    <p style="margin:0 0 12px;font-size:10px;color:#64748b;">${escapeHtml(new Date().toLocaleString())}</p>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>${headHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  `

  document.body.appendChild(container)
  try {
    // ລໍໃຫ້ font ໂຫຼດແລ້ວ ບໍ່ດັ່ງນັ້ນ html2canvas ອາດ capture ກ່ອນ font ພາສາລາວມາເຖິງ
    await (document as any).fonts?.ready
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth() - 40
    const imgHeight = (canvas.height * pageWidth) / canvas.width
    doc.addImage(imgData, 'PNG', 20, 20, pageWidth, imgHeight)
    doc.save(filename)
  } finally {
    document.body.removeChild(container)
  }
}
