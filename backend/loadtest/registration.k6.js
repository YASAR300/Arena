import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

/**
 * k6 Load Test Script — Feedants Arena High-Concurrency Registration
 *
 * Scenarios:
 * 500 concurrent virtual users race to book spots in a competition with only 20 spots.
 *
 * Acceptance Criteria:
 * 1. Exactly 20 requests return 201 Created (confirmed booking)
 * 2. 480 requests return 409 Conflict (spots sold out)
 * 3. Zero 500 internal server errors
 * 4. P95 latency < 500ms
 */

export const options = {
  scenarios: {
    spot_rush: {
      executor: 'per-vu-iterations',
      vus: 500,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete below 500ms
    'http_req_failed': ['rate<0.01'],    // Unexpected failures must be under 1%
  },
};

const successfulBookings = new Counter('successful_bookings');
const spotsFilledRejections = new Counter('spots_filled_rejections');
const unexpectedErrors = new Counter('unexpected_errors');

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5000/api';
const COMPETITION_ID = __ENV.COMPETITION_ID || 'test_comp_id';

export default function () {
  const vuId = __VU;
  
  // Step 1: Initiate Payment Order
  const initHeaders = {
    'Content-Type': 'application/json',
    'x-load-test-bypass': 'true',
    'Authorization': `Bearer ${__ENV.TEST_TOKEN || 'test_token'}_${vuId}`,
  };

  const confirmRes = http.post(
    `${BASE_URL}/competitions/${COMPETITION_ID}/register/confirm`,
    JSON.stringify({
      razorpay_order_id: `order_load_${Date.now()}_${vuId}`,
      razorpay_payment_id: `pay_mock_load_${Date.now()}_${vuId}`,
      razorpay_signature: 'mock_signature_valid',
    }),
    { headers: initHeaders }
  );

  if (confirmRes.status === 201) {
    successfulBookings.add(1);
  } else if (confirmRes.status === 409) {
    spotsFilledRejections.add(1);
  } else {
    unexpectedErrors.add(1);
  }

  check(confirmRes, {
    'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
  });

  sleep(0.1);
}
