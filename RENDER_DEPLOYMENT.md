# Render.com Deployment Guide

## Overview
This guide will help you deploy your ATM Service Operations Portal to Render.com with PostgreSQL database.

## Prerequisites
- GitHub repository with your code
- Render.com account
- Basic understanding of environment variables

## Step 1: Create PostgreSQL Database on Render

1. Log into [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure database settings:
   - **Name**: `atm-service-db` (or your preferred name)
   - **Database**: Leave blank (auto-generated)
   - **User**: Leave blank (auto-generated)
   - **Region**: Choose a region (remember this for later)
   - **PostgreSQL Version**: Use default
   - **Plan**: Select **"Free"** for development

4. After creation, copy the **Internal Database URL** (you'll need this later)
   - Format: `postgresql://username:password@hostname:port/database`

## Step 2: Deploy Web Service

1. In Render Dashboard: **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure deployment settings:

### Basic Settings
- **Name**: `atm-service-portal`
- **Region**: **Must match your database region**
- **Branch**: `main` (or your default branch)
- **Runtime**: Node

### Build Settings
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### Environment Variables
Add these environment variables in the Render dashboard:

```
NODE_ENV=production
DATABASE_URL=[YOUR_INTERNAL_DATABASE_URL]
POSTGRES_URL=[YOUR_INTERNAL_DATABASE_URL]
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SESSION_SECRET=your_secure_session_secret_here
```

**Important**: Replace placeholders with your actual values.

## Step 3: Application Configuration

Your application is already configured for Render deployment with:

✅ **Port Configuration**: Uses `process.env.PORT` (Render provides this)
✅ **Host Binding**: Binds to `0.0.0.0` (required for cloud deployment)
✅ **Database Connection**: Supports both `DATABASE_URL` and `POSTGRES_URL`
✅ **SSL Configuration**: Enabled for production PostgreSQL connections
✅ **Build Process**: Includes frontend build and database push

## Step 4: Database Setup

The application will automatically:
- Run database migrations during build process
- Create necessary tables
- Set up proper schema

Your current build command includes `npm run db:push` which will set up the database schema.

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build your application
   - Run database setup
   - Start your server

## Step 6: Verify Deployment

After deployment completes:

1. **Check Logs**: Monitor deployment logs for any errors
2. **Test Database**: Visit `/api/health` to verify database connectivity
3. **Test Application**: Try logging in and creating submissions

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Set to `production` | Yes |
| `DATABASE_URL` | PostgreSQL connection string from Render | Yes |
| `POSTGRES_URL` | Alternative PostgreSQL URL (same as DATABASE_URL) | Optional |
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `SESSION_SECRET` | Secure random string for session encryption | Yes |

## Render-Specific Features

### Free Tier Limitations
- **Spin down**: Services sleep after 15 minutes of inactivity
- **Cold starts**: First request after sleeping may be slow
- **Database**: PostgreSQL expires after 90 days on free tier

### Production Considerations
- **Paid Plans**: No sleep, faster performance
- **Custom Domains**: Available on paid plans
- **SSL**: Automatically provided for all deployments
- **Scaling**: Automatic scaling on higher tiers

## Troubleshooting

### Common Issues

**Build Failures**:
- Check that Node.js version is compatible (application uses Node 20.x)
- Verify all dependencies are in `dependencies`, not `devDependencies`

**Database Connection Issues**:
- Ensure web service and database are in the same region
- Use Internal Database URL, not External URL
- Verify SSL is enabled in database configuration

**Application Errors**:
- Check environment variables are set correctly
- Monitor logs in Render dashboard
- Verify Supabase credentials are correct

### Health Check
Your application includes a health endpoint at `/api/health` that verifies:
- Server is running
- Database connection is working
- Environment configuration is correct

## Migration from Railway

The following Railway-specific files have been removed:
- `railway.json`
- `docker-compose.yml`
- `Dockerfile`
- `.dockerignore`
- `railway-postgres.sql`
- `healthcheck.js`

Your application now uses Render's native build and deployment process instead.

## Support

For deployment issues:
- Check Render documentation: https://render.com/docs
- Monitor deployment logs in Render dashboard
- Verify environment variables and database connections