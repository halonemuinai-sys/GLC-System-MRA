require('dotenv').config();
const prisma = require('../api/db');

async function testMarketingAPIs() {
  const loginUrl = 'http://localhost:5005/api/auth/login';
  const loginPayload = {
    email: 'admin@mraretail.co.id',
    password: 'MraGlc2026!'
  };

  console.log('1. Logging in...');
  let token;
  try {
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload)
    });

    if (!loginRes.ok) {
      console.error('Login failed:', await loginRes.text());
      return;
    }

    const data = await loginRes.json();
    token = data.token;
    console.log('Login Succeeded. Token acquired.\n');
  } catch (err) {
    console.error('Login request failed:', err);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Ensure the admin user exists in helpdesk_user table so resolveEmployee works
  console.log('2. Preparing admin user in helpdesk User table via raw SQL...');
  try {
    const adminEmail = 'admin@mraretail.co.id';
    
    // Check if company exists in helpdesk
    let company = await prisma.helpdesk_company.findFirst();
    if (!company) {
      company = await prisma.helpdesk_company.create({
        data: {
          id: 1,
          name: 'Holding MRA Retail',
          location: 'HQ'
        }
      });
    }

    const companyId = company.id;
    await prisma.$executeRawUnsafe(`
      INSERT INTO helpdesk."User" (id, email, password, name, department, "jobPosition", role, "companyId", "monthlyBudget")
      VALUES ('NIK-ADMIN-999', $1, 'dummy_pass', 'Administrator GA', 'IT', 'Admin', 'ADMIN'::helpdesk."Role", $2, 0)
      ON CONFLICT (email) DO UPDATE 
      SET name = EXCLUDED.name, department = EXCLUDED.department, "jobPosition" = EXCLUDED."jobPosition", role = EXCLUDED.role;
    `, adminEmail, companyId);
    
    console.log('Helpdesk User for Admin verified.\n');
  } catch (err) {
    console.error('Failed to prepare helpdesk user:', err);
    return;
  }

  console.log('3. Testing GET /api/marketing/metadata...');
  let metadata;
  try {
    const res = await fetch('http://localhost:5005/api/marketing/metadata', { headers });
    if (!res.ok) throw new Error(await res.text());
    metadata = await res.json();
    console.log('Metadata Fetched:');
    console.log('- Brands count:', metadata.brands.length);
    console.log('- LOBs count:', metadata.lobs.length);
    console.log('- Branches count:', metadata.branches.length);
    console.log('- CoAs count:', metadata.coas.length);
    console.log('- Companies count:', metadata.companies.length);
    console.log('');
  } catch (err) {
    console.error('Metadata API failed:', err);
    return;
  }

  if (metadata.companies.length === 0 || metadata.coas.length === 0) {
    console.error('Error: Metadata has no companies or CoAs to link. Seed first!');
    return;
  }

  console.log('4. Testing POST /api/marketing/plans...');
  let newPlan;
  try {
    const planPayload = {
      title: 'Campaign Uji Coba API Marketing ' + new Date().toLocaleTimeString(),
      description: 'Ini adalah deskripsi uji coba integrasi API',
      company_id: metadata.companies[0].id,
      fiscal_year: 2026,
      start_date: '2026-06-01',
      end_date: '2026-07-31',
      items: [
        {
          coa_id: metadata.coas[0].id,
          brand_id: metadata.brands[0]?.id || null,
          lob_id: metadata.lobs[0]?.id || null,
          branch_id: metadata.branches[0]?.id || null,
          period_month: 6,
          budget_amount: 15000000,
          description: 'Sewa space iklan baliho'
        },
        {
          coa_id: metadata.coas[0].id,
          brand_id: metadata.brands[0]?.id || null,
          lob_id: metadata.lobs[0]?.id || null,
          branch_id: metadata.branches[0]?.id || null,
          period_month: 7,
          budget_amount: 25000000,
          description: 'Iklan Instagram Ads'
        }
      ]
    };

    const res = await fetch('http://localhost:5005/api/marketing/plans', {
      method: 'POST',
      headers,
      body: JSON.stringify(planPayload)
    });

    if (!res.ok) throw new Error(await res.text());
    newPlan = await res.json();
    console.log('Marketing Plan Created:', newPlan.id, 'Title:', newPlan.title, 'Budget:', newPlan.total_budget, '\n');
  } catch (err) {
    console.error('Plan Creation API failed:', err);
    return;
  }

  console.log('5. Testing GET /api/marketing/plans...');
  try {
    const res = await fetch('http://localhost:5005/api/marketing/plans', { headers });
    if (!res.ok) throw new Error(await res.text());
    const plansList = await res.json();
    console.log('Plans list count:', plansList.length);
    console.log('First plan title:', plansList[0]?.title, '\n');
  } catch (err) {
    console.error('Get plans list failed:', err);
  }

  console.log('6. Testing GET /api/marketing/plans/:id (detail)...');
  let planDetail;
  try {
    const res = await fetch(`http://localhost:5005/api/marketing/plans/${newPlan.id}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    planDetail = await res.json();
    console.log('Plan detail fetched successfully.');
    console.log('- Items count:', planDetail.items.length);
    console.log('- Approval History count:', planDetail.approval_history.length);
    console.log('');
  } catch (err) {
    console.error('Get plan detail failed:', err);
    return;
  }

  console.log('7. Testing workflow approvals on the plan...');
  try {
    // Current user is admin, check if we have pending tasks in tasks endpoint
    const taskRes = await fetch('http://localhost:5005/api/marketing/tasks', { headers });
    if (!taskRes.ok) throw new Error(await taskRes.text());
    const tasks = await taskRes.json();
    console.log('Pending tasks count:', tasks.length);
    
    // Find task for our newly created plan
    const activeTask = tasks.find(t => t.marketing_plan_id === newPlan.id);
    if (!activeTask) {
      console.log('No pending task found for plan:', newPlan.id, '. Approval matrix rules may not match the admin role.');
    } else {
      console.log('Found pending task for plan. Approving task ID:', activeTask.id);
      
      const approveRes = await fetch(`http://localhost:5005/api/marketing/approvals/${activeTask.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'APPROVE',
          comment: 'Approved via API integration tests',
          signature: 'data:image/png;base64,iVBORw0KGgoAAAANS...'
        })
      });

      if (!approveRes.ok) throw new Error(await approveRes.text());
      const result = await approveRes.json();
      console.log('Approval Result:', result.message);
    }
    console.log('');
  } catch (err) {
    console.error('Approval workflow test failed:', err);
  }

  console.log('Marketing API integration tests completed.');
}

testMarketingAPIs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
