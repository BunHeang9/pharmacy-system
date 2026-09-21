// ແປງແຖວຂໍ້ມູນເປັນ CSV ແລ້ວດາວໂຫຼດເປັນໄຟລ໌ — ໃຊ້ຝັ່ງ client ເລີຍ ເພາະ Reports ໂຫຼດຂໍ້ມູນມາແລ້ວ
function csvEscape(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
} // this function use to make sure data does not break the csv structure

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map((r) => r.map(csvEscape).join(','))
  // ໃສ່ BOM ໜ້າສຸດ ບໍ່ດັ່ງນັ້ນ Excel ຈະສະແດງຕົວອັກສອນລາວ/ໄທຜິດ
  const csv = '\ufeff' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
