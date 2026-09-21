// ສ້າງໄຟລ໌ .xlsx ແທ້ (ບໍ່ແມ່ນ CSV) — ໃຊ້ exceljs ຝັ່ງ client, ຮອງຮັບ Unicode (ລາວ/ໄທ) ໂດຍບໍ່ຕ້ອງແກ້ font
import ExcelJS from 'exceljs'

export async function downloadExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetName)

  ws.addRow(headers)
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D6FCD' } }

  rows.forEach((r) => ws.addRow(r))
  ws.columns.forEach((col) => { col.width = 20 })

  // ຖ້າຄ່າໃນຖັນນັ້ນເປັນຕົວເລກທັງໝົດ (ບໍ່ນັບແຖວຫົວ) — ໃສ່ຈໍ້າຄັ່ນຫຼັກພັນໃຫ້ອ່ານງ່າຍ
  // ໂດຍຄ່າໃນ cell ຍັງເປັນ number ແທ້ (ບໍ່ແມ່ນ string) — Excel ຍັງ sum/sort ໄດ້ປົກກະຕິ
  headers.forEach((_, colIndex) => {
    const allNumbers = rows.length > 0 && rows.every((r) => typeof r[colIndex] === 'number')
    if (allNumbers) {
      const col = ws.getColumn(colIndex + 1)
      col.numFmt = '#,##0'
      col.alignment = { horizontal: 'right' }
    }
  })

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
