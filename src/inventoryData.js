'use strict';

/**
 * Stand-in for the online data source of Kashmir Craft product stock
 * levels (REQ-003). A plain array, mirroring the in-memory approach the
 * rest of this walking skeleton uses in place of a real external system —
 * no live inventory feed yet.
 */
const PRODUCTS = [
  { productId: 'SKU-1001', name: 'Pashmina Shawl - Ivory', quantity: 42, threshold: 10, warehouse: 'Srinagar-1' },
  { productId: 'SKU-1002', name: 'Kani Shawl - Royal Blue', quantity: 3, threshold: 5, warehouse: 'Srinagar-1' },
  { productId: 'SKU-1003', name: 'Hand-Knotted Silk Rug 6x9', quantity: 8, threshold: 4, warehouse: 'Srinagar-2' },
  { productId: 'SKU-1004', name: 'Walnut Wood Carved Box', quantity: 0, threshold: 6, warehouse: 'Srinagar-2' },
  { productId: 'SKU-1005', name: 'Paper Mache Decorative Vase', quantity: 25, threshold: 8, warehouse: 'Srinagar-1' },
  { productId: 'SKU-1006', name: 'Embroidered Wool Stole', quantity: 60, threshold: 15, warehouse: 'Srinagar-1' },
];

/**
 * Returns the current snapshot of inventory records. Accepts an options
 * object so tests can force the "source unavailable" and "empty response"
 * failure paths without touching the real fixture:
 *   options.fail: true       -> throws, simulating the data source being down
 *   options.data: []         -> returns this instead of the built-in fixture
 */
function fetchInventoryData(options = {}) {
  if (options.fail) {
    throw new Error('inventory data source is unavailable');
  }
  if (options.data !== undefined) {
    return options.data;
  }
  return PRODUCTS.map((product) => ({ ...product }));
}

module.exports = { fetchInventoryData };
