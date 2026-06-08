# Installation & Deployment Guide

This guide describes the installation, environment configuration, database migration, and production deployment pipeline for the **AI-Driven Healthcare Decision Support System**.

---

## 1. Prerequisites

Before installing the system, ensure your environment meets the following software requirements:
- **Node.js**: Version 18.0.0 or higher.
- **npm** (Node Package Manager): Version 8.0.0 or higher.
- **MySQL Server (Optional)**: Version 8.0 or higher (for full Data Warehousing operations; if not available, the system falls back to file-based JSON persistence).

---

## 2. Local Environment Setup

### 2.1 Clone/Extract Codebase
Navigate to your desired workspace and clone the repository or extract the project archives:
```bash
cd C:\projects
# Extract or copy files to "Health care" directory
cd "Health care"
```

### 2.2 Configure Environment Variables
Create a file named `.env` in the root of the project. This file stores database secrets and network configurations:

```env
# MySQL Connection Configuration (Leave blank to use local JSON database fallback)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=dwh_admin
MYSQL_PASSWORD=your_secure_password
MYSQL_DATABASE=healthcare_dwh
```

### 2.3 Initialize MySQL Database
If using MySQL, connect to your database instance and run the schema setup script located under `database/schema.sql`:
```bash
# Connect to MySQL and execute script
mysql -u dwh_admin -p < database/schema.sql
```
This script will:
1. Create the `healthcare_dwh` database.
2. Initialize the star schema dimensions and fact tables.
3. Apply index optimizations.
4. Pre-seed default doctor records, disease metadata, and sample patients.

### 2.4 Install Packages & Start Development Server
From the root directory, run:
```bash
# Install dependencies
npm install

# Start Next.js hot-reloaded development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 2.5 Administrator Login
Access the system using the pre-seeded credentials:
- **Email**: `admin@healthcare.com`
- **Password**: `admin123`

---

## 3. Production Deployment Guide

To deploy the application in a production environment (such as a Linux VM or AWS EC2 instance), use the following steps.

### 3.1 Production Build Compilation
Compile the Next.js application into a production bundle:
```bash
npm run build
```
This runs Next.js build optimizations, validates TypeScript types, runs ESLint audits, and outputs files into the `.next/` directory.

### 3.2 Process Management with PM2
Use **PM2** (Process Manager 2) to ensure the Node application runs continuously as a background service and automatically restarts on system reboots.

```bash
# Install PM2 globally
npm install -m -g pm2

# Launch the Next.js server via PM2
pm2 start npm --name "healthcare-dss" -- run start

# Save process list for startup recovery
pm2 startup
pm2 save
```

### 3.3 Nginx Reverse Proxy Configuration
Configure **Nginx** as a reverse proxy in front of the Next.js server to handle incoming port 80/443 traffic, manage SSL certifications, and cache static assets.

Create a site configuration file (e.g. `/etc/nginx/sites-available/healthcare-dss`):

```nginx
server {
    listen 80;
    server_name healthcare-dss.local;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:
```bash
ln -s /etc/nginx/sites-available/healthcare-dss /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```
---

## 4. Troubleshooting & Log Audits

### 4.1 JSON Database Fallback
If MySQL goes offline or is not configured, the system logs a console warning:
`MySQL getPatients query failed, using JSON fallback`
Ensure the file permissions in the `data/` directory allow the Next.js server to read and write to `data/db.json`.

### 4.2 PM2 Logs
To inspect application runtime logs and debug API errors:
```bash
pm2 logs healthcare-dss
```
