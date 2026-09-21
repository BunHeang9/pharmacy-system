import axios from 'axios'

// ທຸກ request ໄປທີ່ /api/... → Vite proxy ສົ່ງຕໍ່ໄປຫາ Express (localhost:3000)
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // ສົ່ງ session cookie ໄປນຳ
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url || ''
    // 401 ຈາກ route ອື່ນ (ບໍ່ແມ່ນ /auth/*) = session ໝົດອາຍຸ → ກັບໄປ login
    if (err.response?.status === 401 && !url.includes('/auth/')) {
      if (location.pathname !== '/login') location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default api
