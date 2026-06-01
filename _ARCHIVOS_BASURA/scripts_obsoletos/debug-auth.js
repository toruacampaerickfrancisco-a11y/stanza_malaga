import { User, UserPermission, Permission } from './src/models/index.js';

async function debugAuth() {
  try {
    const username = 'erick.torua';
    const module = 'users';
    const action = 'delete';

    console.log(`🔍 Debugging auth for user: ${username}, permission: ${module}:${action}`);

    const user = await User.findOne({ where: { usuario: username } });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log(`✅ User found: ${user.id} (${user.rol})`);

    // Simulate middleware logic
    const userWithPermissions = await User.findByPk(user.id, {
      include: [
        {
          model: UserPermission,
          as: 'permisos',
          include: [
            {
              model: Permission,
              as: 'permission'
            }
          ]
        }
      ]
    });

    if (!userWithPermissions) {
      console.log('❌ User with permissions not found (should not happen)');
      return;
    }

    const allPerms = userWithPermissions.permisos || [];
    console.log(`📊 Total permissions found: ${allPerms.length}`);

    // Check raw values
    allPerms.forEach((p, i) => {
      if (p.permission && p.permission.module === module && p.permission.action === action) {
        console.log(`\n🎯 Target Permission Found (Index ${i}):`);
        console.log(`   - ID: ${p.id}`);
        console.log(`   - is_active (DB): ${p.is_active}`);
        console.log(`   - is_active (Type): ${typeof p.is_active}`);
        console.log(`   - expires_at: ${p.expires_at}`);
        console.log(`   - Permission Module: ${p.permission.module}`);
        console.log(`   - Permission Action: ${p.permission.action}`);
        
        // Test filter logic
        const isActive = p.is_active;
        const notExpired = !p.expires_at || new Date(p.expires_at) > new Date();
        console.log(`   - Logic Check: isActive=${isActive}, notExpired=${notExpired} => Result=${isActive && notExpired}`);
      }
    });

    const validPerms = allPerms.filter(p => p.is_active && (!p.expires_at || new Date(p.expires_at) > new Date()));
    console.log(`\n✅ Valid (Active & Not Expired) Permissions: ${validPerms.length}`);

    const hasPermission = validPerms.some(up => up.permission && up.permission.module === module && up.permission.action === action);
    console.log(`\n🏁 Final Result: hasPermission = ${hasPermission}`);

    if (hasPermission) {
      console.log('🎉 SUCCESS: User HAS permission.');
    } else {
      console.log('⛔ FAILURE: User does NOT have permission.');
    }

  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    process.exit();
  }
}

debugAuth();
