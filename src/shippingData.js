'use strict';

/**
 * Stand-in for the online data source of Kashmir Craft shipment records
 * (REQ-004). A plain array, mirroring the in-memory approach the rest of
 * this walking skeleton uses in place of a real external system — no live
 * carrier feed yet.
 */
const SHIPMENTS = [
  { orderId: 'ORD-2001', carrier: 'BlueDart', shippedAt: '2026-09-01T10:00:00Z', expectedDurationDays: 5, actualDurationDays: 4, destination: 'Mumbai' },
  { orderId: 'ORD-2002', carrier: 'DTDC', shippedAt: '2026-08-28T10:00:00Z', expectedDurationDays: 4, actualDurationDays: 9, destination: 'Delhi' },
  { orderId: 'ORD-2003', carrier: 'India Post', shippedAt: '2026-08-30T10:00:00Z', expectedDurationDays: 7, actualDurationDays: 7, destination: 'Bengaluru' },
  { orderId: 'ORD-2004', carrier: 'BlueDart', shippedAt: '2026-08-25T10:00:00Z', expectedDurationDays: 5, actualDurationDays: 12, destination: 'Chennai' },
  { orderId: 'ORD-2005', carrier: 'Delhivery', shippedAt: '2026-09-03T10:00:00Z', expectedDurationDays: 6, actualDurationDays: 3, destination: 'Pune' },
  { orderId: 'ORD-2006', carrier: 'DTDC', shippedAt: '2026-08-29T10:00:00Z', expectedDurationDays: 5, actualDurationDays: 6, destination: 'Kolkata' },
];

/**
 * Returns the current snapshot of shipment records. Accepts an options
 * object so tests can force the "source unavailable" and "empty response"
 * failure paths without touching the real fixture:
 *   options.fail: true       -> throws, simulating the data source being down
 *   options.data: []         -> returns this instead of the built-in fixture
 */
function fetchShippingData(options = {}) {
  if (options.fail) {
    throw new Error('shipping data source is unavailable');
  }
  if (options.data !== undefined) {
    return options.data;
  }
  return SHIPMENTS.map((shipment) => ({ ...shipment }));
}

module.exports = { fetchShippingData };
