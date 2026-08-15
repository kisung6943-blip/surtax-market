import { SettlementOrder, CostMasterItem } from '../dailyCalculatorTypes';

/**
 * Normalizes product/option name string for matching
 */
export function normalizeName(str: string): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Finds matching cost item from Cost Master list
 */
export function findMatchingCost(
  productName: string,
  optionName: string,
  costMaster: CostMasterItem[]
): number {
  if (!costMaster || costMaster.length === 0) return 0;

  const normProduct = normalizeName(productName);
  const normOption = normalizeName(optionName);

  // 1. Exact match on both Product + Option
  let match = costMaster.find(
    (item) =>
      normalizeName(item.productName) === normProduct &&
      normalizeName(item.optionName) === normOption
  );
  if (match) return match.cost;

  // 2. Exact match on Product with empty option in Master
  match = costMaster.find(
    (item) =>
      normalizeName(item.productName) === normProduct &&
      (!item.optionName || normalizeName(item.optionName) === '')
  );
  if (match) return match.cost;

  // 3. Partial match on Product name
  match = costMaster.find(
    (item) =>
      normProduct.includes(normalizeName(item.productName)) ||
      normalizeName(item.productName).includes(normProduct)
  );
  if (match) return match.cost;

  return 0;
}

/**
 * Recalculates settlement metrics for an order
 */
export function calculateOrderMetrics(
  order: Partial<SettlementOrder>,
  costMaster: CostMasterItem[],
  allocatedAdSpend: number = 0
): SettlementOrder {
  const quantity = order.quantity || 1;
  const salesAmount = order.salesAmount || 0;
  const feeAmount = order.feeAmount || 0;
  const settlementAmount = order.settlementAmount ?? (salesAmount - feeAmount);

  // Get Unit Cost
  const costPerUnit =
    order.costPerUnit !== undefined && order.costPerUnit > 0
      ? order.costPerUnit
      : findMatchingCost(order.productName || '', order.optionName || '', costMaster);

  const totalCost = quantity * costPerUnit;
  const adSpend = allocatedAdSpend || order.adSpend || 0;
  const netProfit = settlementAmount - totalCost - adSpend;
  const marginRate = salesAmount > 0 ? (netProfit / salesAmount) * 100 : 0;

  return {
    id: order.id || `order_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    platform: order.platform || 'smartstore',
    orderDate: order.orderDate || new Date().toISOString().split('T')[0],
    settlementDate: order.settlementDate,
    productName: order.productName || '상품명 미입력',
    optionName: order.optionName || '',
    quantity,
    salesAmount,
    feeAmount,
    settlementAmount,
    costPerUnit,
    totalCost,
    adSpend,
    netProfit,
    marginRate,
    status: order.status || 'pending',
    rawExcelData: order.rawExcelData,
  };
}

/**
 * Formats currency to Korean Won (KRW) string
 */
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats number to comma-separated string
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num);
}
