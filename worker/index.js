// ໜ້າ frontend ແລະ backend ຢູ່ຄົນລະ domain ກັນ — Safari/iOS ບໍ່ຍອມເກັບ cookie ຂ້າມ domain
// (SameSite=None ຖືກ ITP ບລັອກ) ເຖິງແມ່ນຈະ login ສຳເລັດກໍ່ຕາມ. ແກ້ໄຂໂດຍໃຫ້ Worker ນີ້
// proxy /api/* ໄປຫາ Railway ແທນທີ່ browser ຈະຍິງກົງໄປ — browser ເຫັນວ່າມັນ same-origin ໝົດ
const API_BACKEND = 'https://pharmacy-system-production-d370.up.railway.app'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = API_BACKEND + url.pathname + url.search
      const proxied = new Request(backendUrl, request)
      return fetch(proxied)
    }
    return env.ASSETS.fetch(request)
  },
}
