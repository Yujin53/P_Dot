/**
 * P_Dot End-to-End API Smoke Test
 * Tests core system endpoints, authentication, role boundaries, and full ride lifecycle.
 */
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

// Simple ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const results = [];

const logStep = (name, status, details = '') => {
  const mark = status ? `${colors.green}✔ PASS${colors.reset}` : `${colors.red}✖ FAIL${colors.reset}`;
  console.log(`  ${mark} ${name} ${details ? `${colors.yellow}(${details})${colors.reset}` : ''}`);
  results.push({ name, status, details });
};

// Generic fetch wrapper using Node.js native fetch (Node 18+)
const request = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
};

const runSmokeTest = async () => {
  console.log('\n======================================================');
  console.log(`  ${colors.bold}${colors.cyan}P_Dot Platform — Automated API Smoke Test${colors.reset}`);
  console.log(`  Target: ${BASE_URL}`);
  console.log('======================================================\n');

  // 1. Health check & Server reachability
  console.log(`${colors.bold}[1/5] Checking Server Reachability...${colors.reset}`);
  const homeRes = await request('/');
  if (homeRes.status === 0) {
    console.error(`\n${colors.red}${colors.bold}ERROR: Unable to connect to P_Dot server at ${BASE_URL}.${colors.reset}`);
    console.error('Please make sure your server is running in another terminal:\n  npm run dev\n');
    process.exit(1);
  }
  logStep('Web Server is live on port ' + PORT, homeRes.status === 200);

  // 2. Public Endpoints
  console.log(`\n${colors.bold}[2/5] Testing Public Tuguegarao APIs...${colors.reset}`);
  
  const rulesRes = await request('/api/fare-rules');
  const rulesOk = rulesRes.ok && rulesRes.data.success && Array.isArray(rulesRes.data.data) && rulesRes.data.data.length > 0;
  logStep('GET /api/fare-rules', rulesOk, rulesOk ? `${rulesRes.data.data.length} rules loaded` : 'Failed');

  const locsRes = await request('/api/locations');
  const locsOk = locsRes.ok && locsRes.data.success && Array.isArray(locsRes.data.data) && locsRes.data.data.length > 0;
  logStep('GET /api/locations', locsOk, locsOk ? `${locsRes.data.data.length} Tuguegarao landmarks` : 'Failed');

  const estimateRes = await request('/api/rides/estimate', {
    method: 'POST',
    body: JSON.stringify({
      pickup: { barangay: 'Ugac Norte', latitude: 17.6080, longitude: 121.7225 },
      destination: { barangay: 'Tanza', latitude: 17.6385, longitude: 121.7348 },
      serviceType: 'tricycle'
    })
  });
  const estOk = estimateRes.ok && estimateRes.data.success && estimateRes.data.data.estimatedFare > 0;
  logStep('POST /api/rides/estimate (SPUP -> Robinsons)', estOk, estOk ? `PHP ${estimateRes.data.data.estimatedFare}` : 'Failed');

  // 3. User Authentication & JWT Issuance
  console.log(`\n${colors.bold}[3/5] Testing Role Authentication & JWT Tokens...${colors.reset}`);

  // Passenger login
  const passLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId: 'passenger@demo.pdot', password: 'Password123!' })
  });
  const passOk = passLogin.ok && passLogin.data.success && passLogin.data.data.token;
  const passToken = passOk ? passLogin.data.data.token : null;
  logStep('POST /api/auth/login (Passenger)', passOk, passOk ? 'JWT issued' : 'Invalid credentials');

  // Driver login
  const driverLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId: 'driver@demo.pdot', password: 'Password123!' })
  });
  const driverOk = driverLogin.ok && driverLogin.data.success && driverLogin.data.data.token;
  const driverToken = driverOk ? driverLogin.data.data.token : null;
  logStep('POST /api/auth/login (Driver)', driverOk, driverOk ? 'JWT issued' : 'Invalid credentials');

  // SuperAdmin login
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPdot2026!';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@pdot.ph';
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId: adminEmail, password: adminPassword })
  });
  const adminOk = adminLogin.ok && adminLogin.data.success && adminLogin.data.data.token;
  const adminToken = adminOk ? adminLogin.data.data.token : null;
  logStep('POST /api/auth/login (SuperAdmin)', adminOk, adminOk ? 'JWT issued' : 'Invalid credentials');

  // 4. Role-Based Access Control (RBAC) Security Boundaries
  console.log(`\n${colors.bold}[4/5] Testing Role-Based Security Boundaries...${colors.reset}`);

  if (passToken) {
    const forbiddenRes = await request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${passToken}` }
    });
    const rbacOk = forbiddenRes.status === 403;
    logStep('RBAC: Passenger blocked from Admin Dashboard', rbacOk, `HTTP ${forbiddenRes.status}`);
  }

  if (adminToken) {
    const adminDashRes = await request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const statsData = adminDashRes.data?.data?.stats || adminDashRes.data?.data;
    const adminDashOk = adminDashRes.ok && adminDashRes.data?.success && statsData && statsData.totalUsers !== undefined;
    logStep('RBAC: SuperAdmin authorized for Admin Dashboard', adminDashOk, adminDashOk ? `${statsData.totalUsers} users recorded` : 'Denied');
  }

  // 5. Complete Ride Lifecycle Simulation
  console.log(`\n${colors.bold}[5/5] Testing End-to-End Ride Lifecycle...${colors.reset}`);

  if (passToken && driverToken) {
    // 5a. Driver goes Online
    const onlineRes = await request('/api/drivers/availability', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${driverToken}` },
      body: JSON.stringify({ isOnline: true, latitude: 17.6132, longitude: 121.7270, barangay: 'Centro 02' })
    });
    logStep('Driver sets status to ONLINE', onlineRes.ok);

    // 5b. Passenger requests a ride
    const createRideRes = await request('/api/rides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${passToken}` },
      body: JSON.stringify({
        pickup: {
          label: 'SPUP Gate 2',
          address: 'Mabini Street, Ugac Norte',
          barangay: 'Ugac Norte',
          latitude: 17.6080,
          longitude: 121.7225
        },
        destination: {
          label: 'Robinsons Place Tuguegarao',
          address: 'Maharlika Highway, Tanza',
          barangay: 'Tanza',
          latitude: 17.6385,
          longitude: 121.7348
        },
        serviceType: 'tricycle',
        paymentMethod: 'cash',
        passengerNotes: 'Smoke test automated booking'
      })
    });
    const rideCreated = createRideRes.ok && createRideRes.data.success && createRideRes.data.data._id;
    const rideId = rideCreated ? createRideRes.data.data._id : null;
    logStep('Passenger creates ride request', rideCreated, rideId ? `Ride #${rideId.slice(-6)}` : 'Failed');

    if (rideId) {
      // 5c. Driver accepts ride (Atomic race protection)
      const acceptRes = await request(`/api/rides/${rideId}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${driverToken}` }
      });
      logStep('Driver accepts ride (Atomic Lock)', acceptRes.ok, acceptRes.ok ? 'Status: accepted' : 'Failed');

      // 5d. Status progression: driver_arriving -> driver_arrived -> trip_started -> completed
      const arrivingRes = await request(`/api/rides/${rideId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${driverToken}` },
        body: JSON.stringify({ status: 'driver_arriving' })
      });
      logStep('Status transition: driver_arriving', arrivingRes.ok);

      const arrivedRes = await request(`/api/rides/${rideId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${driverToken}` },
        body: JSON.stringify({ status: 'driver_arrived' })
      });
      logStep('Status transition: driver_arrived', arrivedRes.ok);

      const startedRes = await request(`/api/rides/${rideId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${driverToken}` },
        body: JSON.stringify({ status: 'trip_started' })
      });
      logStep('Status transition: trip_started', startedRes.ok);

      const completeRes = await request(`/api/rides/${rideId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${driverToken}` },
        body: JSON.stringify({ status: 'completed' })
      });
      logStep('Status transition: completed', completeRes.ok);

      // 5e. Passenger rates the driver
      const driverId = acceptRes.data?.data?.driver || driverLogin.data?.data?.driverProfile?._id;
      if (driverId) {
        const rateRes = await request('/api/ratings', {
          method: 'POST',
          headers: { Authorization: `Bearer ${passToken}` },
          body: JSON.stringify({
            rideId,
            driverId,
            rating: 5,
            comment: 'Excellent, prompt, and safe tricycle ride around Tuguegarao!'
          })
        });
        logStep('Passenger submits 5-star rating', rateRes.ok, rateRes.ok ? 'Rating saved' : rateRes.data?.message || 'Failed');
      }

      // 5f. Printable Receipt Summary
      const summaryRes = await request(`/api/rides/${rideId}/summary`, {
        headers: { Authorization: `Bearer ${passToken}` }
      });
      logStep('GET /api/rides/:id/summary (Receipt)', summaryRes.ok, summaryRes.ok ? `Final Fare: PHP ${summaryRes.data.data.finalFare}` : 'Failed');
    }
  }

  // Summary
  console.log('\n======================================================');
  const passed = results.filter(r => r.status).length;
  const failed = results.filter(r => !r.status).length;

  if (failed === 0) {
    console.log(`  ${colors.bold}${colors.green}ALL TESTS PASSED! (${passed}/${results.length})${colors.reset}`);
    console.log(`  P_Dot ride-hailing backend is fully operational.`);
    console.log('======================================================\n');
    process.exit(0);
  } else {
    console.log(`  ${colors.bold}${colors.red}SMOKE TEST FAILED: ${failed} error(s) detected out of ${results.length} tests.${colors.reset}`);
    console.log('======================================================\n');
    process.exit(1);
  }
};

runSmokeTest();
