# User Module Access Control System - Implementation Guide

## Overview
This implementation adds a role-based access control system to Countifly, allowing administrators to control which modules each user can access.

## Features Implemented

### 1. Database Schema Updates
- Added `UsuarioTipo` enum (ADMIN, USUARIO)
- Added fields to `Usuario` model:
  - `tipo`: User type (ADMIN or USUARIO)
  - `modulo_importacao`: Access to Count Import module
  - `modulo_livre`: Access to Free Count module
  - `modulo_sala`: Access to Team Management module
  - `ativo`: User active status

### 2. Backend API Endpoints

#### User Endpoints
- **GET /api/user/me**: Returns user info including type and module permissions
  - Returns: user data + `tipo` + `modules { importacao, livre, sala }`
  - Checks if user is active

#### Admin Endpoints (Admin only)
- **GET /api/admin/users**: List all users (except admins)
- **PATCH /api/admin/users/[userId]/modules**: Update user module permissions
- **PATCH /api/admin/users/[userId]/status**: Activate/deactivate user

### 3. Middleware Protection
- Validates JWT token and fetches user data
- Blocks inactive users (redirects to /login?error=account_disabled)
- Blocks non-admin users from /admin/* routes
- Blocks module routes based on permissions:
  - /count-import → requires `modulo_importacao`
  - /audit → requires `modulo_livre`
  - /team → requires `modulo_sala`
- Admin users bypass all restrictions

### 4. Frontend Components

#### Hook: `useUserModules`
- Fetches user permissions from /api/user/me
- Provides: `isAdmin`, `hasModule(name)`, `loading`, `error`, `userData`

#### Updated Navigation
- Shows/hides menu items based on module permissions
- Adds "Administração" section for admins with "Gerenciar Usuários" link
- Uses Shield icon for admin section

#### Admin Panel: `/admin/users`
- Lists all non-admin users with cards
- Each card shows:
  - User name, email, registration date
  - Active/Inactive badge
  - Activate/Deactivate button
  - 3 toggle switches for modules (Importação, Livre, Sala)
- Real-time updates without page reload
- Loading states and error handling

## Database Migration

### Applying the Migration

**Option 1: Using the SQL file**
```sql
-- Run the migration file
\i prisma/migrations/add_user_access_control.sql
```

**Option 2: Manual SQL**
```sql
-- Create enum type
CREATE TYPE "UsuarioTipo" AS ENUM ('ADMIN', 'USUARIO');

-- Add new columns
ALTER TABLE usuarios 
ADD COLUMN tipo "UsuarioTipo" DEFAULT 'USUARIO',
ADD COLUMN modulo_importacao BOOLEAN DEFAULT true,
ADD COLUMN modulo_livre BOOLEAN DEFAULT false,
ADD COLUMN modulo_sala BOOLEAN DEFAULT false,
ADD COLUMN ativo BOOLEAN DEFAULT true;

-- Make first user an admin (adjust WHERE clause as needed)
UPDATE usuarios 
SET tipo = 'ADMIN',
    modulo_importacao = true,
    modulo_livre = true,
    modulo_sala = true
WHERE id = 1;
```

**Option 3: Using Prisma (if you have prisma migrate)**
```bash
# This won't work directly as we created a manual migration
# But you can push the schema to sync it
npx prisma db push
```

### Verifying the Migration

```sql
-- Check if new columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND column_name IN ('tipo', 'modulo_importacao', 'modulo_livre', 'modulo_sala', 'ativo');

-- Check admin users
SELECT id, email, tipo, modulo_importacao, modulo_livre, modulo_sala, ativo 
FROM usuarios 
WHERE tipo = 'ADMIN';
```

## Testing the Implementation

### 1. Test Admin Access
1. Login with admin account (user ID 1 or the one you upgraded)
2. Open the sidebar menu (user icon in header)
3. Verify "Administração" section appears with "Gerenciar Usuários" option
4. Navigate to `/admin/users`
5. Verify you can see the user list

### 2. Test Module Toggles
1. As admin, go to `/admin/users`
2. Find a test user
3. Toggle each module on/off
4. Verify the switch updates without errors
5. Login as that user and verify menu items appear/disappear

### 3. Test User Deactivation
1. As admin, deactivate a test user
2. Try to login as that user
3. Verify redirect to `/login?error=account_disabled`
4. Reactivate the user and verify they can login again

### 4. Test Route Protection
1. Login as a regular user
2. Try to access `/admin/users` directly via URL
3. Verify redirect to `/`
4. Disable a module for the user
5. Try to access the module route directly
6. Verify redirect to `/`

### 5. Test Navigation Visibility
1. Login as a user with only `modulo_importacao` enabled
2. Open sidebar menu
3. Verify only "Contagem por Importação" shows in "Modos de contagem"
4. Enable other modules and verify they appear

## Default Permissions

- **New users**: 
  - Type: USUARIO
  - modulo_importacao: true
  - modulo_livre: false
  - modulo_sala: false
  - ativo: true

- **First user (ID 1)**:
  - Type: ADMIN (after migration)
  - All modules: true
  - ativo: true

## Security Considerations

1. **Multi-layer protection**:
   - Middleware blocks routes
   - API endpoints validate admin status
   - UI hides unavailable options

2. **Admin protection**:
   - Admin users cannot be listed in the admin panel
   - Admin users cannot be modified by other admins (for now)

3. **Performance**:
   - Middleware queries database on each request
   - Consider implementing Redis cache for production
   - User permissions are cached client-side by the hook

4. **JWT Security**:
   - Token validation happens in middleware
   - Expired/invalid tokens redirect to login
   - Active status checked on every request

## Future Enhancements

1. **Caching**: Implement Redis cache for user permissions in middleware
2. **Audit Log**: Track permission changes and user status changes
3. **Bulk Operations**: Allow admin to update multiple users at once
4. **User Search**: Add search/filter functionality to admin panel
5. **Module Pricing**: Integrate with billing system for paid modules
6. **Admin Management**: Allow super-admin to manage other admins
7. **Permission History**: Show when modules were enabled/disabled

## Troubleshooting

### User can't see any modules
- Check database: `SELECT * FROM usuarios WHERE id = ?`
- Verify at least one module is enabled
- Check middleware isn't blocking the route

### Admin panel doesn't show
- Verify user tipo is 'ADMIN'
- Check browser console for errors
- Verify API endpoint responds: `curl /api/admin/users`

### Module toggles don't work
- Check browser console for network errors
- Verify API endpoints are accessible
- Check user has permission to update (is admin)

### Middleware blocks all routes
- Check JWT_SECRET environment variable is set
- Verify authToken cookie exists
- Check middleware logs for errors

## Files Modified

- `prisma/schema.prisma` - Database schema
- `app/api/user/me/route.ts` - User info endpoint
- `middleware.ts` - Route protection
- `components/shared/navigation.tsx` - Navigation updates
- `.gitignore` - Allow admin directories

## Files Created

- `prisma/migrations/add_user_access_control.sql` - Migration file
- `hooks/useUserModules.ts` - User permissions hook
- `app/api/admin/users/route.ts` - List users
- `app/api/admin/users/[userId]/modules/route.ts` - Update modules
- `app/api/admin/users/[userId]/status/route.ts` - Update status
- `app/(main)/admin/users/page.tsx` - Admin panel

## Support

For issues or questions:
1. Check this README
2. Review the code comments
3. Check browser console for errors
4. Verify database migration was applied correctly
