import { supabaseAdmin } from '../lib/db/client';

async function seedAuthUsers() {
  console.log('Seeding Supabase Auth users...');

  const usersToCreate = [
    {
      email: 'elansary@elansary-shop.com',
      username: 'elansary',
      password: '123456',
      role: 'owner',
      branch_id: null,
    },
    {
      email: 'main@elansary-shop.com',
      username: 'main',
      password: '123456',
      role: 'operator_main',
      branch_id: 'main-shop',
    },
    {
      email: 'body@elansary-shop.com',
      username: 'body',
      password: '123456',
      role: 'operator_body',
      branch_id: 'body-shop',
    },
  ];

  for (const u of usersToCreate) {
    // 1. Create or get user in Supabase Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = existingUsers?.users?.find((x) => x.email === u.email);

    if (!authUser) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { role: u.role, username: u.username, branch_id: u.branch_id },
      });
      if (createError) {
        console.error(`Error creating user ${u.email}:`, createError);
        continue;
      }
      authUser = newUser.user;
      console.log(`Created Auth user: ${u.email} (${authUser.id})`);
    } else {
      console.log(`Auth user already exists: ${u.email} (${authUser.id})`);
    }

    // 2. Insert or update in public.profiles table
    if (authUser) {
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: authUser.id,
        email: u.email,
        role: u.role,
        branch_id: u.branch_id,
      });
      if (profileError) {
        console.error(`Error updating profile for ${u.email}:`, profileError);
      } else {
        console.log(`Updated profile for ${u.email} -> role: ${u.role}`);
      }
    }
  }

  console.log('Auth user seeding completed!');
}

seedAuthUsers().catch(console.error);
