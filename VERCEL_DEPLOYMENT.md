# Vercel Deployment Guide

This guide will help you deploy your field agent management system to Vercel while addressing the IPv4/IPv6 compatibility issues between Vercel and Supabase.

## Important: IPv4/IPv6 Compatibility Issue

**⚠️ Critical Issue**: Vercel only supports IPv4 connections, while Supabase databases use IPv6 addresses by default. This causes connection failures if not properly configured.

### The Solution: Use Supavisor Connection Pooler

Supabase's connection pooler (Supavisor) provides IPv4-compatible URLs that work with Vercel. Your database configuration has been updated to use these automatically.

## Pre-Deployment Setup

### 1. Set Up Your Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Go to Project Settings > Database
4. Copy your connection details

### 2. Get IPv4-Compatible Connection String

**Important**: Use the **pooler connection string** (IPv4 compatible), not the direct connection string (IPv6 only).

Your connection string should look like:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**NOT like this** (this won't work on Vercel):
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

### 3. Set Up Database Tables

Run this command locally to push your schema to Supabase:
```bash
npm run db:push
```

Or manually create the tables by running the initialization endpoint after deployment.

## Vercel Deployment Steps

### 1. Deploy to Vercel

You can deploy using any of these methods:

**Option A: CLI Deployment**
```bash
npm i -g vercel
vercel
```

**Option B: GitHub Integration**
1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Vercel will auto-deploy on every push

**Option C: Import Project**
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Configure environment variables (see below)

### 2. Configure Environment Variables in Vercel

Go to your Vercel project settings > Environment Variables and add:

#### Required Variables:
```
POSTGRES_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NODE_ENV=production
SESSION_SECRET=your_secure_random_string
```

#### Optional (if using OAuth):
```
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback
```

### 3. Update Your Domain

After deployment, update any hardcoded URLs in your application to use your Vercel domain.

## Vercel Configuration Explained

The `vercel.json` file has been configured for your full-stack application:

- **Builds**: Compiles your Express server and React frontend
- **Routes**: Routes API calls to your Express server and serves the React app for all other requests
- **Functions**: Configures serverless function settings
- **Build Process**: Builds both frontend and backend automatically

## Database Connection Details

Your database connection has been optimized for Vercel's serverless environment:

- **Connection Pooling**: Limited to 1 connection per function (serverless best practice)
- **IPv4 Compatibility**: Uses Supavisor pooler URLs
- **SSL**: Required for secure connections
- **Prepared Statements**: Disabled for pooler compatibility

## Troubleshooting

### Common Issues:

1. **"getaddrinfo ENOTFOUND" errors**
   - This means you're using IPv6 connection strings
   - Switch to the pooler connection string format

2. **Database connection timeouts**
   - Ensure you're using the correct region in your pooler URL
   - Check that your Supabase project is active

3. **Authentication issues**
   - Update OAuth redirect URLs to point to your Vercel domain
   - Check that all required environment variables are set

4. **Build failures**
   - Ensure all TypeScript types are correct
   - Check that all dependencies are properly installed

### Testing IPv4 Compatibility:

You can test if your connection string is IPv4 compatible by running:
```bash
nslookup aws-0-[REGION].pooler.supabase.com
```

This should return IPv4 addresses (not IPv6).

## Post-Deployment Checklist

- [ ] Application loads correctly
- [ ] Database connection works
- [ ] Authentication flows work
- [ ] API endpoints respond properly
- [ ] Static files serve correctly
- [ ] Environment variables are set
- [ ] OAuth redirects point to correct domain

## Performance Optimization

Your application is now optimized for Vercel with:
- Serverless function configuration
- Optimized database connections
- Static file serving from CDN
- Automatic scaling
- Global edge network

## Support

If you encounter issues:
1. Check Vercel function logs for errors
2. Verify environment variables are set correctly
3. Ensure database connection string uses IPv4 pooler format
4. Check Supabase project status and connectivity

Your application should now be successfully deployed on Vercel with full IPv4/IPv6 compatibility resolved!