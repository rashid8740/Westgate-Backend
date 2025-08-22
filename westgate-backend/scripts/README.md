# Database Migration Scripts

## Admin Password Migration

If you need to reset the admin password, run:

```bash
node scripts/migrate-admin-password.js
```

This will:
- Reset the admin password to `admin123`
- Unlock the account if it was locked
- Reset login attempts
- Verify the new password works

## Default Admin Credentials

After running the migration:
- **Username:** `admin`
- **Password:** `admin123`

## Running Scripts

Make sure you have:
1. MongoDB connection string in `.env` file
2. Required dependencies installed (`npm install`)
3. Access to the database

Then run any script with:
```bash
node scripts/script-name.js
```
