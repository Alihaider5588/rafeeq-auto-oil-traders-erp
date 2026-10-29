export type Role = 'ADMIN' | 'CASHIER' | 'OPERATOR' | 'SALESMAN';

export interface User {
  id: string;
  username: string;
  fullName: string;
  phone?: string;
  role: Role;
  permissions?: string[];
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { products: number };
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  category?: Category;
  brand: string;
  unitId: string;
  unit?: Unit;
  primaryUnitId?: string;
  primaryUnit?: Unit;
  conversionFactor?: number;
  purchasePrice: string | number;
  salePrice: string | number;
  wholesalePrice?: string | number;
  minimumStockLevel: string | number;
  openingStock: string | number;
  currentStock: string | number;
  description?: string;
  specifications?: string;
  imageUrl?: string;
  showOnWebsite?: boolean;
  showInCatalog?: boolean;
  showPublicPrice?: boolean;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson?: string;
  phone: string;
  address?: string;
  ntnTaxNumber?: string;
  openingBalance: string | number;
  currentPayable: string | number;
  notes?: string;
  isActive: boolean;
  isDualPartner?: boolean;
  linkedCustomerId?: string;
}

export interface Customer {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address?: string;
  area?: string;
  salesmanId?: string;
  salesman?: { id: string; fullName: string; username: string };
  openingBalance: string | number;
  currentReceivable: string | number;
  creditLimit: string | number;
  notes?: string;
  isActive: boolean;
  isDualPartner?: boolean;
  linkedSupplierId?: string;
}

export interface DualPartner {
  id: string;
  customerId: string;
  supplierId: string;
  name: string;
  ownerName: string;
  phone: string;
  address?: string;
  area?: string;
  salesman?: { id: string; fullName: string; username: string };
  currentReceivable: number;
  currentPayable: number;
  netBalance: number;
  status: 'RECEIVABLE' | 'PAYABLE' | 'CLEARED';
  notes?: string;
}

export interface SaleItem {
  id?: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitType?: 'PRIMARY' | 'SECONDARY' | string;
  baseQuantity?: number;
  unitPrice: number;
  unitCost?: number;
  totalPrice: number;
  profit?: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: Customer;
  salesmanId?: string;
  salesman?: { id: string; fullName: string; phone?: string };
  createdBy: { id: string; fullName: string };
  saleDate: string;
  totalAmount: string | number;
  discount: string | number;
  netAmount: string | number;
  receivedAmount: string | number;
  remainingBalance: string | number;
  grossProfit?: string | number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'ONLINE';
  status: 'COMPLETED' | 'PENDING_APPROVAL' | 'CANCELLED';
  notes?: string;
  items: SaleItem[];
}

export interface PurchaseItem {
  id?: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplier: Supplier;
  purchaseDate: string;
  totalAmount: string | number;
  discount: string | number;
  tax: string | number;
  netAmount: string | number;
  paidAmount: string | number;
  remainingAmount: string | number;
  paymentMethod: string;
  items: PurchaseItem[];
  createdBy?: { fullName: string };
}

export interface LedgerEntry {
  id: string;
  date: string;
  transactionType: string;
  referenceId?: string;
  description: string;
  debit: string | number;
  credit: string | number;
  runningBalance: string | number;
}

export interface RouteSchedule {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  routeName: string;
  targetAreas?: string;
  driverName?: string;
  notes?: string;
  isActive: boolean;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  supplyManName: string;
  notes?: string;
  isActive: boolean;
  routeSchedules?: RouteSchedule[];
}

export interface DailyDelivery {
  id: string;
  deliveryNumber: string;
  date: string;
  vehicleId: string;
  vehicle: Vehicle;
  routeArea: string;
  salesman?: { fullName: string };
  totalCustomers: number;
  totalDelivered: string | number;
  paymentReceived: string | number;
  creditAmount: string | number;
  returnedGoods: string | number;
  netSales: string | number;
  notes?: string;
  items: Array<{
    id: string;
    product: Product;
    quantity: string | number;
    unitPrice: string | number;
    totalPrice: string | number;
    isAdditional?: boolean;
    notes?: string;
  }>;
}
