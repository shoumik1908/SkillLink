const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🛡️ Starting Dashboard & RBAC Security Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Logged out user calling /api/admin/* -> 401
    const adminEndpoints = ['/admin/stats', '/admin/analytics', '/admin/attention', '/admin/users', '/admin/listings', '/admin/reports', '/admin/audit-log'];
    for (const ep of adminEndpoints) {
      const res = await fetch(`${BASE_URL}${ep}`);
      assert(res.status === 401, `Logged out user calling ${ep} gets 401 Unauthorized (got ${res.status})`);
    }

    // 2. Logged out user calling /api/dashboard/* -> 401
    const dashboardEndpoints = ['/dashboard/summary', '/dashboard/my-listings', '/dashboard/incoming-requests', '/dashboard/skill-demand', '/dashboard/recommended', '/dashboard/activity'];
    for (const ep of dashboardEndpoints) {
      const res = await fetch(`${BASE_URL}${ep}`);
      assert(res.status === 401, `Logged out user calling ${ep} gets 401 Unauthorized (got ${res.status})`);
    }

    // 3. Log in as Student
    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@uni.edu', password: 'Student123!' }),
    });
    const studentCookie = studentLoginRes.headers.get('set-cookie');
    const studentData = await studentLoginRes.json();
    assert(studentLoginRes.status === 200 && studentData.user?.role === 'user', 'Student logs in successfully with role=user');

    // 4. Normal Student calling /api/admin/* -> 403 Forbidden
    for (const ep of adminEndpoints) {
      const res = await fetch(`${BASE_URL}${ep}`, {
        headers: { Cookie: studentCookie },
      });
      assert(res.status === 403, `Normal student calling ${ep} is blocked with 403 Forbidden (got ${res.status})`);
    }

    // 5. Normal Student calling /api/dashboard/* endpoints
    for (const ep of dashboardEndpoints) {
      const res = await fetch(`${BASE_URL}${ep}`, {
        headers: { Cookie: studentCookie },
      });
      const data = await res.json();
      assert(res.status === 200, `Student calling ${ep} receives 200 OK (got ${res.status})`);
    }

    // 6. Log in as Admin
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@uni.edu', password: 'AdminPassword123!' }),
    });
    const adminCookie = adminLoginRes.headers.get('set-cookie');
    const adminData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminData.user?.role === 'admin', 'Admin logs in successfully with role=admin');

    // 7. Ownership check: Create a listing as Admin, then try to edit it as Student
    const adminListingRes = await fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        title: 'Admin Secret Initiative',
        description: 'Classified admin research.',
        type: 'Project',
        intendedTeamSize: 2,
        requiredSkills: ['Cryptography', 'Python'],
      }),
    });
    const adminListing = (await adminListingRes.json()).listing;
    assert(adminListingRes.status === 201 && adminListing?.id, 'Admin creates a test listing');

    // Student tries to edit or close Admin's listing -> 403 Forbidden
    const studentEditRes = await fetch(`${BASE_URL}/listings/${adminListing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ title: 'Hacked Title', status: 'CLOSED' }),
    });
    assert(studentEditRes.status === 403, `Student editing admin's listing is rejected with 403 Forbidden (got ${studentEditRes.status})`);

    // 8. Student creates a listing with capacity = 1
    const studentListingRes = await fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        title: 'Solo Capstone Project',
        description: 'Single person project already full.',
        type: 'Project',
        intendedTeamSize: 1, // Full because owner counts as 1!
        requiredSkills: ['React'],
      }),
    });
    const studentListing = (await studentListingRes.json()).listing;
    assert(studentListingRes.status === 201 && studentListing?.id, 'Student creates listing with intendedTeamSize=1');

    // Admin sends join request to student's listing
    const joinReqRes = await fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ listingId: studentListing.id, message: 'I want to join' }),
    });
    const joinReqData = await joinReqRes.json();
    const requestId = joinReqData.request?.id;
    assert(joinReqRes.status === 201 && requestId, 'Join request submitted');

    // Another user (or someone not owner) trying to accept request -> 403
    // But student owner trying to approve when capacity is full (intendedTeamSize = 1, current size = 1) -> 400 Team Full!
    const approveFullRes = await fetch(`${BASE_URL}/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ status: 'approved' }),
    });
    const approveFullData = await approveFullRes.json();
    assert(
      approveFullRes.status === 400 && approveFullData.message?.includes('full'),
      `Approving request when team is full is rejected with 400 (got ${approveFullRes.status}: "${approveFullData.message}")`
    );

    // Student can decline request
    const declineRes = await fetch(`${BASE_URL}/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ status: 'denied' }),
    });
    assert(declineRes.status === 200, `Student declines request successfully (got ${declineRes.status})`);

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log('\n========================================');
  console.log(`Security Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
