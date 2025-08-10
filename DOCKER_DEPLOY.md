# 🐳 Docker Deployment Guide

This guide walks you through deploying AgentOps on Digital Ocean using Docker.

## 📋 Quick Deploy Checklist

### Prerequisites

- [ ] Digital Ocean Droplet (Ubuntu 20.04+, minimum 2GB RAM)
- [ ] Google Gemini API key
- [ ] Domain name (optional, for production)

### Deployment Steps

1. **Upload Project**

   ```bash
   # On your local machine
   scp -r mit-ai root@your-droplet-ip:/root/
   ```

2. **SSH into Droplet**

   ```bash
   ssh root@your-droplet-ip
   cd mit-ai
   ```

3. **Configure Environment**

   ```bash
   cp .env.docker .env
   nano .env  # Add your Google Gemini API key
   ```

4. **Run Deployment Script**

   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

5. **Verify Deployment**
   ```bash
   docker-compose ps
   curl http://your-droplet-ip:5000/health
   curl http://your-droplet-ip:3000/health
   ```

## 🌐 Service Architecture

| Service        | Port | Description                        | Health Check  |
| -------------- | ---- | ---------------------------------- | ------------- |
| **Agents API** | 5000 | Flask server with LangChain agents | `/health`     |
| **Dashboard**  | 3000 | Next.js visualization interface    | `/api/health` |
| **MCP Server** | 8000 | Model Context Protocol server      | -             |
| **PostgreSQL** | 5432 | Database (internal only)           | Docker health |

## 🔧 Configuration Files

### Environment Variables (`.env`)

```bash
# Required - Get from Google AI Studio
GOOGLE_API_KEY=your_actual_api_key_here

# Auto-configured by Docker Compose
DATABASE_URL=postgresql://agentops:agentops_password@postgres:5432/agentops
DASHBOARD_URL=http://dashboard:3000
AGENTS_API_URL=http://agents:5000
```

### Docker Compose Services

- **postgres**: PostgreSQL 15 with persistent data
- **agents**: Python Flask API with LangChain integration
- **dashboard**: Next.js frontend with real-time analytics
- **logger-mcp**: MCP server for standardized logging

## 🚀 Production Deployment

For production, use the production override:

```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Enable automatic restarts
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --restart=unless-stopped
```

## 📊 Monitoring & Logs

### View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f agents
docker-compose logs -f dashboard
docker-compose logs -f postgres
```

### Health Monitoring

```bash
# Check all containers
docker-compose ps

# Check specific health
curl http://your-ip:5000/health  # Agents API
curl http://your-ip:3000/api/health  # Dashboard
```

## 🔒 Security Considerations

### Firewall Setup

```bash
# Allow only necessary ports
ufw allow 22     # SSH
ufw allow 3000   # Dashboard
ufw allow 5000   # Agents API
ufw allow 8000   # MCP Server (optional)
ufw enable
```

### Environment Security

- Keep `.env` file secure and never commit it
- Use strong database passwords in production
- Consider using environment variable injection for secrets

## 🛠️ Troubleshooting

### Common Issues

**Containers not starting:**

```bash
# Check logs
docker-compose logs

# Restart specific service
docker-compose restart [service-name]
```

**Database connection issues:**

```bash
# Check postgres is running
docker-compose exec postgres pg_isready -U agentops

# Reset database
docker-compose down -v
docker-compose up -d
```

**Out of disk space:**

```bash
# Clean up Docker
docker system prune -a

# Remove old logs
docker-compose exec postgres psql -U agentops -d agentops -c "DELETE FROM log_entries WHERE timestamp < NOW() - INTERVAL '30 days';"
```

### Port Conflicts

If ports are already in use, modify `docker-compose.yml`:

```yaml
services:
  agents:
    ports:
      - "5001:5000" # Change external port
  dashboard:
    ports:
      - "3001:3000" # Change external port
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale specific services
docker-compose up -d --scale agents=2
docker-compose up -d --scale logger-mcp=2
```

### Resource Limits

Add to `docker-compose.yml`:

```yaml
services:
  agents:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
```

## 🔄 Updates & Maintenance

### Update Code

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d
```

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U agentops agentops > backup.sql

# Restore
docker-compose exec -T postgres psql -U agentops agentops < backup.sql
```

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify health endpoints are responding
3. Ensure all environment variables are set correctly
4. Check firewall and network settings

For persistent issues, review the main README.md for detailed configuration options.
