export const medicines = [
  { id: 1, name: "Amoxicillin", generic: "Amoxicillin Trihydrate", category: "Antibiotics", brand: "Amoxil", form: "Capsule", strength: "500mg", unit: "Capsule", purchasePrice: 8.50, sellingPrice: 14.99, stock: 240, minStock: 50, expiry: "2026-03-15", status: "In Stock", barcode: "8901030865068", sku: "AMX-500-CAP", manufacturer: "GSK", supplier: "MedSupply Co.", batchNo: "B2024-001", prescription: true },
  { id: 2, name: "Paracetamol", generic: "Acetaminophen", category: "Pain Relief", brand: "Panadol", form: "Tablet", strength: "500mg", unit: "Tablet", purchasePrice: 2.20, sellingPrice: 4.99, stock: 18, minStock: 100, expiry: "2025-08-30", status: "Low Stock", barcode: "8901030865069", sku: "PCM-500-TAB", manufacturer: "GSK", supplier: "PharmaDist Ltd.", batchNo: "B2024-002", prescription: false },
  { id: 3, name: "Metformin HCl", generic: "Metformin Hydrochloride", category: "Diabetes", brand: "Glucophage", form: "Tablet", strength: "850mg", unit: "Tablet", purchasePrice: 5.80, sellingPrice: 11.50, stock: 156, minStock: 60, expiry: "2026-12-01", status: "In Stock", barcode: "8901030865070", sku: "MFM-850-TAB", manufacturer: "Merck", supplier: "MedSupply Co.", batchNo: "B2024-003", prescription: true },
  { id: 4, name: "Atorvastatin", generic: "Atorvastatin Calcium", category: "Cardiovascular", brand: "Lipitor", form: "Tablet", strength: "40mg", unit: "Tablet", purchasePrice: 12.00, sellingPrice: 22.75, stock: 0, minStock: 30, expiry: "2026-06-20", status: "Out of Stock", barcode: "8901030865071", sku: "ATV-40-TAB", manufacturer: "Pfizer", supplier: "GlobalMed Inc.", batchNo: "B2024-004", prescription: true },
  { id: 5, name: "Cetirizine HCl", generic: "Cetirizine Hydrochloride", category: "Allergy", brand: "Zyrtec", form: "Tablet", strength: "10mg", unit: "Tablet", purchasePrice: 4.50, sellingPrice: 8.99, stock: 312, minStock: 40, expiry: "2027-02-10", status: "In Stock", barcode: "8901030865072", sku: "CTZ-10-TAB", manufacturer: "UCB Pharma", supplier: "PharmaDist Ltd.", batchNo: "B2024-005", prescription: false },
  { id: 6, name: "Omeprazole", generic: "Omeprazole", category: "Digestive", brand: "Prilosec", form: "Capsule", strength: "20mg", unit: "Capsule", purchasePrice: 6.20, sellingPrice: 12.00, stock: 45, minStock: 50, expiry: "2025-11-30", status: "Low Stock", barcode: "8901030865073", sku: "OMP-20-CAP", manufacturer: "AstraZeneca", supplier: "MedSupply Co.", batchNo: "B2024-006", prescription: false },
  { id: 7, name: "Vitamin C", generic: "Ascorbic Acid", category: "Vitamins", brand: "Celin", form: "Tablet", strength: "500mg", unit: "Tablet", purchasePrice: 1.80, sellingPrice: 3.99, stock: 580, minStock: 100, expiry: "2027-06-15", status: "In Stock", barcode: "8901030865074", sku: "VTC-500-TAB", manufacturer: "Pfizer", supplier: "VitaSupply Co.", batchNo: "B2024-007", prescription: false },
  { id: 8, name: "Amlodipine", generic: "Amlodipine Besylate", category: "Cardiovascular", brand: "Norvasc", form: "Tablet", strength: "5mg", unit: "Tablet", purchasePrice: 7.40, sellingPrice: 14.50, stock: 89, minStock: 40, expiry: "2026-09-10", status: "In Stock", barcode: "8901030865075", sku: "AML-5-TAB", manufacturer: "Pfizer", supplier: "GlobalMed Inc.", batchNo: "B2024-008", prescription: true },
  { id: 9, name: "Salbutamol", generic: "Albuterol Sulfate", category: "Respiratory", brand: "Ventolin", form: "Inhaler", strength: "100mcg", unit: "Puff", purchasePrice: 15.00, sellingPrice: 28.99, stock: 22, minStock: 30, expiry: "2025-09-01", status: "Low Stock", barcode: "8901030865076", sku: "SLB-100-INH", manufacturer: "GSK", supplier: "PharmaDist Ltd.", batchNo: "B2024-009", prescription: true },
  { id: 10, name: "Ibuprofen", generic: "Ibuprofen", category: "Pain Relief", brand: "Brufen", form: "Tablet", strength: "400mg", unit: "Tablet", purchasePrice: 3.10, sellingPrice: 6.50, stock: 420, minStock: 80, expiry: "2026-11-20", status: "In Stock", barcode: "8901030865077", sku: "IBU-400-TAB", manufacturer: "Abbott", supplier: "MedSupply Co.", batchNo: "B2024-010", prescription: false },
];

export const categories = [
  { id: 1, name: "Antibiotics", description: "Medicines that fight bacterial infections", medicines: 24, icon: "🦠" },
  { id: 2, name: "Pain Relief", description: "Analgesics and anti-inflammatory medicines", medicines: 31, icon: "💊" },
  { id: 3, name: "Vitamins", description: "Dietary supplements and vitamins", medicines: 18, icon: "🌿" },
  { id: 4, name: "Diabetes", description: "Medicines for diabetes management", medicines: 15, icon: "💉" },
  { id: 5, name: "Cardiovascular", description: "Heart and blood pressure medicines", medicines: 22, icon: "❤️" },
  { id: 6, name: "Cold & Flu", description: "Medicines for cold, flu and fever", medicines: 19, icon: "🤧" },
  { id: 7, name: "Allergy", description: "Antihistamines and allergy medicines", medicines: 12, icon: "🌸" },
  { id: 8, name: "Digestive", description: "Medicines for digestive health", medicines: 17, icon: "🫁" },
  { id: 9, name: "Skin Care", description: "Topical medicines and skin treatments", medicines: 9, icon: "🧴" },
  { id: 10, name: "Baby Care", description: "Medicines and supplements for infants", medicines: 8, icon: "👶" },
  { id: 11, name: "Respiratory", description: "Inhalers and respiratory medicines", medicines: 11, icon: "🫀" },
];

export const suppliers = [
  { id: 1, name: "MedSupply Co.", contact: "John Anderson", phone: "+1 555-0101", email: "john@medsupply.com", address: "123 Pharma St, New York, NY 10001", purchases: 48250.00, balance: 3200.00, status: "Active" },
  { id: 2, name: "PharmaDist Ltd.", contact: "Sarah Johnson", phone: "+1 555-0102", email: "sarah@pharmadist.com", address: "456 Medical Ave, Los Angeles, CA 90001", purchases: 31500.00, balance: 0, status: "Active" },
  { id: 3, name: "GlobalMed Inc.", contact: "Michael Lee", phone: "+1 555-0103", email: "michael@globalmed.com", address: "789 Health Blvd, Chicago, IL 60601", purchases: 22800.00, balance: 1500.00, status: "Active" },
  { id: 4, name: "VitaSupply Co.", contact: "Emily Chen", phone: "+1 555-0104", email: "emily@vitasupply.com", address: "321 Wellness Way, Houston, TX 77001", purchases: 15600.00, balance: 0, status: "Inactive" },
  { id: 5, name: "BioMed Solutions", contact: "Robert Wilson", phone: "+1 555-0105", email: "robert@biomed.com", address: "654 Bio Park, Phoenix, AZ 85001", purchases: 8900.00, balance: 800.00, status: "Active" },
];

export const customers = [
  { id: "C-001", name: "Margaret Thompson", phone: "+1 555-0201", email: "margaret@email.com", dob: "1978-04-15", purchases: 1840.50, lastPurchase: "2024-12-10", status: "Active" },
  { id: "C-002", name: "James Rodriguez", phone: "+1 555-0202", email: "james.r@email.com", dob: "1955-09-22", purchases: 3210.00, lastPurchase: "2024-12-12", status: "Active" },
  { id: "C-003", name: "Patricia Kim", phone: "+1 555-0203", email: "patricia.k@email.com", dob: "1990-02-08", purchases: 520.75, lastPurchase: "2024-11-28", status: "Active" },
  { id: "C-004", name: "David Patel", phone: "+1 555-0204", email: "david.p@email.com", dob: "1965-07-14", purchases: 4560.00, lastPurchase: "2024-12-14", status: "Active" },
  { id: "C-005", name: "Linda Washington", phone: "+1 555-0205", email: "linda.w@email.com", dob: "1982-11-30", purchases: 890.25, lastPurchase: "2024-12-01", status: "Inactive" },
];

export const sales = [
  { id: "INV-2024-0892", date: "2024-12-15 09:14", customer: "James Rodriguez", cashier: "Emma Davis", items: 4, subtotal: 125.50, discount: 10.00, tax: 11.55, total: 127.05, paymentStatus: "Paid", paymentMethod: "Cash" },
  { id: "INV-2024-0891", date: "2024-12-15 08:45", customer: "Walk-in Customer", cashier: "Emma Davis", items: 2, subtotal: 48.99, discount: 0, tax: 4.41, total: 53.40, paymentStatus: "Paid", paymentMethod: "Card" },
  { id: "INV-2024-0890", date: "2024-12-14 16:30", customer: "Patricia Kim", cashier: "Michael Santos", items: 6, subtotal: 215.75, discount: 21.58, tax: 17.41, total: 211.58, paymentStatus: "Paid", paymentMethod: "QR Payment" },
  { id: "INV-2024-0889", date: "2024-12-14 14:22", customer: "David Patel", cashier: "Michael Santos", items: 3, subtotal: 89.25, discount: 0, tax: 8.03, total: 97.28, paymentStatus: "Pending", paymentMethod: "Card" },
  { id: "INV-2024-0888", date: "2024-12-14 11:05", customer: "Margaret Thompson", cashier: "Emma Davis", items: 8, subtotal: 342.00, discount: 34.20, tax: 27.70, total: 335.50, paymentStatus: "Paid", paymentMethod: "Cash" },
  { id: "INV-2024-0887", date: "2024-12-13 15:40", customer: "Walk-in Customer", cashier: "Ryan Cooper", items: 1, subtotal: 14.99, discount: 0, tax: 1.35, total: 16.34, paymentStatus: "Refunded", paymentMethod: "Cash" },
];

export const purchases = [
  { id: "PO-2024-0145", supplier: "MedSupply Co.", date: "2024-12-10", items: 12, total: 3850.00, status: "Received", paymentStatus: "Paid" },
  { id: "PO-2024-0144", supplier: "PharmaDist Ltd.", date: "2024-12-08", items: 8, total: 2200.00, status: "Received", paymentStatus: "Partial" },
  { id: "PO-2024-0143", supplier: "GlobalMed Inc.", date: "2024-12-05", items: 5, total: 1500.00, status: "Pending", paymentStatus: "Pending" },
  { id: "PO-2024-0142", supplier: "BioMed Solutions", date: "2024-12-01", items: 3, total: 680.00, status: "Received", paymentStatus: "Paid" },
  { id: "PO-2024-0141", supplier: "MedSupply Co.", date: "2024-11-28", items: 15, total: 4120.00, status: "Received", paymentStatus: "Paid" },
];

export const prescriptions = [
  { id: "RX-2024-1201", patient: "James Rodriguez", doctor: "Dr. Sarah Mitchell", date: "2024-12-14", medicines: 3, status: "Pending", pharmacist: "Emma Davis" },
  { id: "RX-2024-1200", patient: "Margaret Thompson", doctor: "Dr. Carlos Rivera", date: "2024-12-13", medicines: 2, status: "Completed", pharmacist: "Michael Santos" },
  { id: "RX-2024-1199", patient: "David Patel", doctor: "Dr. Amy Chen", date: "2024-12-12", medicines: 4, status: "Processing", pharmacist: "Emma Davis" },
  { id: "RX-2024-1198", patient: "Linda Washington", doctor: "Dr. James Park", date: "2024-12-11", medicines: 1, status: "Completed", pharmacist: "Ryan Cooper" },
  { id: "RX-2024-1197", patient: "Patricia Kim", doctor: "Dr. Sarah Mitchell", date: "2024-12-10", medicines: 2, status: "Cancelled", pharmacist: "-" },
];

export const staff = [
  { id: 1, name: "Dr. Amanda Foster", email: "amanda@rxpharm.com", phone: "+1 555-0301", role: "Super Admin", status: "Active", lastLogin: "2024-12-15 09:00" },
  { id: 2, name: "Emma Davis", email: "emma@rxpharm.com", phone: "+1 555-0302", role: "Pharmacist", status: "Active", lastLogin: "2024-12-15 08:30" },
  { id: 3, name: "Michael Santos", email: "michael@rxpharm.com", phone: "+1 555-0303", role: "Cashier", status: "Active", lastLogin: "2024-12-15 08:15" },
  { id: 4, name: "Ryan Cooper", email: "ryan@rxpharm.com", phone: "+1 555-0304", role: "Inventory Manager", status: "Active", lastLogin: "2024-12-14 17:45" },
  { id: 5, name: "Jennifer Walsh", email: "jennifer@rxpharm.com", phone: "+1 555-0305", role: "Admin", status: "Inactive", lastLogin: "2024-12-10 14:20" },
];

export const salesChartData = [
  { day: "Mon", sales: 2840, purchases: 1200 },
  { day: "Tue", sales: 3250, purchases: 0 },
  { day: "Wed", sales: 2100, purchases: 3850 },
  { day: "Thu", sales: 4200, purchases: 0 },
  { day: "Fri", sales: 3800, purchases: 2200 },
  { day: "Sat", sales: 5100, purchases: 0 },
  { day: "Sun", sales: 1900, purchases: 0 },
];

export const monthlySalesData = [
  { month: "Jul", sales: 38400 },
  { month: "Aug", sales: 42100 },
  { month: "Sep", sales: 39800 },
  { month: "Oct", sales: 45200 },
  { month: "Nov", sales: 51800 },
  { month: "Dec", sales: 28600 },
];

export const categoryShareData = [
  { name: "Antibiotics", value: 28, color: "#1d6fcd" },
  { name: "Pain Relief", value: 22, color: "#0d9488" },
  { name: "Vitamins", value: 15, color: "#10b981" },
  { name: "Diabetes", value: 12, color: "#f59e0b" },
  { name: "Cardiovascular", value: 10, color: "#8b5cf6" },
  { name: "Cold & Flu", value: 8, color: "#ef4444" },
  { name: "Other", value: 5, color: "#94a3b8" },
];

export const expiryData = [
  { id: 1, medicine: "Paracetamol", batch: "B2024-002", qty: 18, expiry: "2025-08-30", daysRemaining: 257, supplier: "PharmaDist Ltd.", status: "Safe" },
  { id: 2, medicine: "Salbutamol Inhaler", batch: "B2024-009", qty: 22, expiry: "2025-09-01", daysRemaining: 259, supplier: "PharmaDist Ltd.", status: "Safe" },
  { id: 3, medicine: "Omeprazole 20mg", batch: "B2023-118", qty: 15, expiry: "2024-12-31", daysRemaining: 16, supplier: "MedSupply Co.", status: "Critical" },
  { id: 4, medicine: "Cefuroxime 500mg", batch: "B2023-092", qty: 8, expiry: "2024-12-20", daysRemaining: 5, supplier: "GlobalMed Inc.", status: "Critical" },
  { id: 5, medicine: "Aspirin 100mg", batch: "B2023-055", qty: 30, expiry: "2024-12-10", daysRemaining: -5, supplier: "MedSupply Co.", status: "Expired" },
  { id: 6, medicine: "Vitamin D3", batch: "B2024-015", qty: 120, expiry: "2025-01-15", daysRemaining: 31, supplier: "VitaSupply Co.", status: "Expiring Soon" },
  { id: 7, medicine: "Metformin 850mg", batch: "B2024-003", qty: 156, expiry: "2026-12-01", daysRemaining: 716, supplier: "MedSupply Co.", status: "Safe" },
  { id: 8, medicine: "Lisinopril 10mg", batch: "B2023-201", qty: 5, expiry: "2025-01-20", daysRemaining: 36, supplier: "GlobalMed Inc.", status: "Expiring Soon" },
];

export const inventoryData = medicines.map(m => ({
  ...m,
  reserved: Math.floor(m.stock * 0.1),
  available: Math.floor(m.stock * 0.9),
  stockStatus: m.stock === 0 ? "Out of Stock" : m.stock < m.minStock ? "Low Stock" : "In Stock",
}));

export const notifications = [
  { id: 1, type: "warning", title: "Low Stock Alert", message: "Paracetamol 500mg is below minimum stock level (18 remaining)", time: "10 min ago", read: false },
  { id: 2, type: "danger", title: "Expiry Alert", message: "Omeprazole 20mg (Batch B2023-118) expires in 16 days", time: "1 hr ago", read: false },
  { id: 3, type: "info", title: "New Prescription", message: "Prescription RX-2024-1201 received for James Rodriguez", time: "2 hrs ago", read: false },
  { id: 4, type: "warning", title: "Low Stock Alert", message: "Salbutamol Inhaler is below minimum stock level (22 remaining)", time: "3 hrs ago", read: true },
  { id: 5, type: "success", title: "Purchase Received", message: "PO-2024-0144 from PharmaDist Ltd. has been received", time: "5 hrs ago", read: true },
  { id: 6, type: "danger", title: "Expired Medicine", message: "Aspirin 100mg (Batch B2023-055) has expired - action required", time: "1 day ago", read: true },
];
