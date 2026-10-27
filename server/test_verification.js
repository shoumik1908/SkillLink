// Automated test runner for Phase 1 verification requirements
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Phase 1 Backend Verification Suite...\n');
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

  // 1. Register with wrong email domain (e.g., @gmail.com)
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Domain User',
        email: 'invalid@gmail.com',
        password: 'Password123!',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.message.includes('requires an email ending in @uni.edu'),
      `Reject invalid email domain (Status: ${res.status}, Message: "${data.message}")`
    );
  } catch (e) {
    assert(false, `Test 1 exception: ${e.message}`);
  }

  // 2. Register with valid domain (@uni.edu)
  const testStudentEmail = `student_${Date.now()}@uni.edu`;
  let studentCookie = '';
  let studentUser = null;

  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Student',
        email: testStudentEmail,
        password: 'ValidPassword123',
      }),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      studentCookie = setCookie.split(';')[0];
    }
    studentUser = data.user;

    assert(
      res.status === 201 &&
        data.user?.role === 'user' &&
        !data.user?.password_hash &&
        setCookie?.includes('HttpOnly'),
      `Register with valid domain succeeds with role='user', no password_hash, and httpOnly cookie`
    );
  } catch (e) {
    assert(false, `Test 2 exception: ${e.message}`);
  }

  // 3. Login with wrong password
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStudentEmail,
        password: 'WrongPassword999',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.message === 'Invalid credentials',
      `Login with wrong password returns generic "Invalid credentials"`
    );
  } catch (e) {
    assert(false, `Test 3 exception: ${e.message}`);
  }

  // 4. Login with unknown email
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@uni.edu',
        password: 'ValidPassword123',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.message === 'Invalid credentials',
      `Login with unknown email returns generic "Invalid credentials"`
    );
  } catch (e) {
    assert(false, `Test 4 exception: ${e.message}`);
  }

  // 5. Login correctly as Admin
  let adminCookie = '';
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@uni.edu',
        password: 'AdminPassword123!',
      }),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      adminCookie = setCookie.split(';')[0];
    }

    assert(
      res.status === 200 &&
        data.user?.role === 'admin' &&
        !data.user?.password_hash &&
        setCookie?.includes('HttpOnly'),
      `Admin login succeeds with role='admin' and httpOnly cookie`
    );
  } catch (e) {
    assert(false, `Test 5 exception: ${e.message}`);
  }

  // 6. GET /api/auth/me with student cookie
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Cookie: studentCookie },
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.user?.email === testStudentEmail && !data.user?.password_hash,
      `GET /api/auth/me restores student session without leaking password_hash`
    );
  } catch (e) {
    assert(false, `Test 6 exception: ${e.message}`);
  }

  // 7. Normal user calling /api/admin/overview directly -> MUST get 403 Forbidden
  try {
    const res = await fetch(`${BASE_URL}/admin/overview`, {
      headers: { Cookie: studentCookie },
    });
    const data = await res.json();
    assert(
      res.status === 403,
      `Normal student calling /api/admin/overview is blocked with 403 Forbidden`
    );
  } catch (e) {
    assert(false, `Test 7 exception: ${e.message}`);
  }

  // 8. Admin user calling /api/admin/overview -> MUST get 200 OK
  try {
    const res = await fetch(`${BASE_URL}/admin/overview`, {
      headers: { Cookie: adminCookie },
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.stats && data.adminUser?.role === 'admin',
      `Admin user calling /api/admin/overview receives 200 OK with admin stats`
    );
  } catch (e) {
    assert(false, `Test 8 exception: ${e.message}`);
  }

  // 9. Ownership check: User A creates listing; User B tries to edit -> MUST get 403
  try {
    // Create User B (Bob)
    const bobEmail = `bob_${Date.now()}@uni.edu`;
    const bobRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Student',
        email: bobEmail,
        password: 'Password123!',
      }),
    });
    const bobCookie = bobRes.headers.get('set-cookie')?.split(';')[0];

    // Alice creates a listing
    const listingRes = await fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        title: 'Alice Project',
        description: 'Building something cool',
        type: 'Project',
        intendedTeamSize: 3,
        requiredSkills: ['React', 'PostgreSQL'],
      }),
    });
    const listingData = await listingRes.json();
    const listingId = listingData.listing.id;

    // Bob tries to edit Alice's listing
    const unauthorizedEditRes = await fetch(`${BASE_URL}/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: bobCookie },
      body: JSON.stringify({ title: 'Hacked by Bob' }),
    });

    assert(
      unauthorizedEditRes.status === 403,
      `Unauthorized user editing another user's listing gets 403 Forbidden`
    );

    // Alice edits her own listing -> 200
    const authorizedEditRes = await fetch(`${BASE_URL}/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ title: 'Alice Project Updated' }),
    });
    const updatedData = await authorizedEditRes.json();

    assert(
      authorizedEditRes.status === 200 && updatedData.listing.title === 'Alice Project Updated',
      `Listing owner editing own listing gets 200 OK`
    );

    // Admin edits Alice's listing (Admin override) -> 200
    const adminEditRes = await fetch(`${BASE_URL}/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ title: 'Admin Moderated Title' }),
    });
    const adminEditData = await adminEditRes.json();

    assert(
      adminEditRes.status === 200 && adminEditData.listing.title === 'Admin Moderated Title',
      `Admin can override and edit any listing (200 OK)`
    );
  } catch (e) {
    assert(false, `Test 9 exception: ${e.message}`);
  }

  // 10. Logout test: POST /api/auth/logout clears cookie
  try {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: studentCookie },
    });
    const setCookie = res.headers.get('set-cookie');
    assert(
      res.status === 200 && (setCookie?.includes('token=;') || setCookie?.includes('Expires=Thu, 01 Jan 1970')),
      `POST /api/auth/logout successfully clears httpOnly session cookie`
    );
  } catch (e) {
    assert(false, `Test 10 exception: ${e.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);
}

runTests();
