// ແປລະຫັດ error ຈາກ server (data.code) ໃຫ້ເປັນຂໍ້ຄວາມຕາມພາສາທີ່ເລືອກ
// ໃຊ້ຮ່ວມກັນທຸກໜ້າ: apiErrorMessage(e, t) ແທນ e?.response?.data?.error ເກົ່າ
import { formatMoney } from '@/utils/money'

type TFunc = (key: string, named?: Record<string, unknown>) => string

const KNOWN_FIELDS = ['name', 'email', 'phone', 'barcode', 'sku']

export function apiErrorMessage(err: any, t: TFunc): string {
  const data = err?.response?.data
  const code: string | undefined = data?.code

  if (!code) return data?.error || t('errors.generic')

  switch (code) {
    case 'DUPLICATE_VALUE': {
      const fieldKey = KNOWN_FIELDS.includes(data.field) ? data.field : 'value'
      return t('errors.DUPLICATE_VALUE', { field: t(`errors.fields.${fieldKey}`) })
    }
    case 'INSUFFICIENT_STOCK':
      return t('errors.INSUFFICIENT_STOCK', { available: data.available })
    case 'CATEGORY_HAS_MEDICINES':
      return t('errors.CATEGORY_HAS_MEDICINES', { count: data.count })
    case 'SUPPLIER_HAS_BALANCE':
      return t('errors.SUPPLIER_HAS_BALANCE', { balance: formatMoney(data.balance) })
    case 'PAYMENT_EXCEEDS_BALANCE':
      return t('errors.PAYMENT_EXCEEDS_BALANCE', { balance: formatMoney(data.balance) })
    case 'PURCHASE_NOT_PENDING':
    case 'PRESCRIPTION_ALREADY_PROCESSED':
      return t(`errors.${code}`, { status: t(`errors.status.${data.status}`) })
    case 'INVALID_INPUT':
    case 'INVALID_CREDENTIALS':
    case 'NOT_AUTHENTICATED':
    case 'NOT_FOUND':
    case 'CORRECTION_REQUIRES_BATCH':
    case 'CANNOT_DEACTIVATE_SELF':
    case 'SERVER_ERROR':
      return t(`errors.${code}`)
    default:
      return data?.error || t('errors.generic')
  }
}
