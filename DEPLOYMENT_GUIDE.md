# MikroTik Bundle Router - Step-by-Step Deployment Guide

**Version**: 1.0 (Optimized for RB951Ui-2HnD)  
**Network**: 192.168.100.0/24  
**Last Updated**: March 2026

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Hardware Setup](#hardware-setup)
3. [Router Access & Connection](#router-access--connection)
4. [Configuration Backup](#configuration-backup)
5. [Script Deployment](#script-deployment)
6. [Phase-by-Phase Verification](#phase-by-phase-verification)
7. [Testing & Validation](#testing--validation)
8. [Backend Integration](#backend-integration)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before starting, ensure you have:

- [ ] **MikroTik RB951Ui-2HnD** router (hardware)
- [ ] **Router Power Cable** connected and powered on
- [ ] **Ethernet Cable** to connect PC to one of the LAN ports (ether3, ether4, or ether5)
- [ ] **WAN Connection Ready** (Starlink modem, fiber box, or 4G dongle for ether2)
- [ ] **Admin Access** to the router (factory reset if password unknown)
- [ ] **Router OS 6.x or 7.x** installed (can verify after access)
- [ ] **MikroTik Script File** (`backend/mikrotik-optimized-setup.rsc`) downloaded
- [ ] **Backend .env Updated** with `MIKROTIK_HOST=192.168.100.1`
- [ ] **30 minutes of uninterrupted time** (script execution safe but don't power off during)

---

## Hardware Setup

### 1. Physical Port Layout (RB951Ui-2HnD)

```
┌─────────────────────────────────────────────┐
│  MikroTik RB951Ui-2HnD                      │
├─────────────────────────────────────────────┤
│  [ether1]  [ether2]  [ether3]  [ether4]     │
│  Optional  PRIMARY   LAN      LAN           │
│  Backup    WAN       Port 1   Port 2        │
│  (4G)      (Starlink)                       │
│                                             │
│  [ether5]  [wlan0]  [Power]   [Reset]       │
│  LAN       WiFi     DC 12V    (3sec hold)  │
│  Port 3                                    │
└─────────────────────────────────────────────┘
```

### 2. Cable Connections

```
PLAN A - Basic Setup (Single WAN)
├─ ether2 ← DHCP Modem (Starlink/Fiber/ISP)
├─ ether3 ← Your PC (temporary, for configuration)
├─ ether4 ← Client Device (after setup)
├─ ether5 ← Client Device (after setup)
└─ wlan0  ← WiFi clients

PLAN B - Dual-WAN Setup (Optional)
├─ ether1 ← 4G/LTE Backup (USB dongle via adapter)
├─ ether2 ← Primary ISP (Starlink/Fiber)
├─ ether3-5 ← LAN Clients
└─ wlan0 ← WiFi clients
```

### 3. Initial Setup

**Step 1: Connect your PC**
1. Plug Ethernet cable into your PC
2. Plug other end into **ether3** (LAN port 1)
3. Do NOT plug into ether2 (WAN) or ether1 (will fail)

**Step 2: Router Power**
1. Plug in router power cable
2. Wait 60 seconds for full boot
3. You should see status LED indicators

**Step 3: Connect WAN Source**
1. Identify your internet source:
   - **Starlink**: Ethernet from Starlink router → ether2
   - **Fiber**: Ethernet from fiber modem → ether2
   - **4G Backup**: USB adapter + 4G dongle → ether1 (optional)
2. Connect WAN source to **ether2**

---

## Router Access & Connection

### Option 1: WebFig (Easiest)

**Step 1: Open Browser**
```
http://192.168.100.1
```

> ⚠️ **If page doesn't load:**
> - Your PC might not have gotten a DHCP address yet
> - Wait 30 seconds, try again
> - Or manually set PC IP: `192.168.100.50` with gateway `192.168.100.1`

**Step 2: Login**
- **Username**: `admin`
- **Password**: (factory default, usually blank - just click login)
- If you set a custom password before, use that

**Step 3: Verify Router OS Version**
- Go to **System → About**
- Note the RouterOS version (6.x or 7.x both work)

### Option 2: WinBox (Windows-Specific)

1. Download **WinBox.exe** from MikroTik.com
2. Run WinBox (no install needed)
3. Click **"..."** button → **Find Neighbors**
4. Should show `192.168.100.1` in list
5. Select → **Connect**
6. Login with admin credentials

### Option 3: SSH (Advanced)

```powershell
# Windows PowerShell
ssh admin@192.168.100.1

# Mac/Linux Terminal
ssh admin@192.168.100.1
```

---

## Configuration Backup

**⚠️ CRITICAL: Always backup before running scripts**

### Via WebFig

1. Go to **System → Backup**
2. Click **Backup** button (right panel)
3. Name it: `pre-bundle-router-backup`
4. Download and save to your PC

### Via Terminal

```
/system backup save name=pre-bundle-backup
```

This creates a `.backup` file you can restore if needed.

---

## Script Deployment

### Step 1: Access Script Editor

**In WebFig:**
1. Go to **System → Scripts**
2. Click **"+ New"** (top left)
3. New script editor opens

### Step 2: Paste Script Content

**In Script Editor:**
1. **Name**: `bundle-router-setup` (or any name)
2. **Source** field: Delete default text
3. Open: `backend/mikrotik-optimized-setup.rsc`
4. **Copy ALL content** (Ctrl+A, Ctrl+C)
5. **Paste into Source field** (Ctrl+V)
6. Click **OK**

### Step 3: Verify Script Uploaded

1. Back to **System → Scripts** list
2. You should see `bundle-router-setup` in list
3. Click on it → **Source** tab shows full script

### Step 4: Run the Script

**In WebFig:**
1. **System → Scripts**
2. Select `bundle-router-setup`
3. Click **Run** button (play icon)

**OR in Terminal:**
```
/system script run bundle-router-setup
```

**⏱️ Expected Duration**: 30-60 seconds

### Step 5: Monitor Execution

**Via WebFig → System → Log:**
```
[INFO] Starting MikroTik Bundle Router Configuration...
[INFO] PHASE 0: Logging setup complete
[INFO] PHASE 1: Bridge setup complete
[INFO] PHASE 2: WAN configuration complete
[INFO] PHASE 3: LAN addressing complete
... more phases ...
[INFO] MikroTik Bundle Router initialization COMPLETE
```

**If you see errors:**
- ❌ "No such command" → RouterOS version mismatch (try 6.x)
- ❌ Script stops halfway → Try running again (idempotent)
- ❌ Interface not found → Check hardware (ether2 active?)

---

## Phase-by-Phase Verification

### Phase 1: Bridge Configuration ✅

**Verify Bridge Created:**
1. **System → Interfaces** (or Terminal: `/interface bridge print`)
2. Should show: **bridge-local** with ports: ether3, ether4, ether5, wlan0
3. ether2 should NOT be in bridge (that's WAN)

**WiFi Check:**
- **Wireless** menu → **wlan0** should show enabled
- SSID: `Bundle-WiFi-BundleRouter-01`
- Frequency: 2.4GHz

### Phase 2: WAN Configuration ✅

**Primary WAN (Starlink/Fiber):**
1. **IP → Addresses** → Should show:
   - `0.0.0.0/0` on ether2 (placeholder, DHCP will override)

2. **IP → DHCP Client**:
   - Interface: `ether2`
   - Disabled: `NO` (enabled)

3. **IP → Routes** → Should show default route with gateway (DHCP assigned)

**Test WAN:**
```
From your PC (connected to ether3):
ping 8.8.8.8
```
If it works: ✅ WAN is active

### Phase 3: LAN Addressing ✅

**LAN Network Created:**
1. **IP → Addresses**:
   - Should show: `192.168.100.1/24` on bridge-local

2. **IP → DHCP Server**:
   - Should show: `dhcp-local` enabled on bridge-local
   - Pool: `dhcp-pool` with range `192.168.100.10-192.168.100.254`

3. **IP → DHCP Server → Networks**:
   - Address: `192.168.100.0/24`
   - Gateway: `192.168.100.1`
   - DNS: `8.8.8.8, 8.8.4.4`

**Test DHCP:**
From a WiFi-connected client:
```
ipconfig /all (Windows)
ifconfig (Mac/Linux)
```
Should show IP in range `192.168.100.10-254` ✅

### Phase 4: NAT & Firewall ✅

**NAT Rules:**
1. **IP → Firewall → NAT**:
   - Should show masquerade on ether2 (srcnat)
   - DNS forwarding rule (port 53 to local)

**Firewall Rules:**
1. **IP → Firewall → Filter**:
   - INPUT: Accept established, ping from LAN, drop WAN
   - FORWARD: Accept LAN→WAN, drop WAN→LAN
   - DDoS rules for FINACK, FINSYN, SYNRST

### Phase 5: WiFi Security ✅

**WiFi Settings:**
1. **Wireless → wlan0**:
   - Enabled: `YES`
   - SSID: `Bundle-WiFi-BundleRouter-01`
   - Band: `2ghz-only`

2. **Wireless → Security Profiles → default**:
   - Auth: `wpa2-psk`
   - Cipher: `aes-ccm`
   - Key: `BundleWiFi2024` (or custom)

**Test WiFi:**
```
1. Search WiFi networks on phone/laptop
2. Should see: "Bundle-WiFi-BundleRouter-01"
3. Connect with password: "BundleWiFi2024"
4. Should get IP in 192.168.100.x range ✅
```

### Phase 6-7: Hotspot Profiles ✅

**Hotspot Server:**
1. **IP → Hotspot**:
   - Enabled: `YES`
   - Interface: `bridge-local`
   - Address Pool: `dhcp-pool`

2. **IP → Hotspot → Profiles → default**:
   - Address: `192.168.100.1`
   - HTML Directory: `/hotspot` (default)

**Bundle Profiles:**
1. **IP → Hotspot → User Profiles** → Should list:
   - `daily-500mb` (2Mbps, 500MB limit)
   - `daily-1gb` (5Mbps, 1GB limit)
   - `weekly-5gb` (10Mbps, 5GB limit)
   - `monthly-20gb` (20Mbps, 20GB limit)
   - `unlimited` (50Mbps, no limit)

**Test Hotspot Portal:**
```
From WiFi-connected client:
1. Open browser
2. Navigate to any website (or http://192.168.100.1)
3. Should redirect to: http://192.168.100.1:8091
4. See hotspot login page ✅
```

### Phase 8: Firewall Protection ✅

**Verify DDoS Rules:**
1. **IP → Firewall → Filter** → Should include:
   - Anti-FINACK rule
   - Anti-FINSYN rule
   - Anti-SYNRST rule
   - Anti-NoFlags rule

### Phase 9: DNS Configuration ✅

**DNS Settings:**
1. **IP → DNS**:
   - Servers: `8.8.8.8, 8.8.4.4`
   - Allow Remote Requests: `YES`
   - Cache Size: `2048`

2. **IP → DNS → Static DNS**:
   - `bundle.local` → `192.168.100.1`
   - `router.local` → `192.168.100.1`

### Phase 10: Logging ✅

**Check Logs:**
1. **System → Log**:
   - Should show hotspot, script, and API logs
   - Filter by Topics to see specific entries

### Phase 11-13: Automation Scripts ✅

**Data Cap Enforcement:**
1. **System → Scripts**:
   - Should show: `enforce-bundle-caps`
   - Should show: `check-bundle-expiry`

2. **System → Scheduler**:
   - `task-enforce-caps` → Every 2 minutes
   - `task-check-expiry` → Every 30 minutes
   - `task-backup-config` → Every 6 hours

---

## Testing & Validation

### Test 1: Internet Connectivity

```bash
# From your PC (connected to ether3)
ping 8.8.8.8
# Should show responses ✅
```

### Test 2: WiFi Connection

```
1. Connect phone/laptop to "Bundle-WiFi-BundleRouter-01"
2. Enter password: "BundleWiFi2024"
3. Check received IP address
   - Should be in 192.168.100.10-254 range ✅
4. Ping gateway: ping 192.168.100.1
5. Ping internet: ping 8.8.8.8 ✅
```

### Test 3: Hotspot Portal

```
From WiFi client:
1. Open web browser
2. Visit: http://google.com (or any site)
3. Should auto-redirect to: http://192.168.100.1:8091
4. See login page with default hotspot prompt ✅
```

### Test 4: Create Test User (via API)

```bash
# From Node.js backend (after .env update):
POST http://localhost:3000/api/users/create-bundle-user

Body:
{
  "username": "testuser",
  "password": "test123",
  "profile": "daily-1gb"
}

Response should show: 201 Created ✅
```

### Test 5: Hotspot Login

```
From WiFi client:
1. Visit: http://192.168.100.1:8091
2. Username: testuser
3. Password: test123
4. Click Login
5. Should authenticate and grant internet access ✅
```

### Test 6: Data Cap Enforcement

```
1. After user connected for data usage
2. Monitor: System → Log → Filter by "hotspot"
3. Should see: "enforce-bundle-caps" logs running every 2 min
4. If user exceeds limit:
   "User 'testuser' exceeded 1GB limit. Session removed."
5. User automatically disconnected ✅
```

### Test 7: API Port Connectivity

```bash
# From backend server
telnet 192.168.100.1 8728
# Should connect successfully ✅
```

---

## Backend Integration

### Step 1: Update .env File

Edit `backend/.env`:

```env
# ── MikroTik Configuration ──
MIKROTIK_HOST=192.168.100.1
MIKROTIK_USER=admin
MIKROTIK_PASS=<your_router_password>
MIKROTIK_PORT=8728

# ── Multi-Site Setup (Optional) ──
# SITE_1_HOST=192.168.100.1
# SITE_1_NAME=Primary Router
# SITE_1_USER=admin
# SITE_1_PASS=<password>
#
# SITE_2_HOST=192.168.101.1
# SITE_2_NAME=Backup Router
# SITE_2_USER=admin
# SITE_2_PASS=<password>
```

### Step 2: Test Backend Connection

```bash
cd backend
node testMikrotik.js
```

Expected output:
```
✅ Connected to MikroTik at 192.168.100.1:8728
✅ Successfully authenticated
✅ Retrieved hotspot users list
```

If fails:
- ❌ `ECONNREFUSED` → Check IP, port, firewall
- ❌ `Authentication failed` → Wrong password
- ❌ `Timeout` → Router at different IP or API disabled

### Step 3: Test User Creation

```bash
curl -X POST http://localhost:3000/api/users/create-bundle-user \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "password": "secure123",
    "profile": "monthly-20gb",
    "comment": "John Doe | expires:Mar/22/2027"
  }'
```

Expected response:
```json
{
  "status": 201,
  "message": "User created successfully",
  "user": {
    "username": "john.doe",
    "profile": "monthly-20gb",
    "status": "active"
  }
}
```

### Step 4: Monitor Active Sessions

```javascript
// backend/services/mikroticServices.js
const sessions = await mikrotikService.getActiveHotspotSessions();
console.log(sessions);
// Output: [{user: 'john.doe', bytesIn: 1024000, bytesOut: 512000, ...}]
```

### Step 5: Enable API in Router (if not working)

```
In WebFig:
1. System → Services
2. Find "api" in list
3. Enable checkbox if disabled
4. Port should be: 8728 (unencrypted) or 8729 (encrypted)
5. Click OK
```

---

## Troubleshooting

### Problem: Can't connect to 192.168.100.1

**Solution:**
1. PC might not have DHCP IP from router yet
   ```
   Manually set PC IP: 192.168.100.50
   Gateway: 192.168.100.1
   ```

2. Check Ethernet cable is in ether3/4/5 (not ether2)

3. Power cycle router and wait 60 seconds

4. Check if firewall blocks port 80:
   ```
   ping 192.168.100.1
   ```

### Problem: WiFi doesn't connect

**Solution:**
1. Check SSID is broadcasting (Wireless → wlan0 → Name, not hidden)
2. Verify security profile set to WPA2-PSK
3. Check password: `BundleWiFi2024`
4. If still fails, restart WiFi:
   ```
   /interface wireless reset-configuration wlan0
   (Then rerun script Phase 5 section)
   ```

### Problem: No internet on WiFi clients

**Solution:**
1. Check NAT masquerade rule exists:
   ```
   /ip firewall nat print
   # Should show: chain=srcnat, out-interface=ether2, action=masquerade
   ```

2. Check DHCP pool assigned:
   ```
   /ip dhcp-server print
   # Should show: interface=bridge-local
   ```

3. Check default route:
   ```
   /ip route print
   # Should show route to internet via primary WAN
   ```

4. Restart DHCP client:
   ```
   /ip dhcp-client disable numbers=dhcp-client-ether2
   /ip dhcp-client enable numbers=dhcp-client-ether2
   ```

### Problem: Hotspot portal doesn't appear

**Solution:**
1. Check hotspot is enabled:
   ```
   /ip hotspot print
   # Should show: interface=bridge-local, disabled=no
   ```

2. Verify profile exists:
   ```
   /ip hotspot profile print
   # Should list: default with hotspot-address=192.168.100.1
   ```

3. Check DNS is working:
   ```
   From WiFi client: nslookup bundle.local
   Should return: 192.168.100.1
   ```

4. If still not redirecting, login page may need browser cache clear:
   ```
   Ctrl+Shift+Delete (clear cache), then retry
   ```

### Problem: Backend can't connect to router API

**Solution:**
1. **Verify API is enabled:**
   ```
   /ip service print
   # Find "api", should show "disabled=no"
   ```

2. **If API not enabled in router:**
   ```
   /ip service enable api
   ```

3. **Check firewall rule allows API port:**
   ```
   /ip firewall filter print
   # Should NOT have rule dropping port 8728 from your backend PC
   ```

4. **Test connection from backend server:**
   ```bash
   telnet 192.168.100.1 8728
   # Should connect (not timeout)
   ```

5. **Check routerOS credentials:**
   ```
   /user print
   # Verify admin account exists and is enabled
   ```

### Problem: Data caps not enforcing

**Solution:**
1. Check enforcement script is running:
   ```
   /system script print
   # Should show: enforce-bundle-caps
   ```

2. Check scheduler is active:
   ```
   /system scheduler print
   # Should show: task-enforce-caps, disabled=no
   ```

3. Check script execution manually:
   ```
   /system script run enforce-bundle-caps
   # Should complete in <5 seconds
   ```

4. Check user has correct profile:
   ```
   /ip hotspot user print where username=testuser
   # Verify profile field shows one of the 5 profiles
   ```

5. Manually trigger cap check:
   ```
   /system script run enforce-bundle-caps
   ```

### Problem: Script execution failed

**Solution:**
1. **Check for errors in log:**
   ```
   /log print where topics=script
   ```

2. **Retry execution** (script is idempotent, safe to rerun):
   ```
   /system script run bundle-router-setup
   ```

3. **If still fails, check RouterOS version:**
   ```
   /system package print
   # Need version 6.x or 7.x
   ```

4. **Last resort: Restore backup and try again**
   ```
   /system backup restore <backup-filename>
   (Wait for reboot, then rerun script)
   ```

---

## Quick Reference

### Important IPs & Ports

| Function | URL | Port |
|----------|-----|------|
| **WebFig Management** | http://192.168.100.1 | 80 |
| **Hotspot Portal** | http://192.168.100.1:8091 | 8091 |
| **API Access** | 192.168.100.1:8728 | 8728 |
| **SSH Terminal** | ssh admin@192.168.100.1 | 22 |
| **DHCP Pool** | 192.168.100.10-254 | (DHCP) |

### Critical Script Locations

```
System → Scripts:
  ├─ bundle-router-setup (main config)
  ├─ enforce-bundle-caps (data cap monitor)
  └─ check-bundle-expiry (subscription checker)

System → Scheduler:
  ├─ task-enforce-caps (every 2 minutes)
  ├─ task-check-expiry (every 30 minutes)
  └─ task-backup-config (every 6 hours)
```

### Useful Commands

```routeros
# Check hotspot users
/ip hotspot user print

# View active sessions
/ip hotspot active print

# Monitor data usage
/ip hotspot active print interval=5

# View router identity
/system identity print

# Check system uptime
/system resource print

# View all IPs
/ip address print

# View all routes
/ip route print

# Test connectivity
ping 8.8.8.8

# Show log
/log print tail=100
```

---

## Support & Next Steps

### After Successful Deployment

1. **Set Router Password** (if not already done)
   ```
   /user set admin password=<new_secure_password>
   ```

2. **Create Admin Backup Account** (optional)
   ```
   /user add name=backup-admin password=<password> group=full
   ```

3. **Enable SSH** (for remote management)
   ```
   /ip service enable ssh
   ```

4. **Schedule Automatic Backups** (already in script, but verify)
   ```
   /system scheduler print | find task-backup-config
   ```

5. **Start Backend Services**
   ```bash
   cd backend
   npm install
   node app.js
   ```

6. **Start Frontend** (in separate terminal)
   ```bash
   cd frontend
   npm install
   npm start
   ```

### Performance Optimization

- Monitor active sessions: `/ip hotspot active print`
- Check bandwidth usage: Traffic → Monitor
- Adjust profile speeds if needed (Phase 7)
- Enable QoS if congested (uncomment Phase 13)

### Multi-Site Setup (Future)

To add a second router:
1. Repeat this guide for new router at `192.168.101.1`
2. Update `.env` with SITE_2 settings
3. Backend will auto-load-balance across both routers

---

**Congratulations!** 🎉 Your MikroTik Bundle Router is now ready for production.

For issues, check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or [QUICK_REFERENCE.md](QUICK_REFERENCE.md).
