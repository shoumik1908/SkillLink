// Automated test runner for Admin Dashboard verification requirements
const BASE_URL = 'http://localhost:5000/api';

async function runAdminTests() {
  console.log('🛡️ Starting Admin Dashboard & RBAC Verification Suite...\n');
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

  // 1. Log in as Admin
  let adminCookie = '';
  let adminId = '';
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@uni.edu', password: 'AdminPassword123!' }),
    });
    const data = await res.json();
    adminCookie = res.headers.get('set-cookie')?.split(';')[0] || '';
    adminId = data.user?.id;
    assert(res.status === 200 && data.user?.role === 'admin', 'Admin logs in successfully');
  } catch (e) {
    assert(false, `Admin login error: ${e.message}`);
  }

  // 2. Log in as Student
  let studentCookie = '';
  let studentId = '';
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@uni.edu', password: 'Student123!' }),
    });
    const data = await res.json();
    studentCookie = res.headers.get('set-cookie')?.split(';')[0] || '';
    studentId = data.user?.id;
    assert(res.status === 200 && data.user?.role === 'user', 'Student logs in successfully');
  } catch (e) {
    assert(false, `Student login error: ${e.message}`);
  }

  // 3. Logged-out user calling /api/admin/stats directly -> 401
  try {
    const res = await fetch(`${BASE_URL}/admin/stats`);
    assert(res.status === 401, 'Logged-out user calling /api/admin/stats gets 401');
  } catch (e) {
    assert(false, `Logged-out test error: ${e.message}`);
  }

  // 4. Normal user calling any /api/admin/* route directly -> 403
  try {
    const res = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Cookie: studentCookie },
    });
    assert(res.status === 403, 'Normal student calling /api/admin/stats gets 403 Forbidden');
  } catch (e) {
    assert(false, `Student 403 test error: ${e.message}`);
  }

  // 5. Admin fetching stats and analytics -> 200 OK
  try {
    const [statsRes, analyticsRes] = await Promise.all([
      fetch(`${BASE_URL}/admin/stats`, { headers: { Cookie: adminCookie } }),
      fetch(`${BASE_URL}/admin/analytics`, { headers: { Cookie: adminCookie } }),
    ]);
    const statsData = await statsRes.json();
    const analyticsData = await analyticsRes.json();
    assert(
      statsRes.status === 200 && statsData.totalUsers !== undefined && analyticsData.signupsByDay,
      'Admin fetches /api/admin/stats and /api/admin/analytics with valid datasets'
    );
  } catch (e) {
    assert(false, `Admin stats error: ${e.message}`);
  }

  // 6. Admin cannot demote themselves -> 400
  try {
    const res = await fetch(`${BASE_URL}/admin/users/${adminId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ role: 'user' }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message.includes('cannot modify their own role'),
      'Admin cannot demote themselves (blocked with 400)'
    );
  } catch (e) {
    assert(false, `Self-demote error: ${e.message}`);
  }

  // 7. Admin cannot suspend themselves -> 400
  try {
    const res = await fetch(`${BASE_URL}/admin/users/${adminId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ is_active: false }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message.includes('cannot suspend their own account'),
      'Admin cannot suspend themselves (blocked with 400)'
    );
  } catch (e) {
    assert(false, `Self-suspend error: ${e.message}`);
  }

  // 8. Create a test student, change role, and verify audit_log
  let testUserId = '';
  try {
    const testEmail = `mod_test_${Date.now()}@uni.edu`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Moderation Target', email: testEmail, password: 'Password123!' }),
    });
    const regData = await regRes.json();
    testUserId = regData.user.id;

    // Change role to admin
    const promoteRes = await fetch(`${BASE_URL}/admin/users/${testUserId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ role: 'admin' }),
    });
    assert(promoteRes.status === 200, 'Admin can promote user to admin');

    // Demote back to user
    const demoteRes = await fetch(`${BASE_URL}/admin/users/${testUserId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ role: 'user' }),
    });
    assert(demoteRes.status === 200, 'Admin can demote user back to user when other admins exist');

    // Suspend user
    const suspendRes = await fetch(`${BASE_URL}/admin/users/${testUserId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ is_active: false }),
    });
    assert(suspendRes.status === 200, 'Admin can suspend user');

    // Verify suspended user cannot log in
    const loginAttempt = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' }),
    });
    assert(
      loginAttempt.status === 403,
      'Suspended user cannot log in (blocked with 403 Account deactivated)'
    );

    // Verify audit log has recorded actions
    const auditRes = await fetch(`${BASE_URL}/admin/audit-log?pageSize=10`, {
      headers: { Cookie: adminCookie },
    });
    const auditData = await auditRes.json();
    const actions = auditData.logs.map((l) => l.action);
    assert(
      actions.includes('USER_ROLE_UPDATED') && actions.includes('USER_SUSPENDED'),
      'State-changing actions recorded in audit_log'
    );
  } catch (e) {
    assert(false, `User moderation error: ${e.message}`);
  }

  // 9. Admin listing moderation -> updates listing and records in audit_log
  try {
    // Create a listing as student
    const createListRes = await fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        title: 'Reportable Project',
        description: 'Testing listing moderation',
        type: 'Project',
        intendedTeamSize: 2,
        requiredSkills: ['Python'],
      }),
    });
    const listData = await createListRes.json();
    const listingId = listData.listing.id;

    // Admin flags the listing
    const flagRes = await fetch(`${BASE_URL}/admin/listings/${listingId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'FLAGGED' }),
    });
    assert(flagRes.status === 200, 'Admin can change listing status to FLAGGED');

    // Admin removes the listing
    const removeRes = await fetch(`${BASE_URL}/admin/listings/${listingId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'REMOVED' }),
    });
    assert(removeRes.status === 200, 'Admin can change listing status to REMOVED');
  } catch (e) {
    assert(false, `Listing moderation error: ${e.message}`);
  }

  // 10. Student submits report -> Admin reviews report
  try {
    const reportRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        reportedUserId: testUserId,
        reason: 'Inappropriate conduct in team messages',
      }),
    });
    const reportData = await reportRes.json();
    const reportId = reportData.report.id;
    assert(reportRes.status === 201, 'Student can submit report via POST /api/reports');

    // Admin resolves report
    const resolveRes = await fetch(`${BASE_URL}/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'resolved', note: 'Investigated and resolved by staff' }),
    });
    const resolveData = await resolveRes.json();
    assert(
      resolveRes.status === 200 && resolveData.report?.status === 'resolved',
      'Admin resolves report with note and records in audit_log'
    );
  } catch (e) {
    assert(false, `Report workflow error: ${e.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Admin Verification Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);
}

runAdminTests();
