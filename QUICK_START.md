# ⚡ QUICK START - 15-MINUTE DEPLOYMENT

## 🎯 Goal
Deploy optimized MikroTik bundle system with Starlink/4G support in 15 minutes.

---

## 📋 PRE-DEPLOYMENT CHECKLIST

- [ ] **Backup Router Config** (critically important!)
  ```
  WebFig → System → Backup → Name: "pre-bundle-backup" → Backup
  ```

- [ ] **Current Router Status** (must see before starting)
  ```
  IP: 192.168.88.1
  User: admin
  Pass: <your password here>
  WebFig: http://192.168.88.1 (should load login page)
  ```

- [ ] **Wiring Verification**
  ```
  ether2 → Starlink Router / Modem (WAN cable)
  ether3-5 → LAN clients (or leave disconnected for now)
  wlan0 → WiFi (on board, should work after script)
  ```

- [ ] **Read IMPLEMENTATION_GUIDE.md** (5 min read)

---

## 🚀 DEPLOYMENT STEPS (15 minutes)

### Step 1: Access Router (2 min)
**Option A: WebFig (Web Browser)**
```
1. Open: http://192.168.100.1
2. Login with admin credentials
3. Should see dashboard
```

**Option B: WinBox (Recommended)**
```
1. Download: https://mikrotik.com/download
2. Run WinBox.exe
3. Click "..." button → Find neighbors (auto-discovers 192.168.100.1)
4. IP: 192.168.100.1 | User: admin | Pass: <password>
5. Click "Connect"
```

**Option C: SSH Terminal** (Advanced)
```powershell
ssh admin@192.168.100.1
# Agree to fingerprint, enter password
```

### Step 2: Copy Script (3 min)

**Via WebFig:**
1. Navigate: **System → Scripts**
2. Click **+ New** button
3. **Name:** `bundle-router-setup`
4. **Source:** Clear the box, paste entire content from `mikrotik-optimized-setup.rsc`
5. Click **OK**
6. You should see it in the scripts list

**Via WinBox:**
1. In left panel: **System → Scripts**
2. Right-click → **New**
3. Paste script into the text area
4. Click **OK**

**Via SSH:**
```bash
# Create a file locally, then upload via SCP (complex)
# OR paste the entire script via terminal (not recommended)
```

### Step 3: Run Script (5 min)

**Via WebFig/WinBox:**
1. In **System → Scripts**, select `bundle-router-setup`
2. Click **Run** button
3. Watch the **System → Log** panel for progress
4. Wait for message: `MikroTik Bundle Router initialization COMPLETE`
5. ✅ **Success!**

**Via SSH/Terminal:**
```bash
/system script run bundle-router-setup
# Wait for completion...
/log print tail=30
# Look for "initialization COMPLETE"
```

### Step 4: Verify Configuration (3 min)

**Check Hotspot:**
```bash
/ip hotspot print                    # Should show "hotspot-bundle" enabled
/ip hotspot user profile print       # Should show 5 profiles
```

**Check Bridge (WiFi):**
```bash
/interface bridge print              # Should show "bridge-local"
/interface bridge port print         # Should show ether3,4,5,wlan0
/interface wireless print            # wlan0 should be "disabled=no"
```

**Check WAN:**
```bash
/ip address print                    # Should show WAN IP on ether2
/ip route print                      # Should show 2 default routes (0.0.0.0/0) if dual-WAN enabled
```

### Step 5: Test Hotspot Access (2 min)

**From WiFi:**
1. Phone/Laptop → Connect to WiFi: `Bundle-WiFi-BundleRouter-01`
2. Password: `BundleWiFi2024`
3. Open browser → **Should auto-redirect to login page**
4. If not: Visit `http://192.168.100.1:8091` manually
5. Create test user in WebFig: **IP → Hotspot → Users → + Add**
   - Name: `testuser`
   - Password: `testpass`
   - Profile: `daily-1gb`
6. Login with testuser/testpass
7. ✅ **Should grant internet access**

**From Wired:**
1. Plug device into ether3
2. Should get DHCP address from 192.168.100.10-254
3. Should auto-redirect to hotspot portal

### Step 6: Verify Data Cap Enforcement (Optional, 2 min)

```bash
# Check if script is running
/system scheduler print             # task-enforce-caps every 2m
/system script print                # enforce-bundle-caps should exist

# Test enforcement manually (generates fake usage)
/ip hotspot active print            # See active users
/system script run enforce-bundle-caps  # Run the enforcement script
/log print tail=10 topics=script    # Should see log entries
```

---

## 🔧 COMMON TWEAKS (After Deployment)

### Change WiFi Password
```bash
/interface wireless
set wlan0 wpa2-pre-shared-key="YourNewPassword123"
```

### Change WiFi Name (SSID)
```bash
/interface wireless
set wlan0 ssid="MyBundleNetwork"
```

### Add Dual-WAN (4G Backup)
```bash
# In script, uncomment Phase 2 WAN 2 sections before running
# OR manually add after script:
/ip dhcp-client
add interface=ether1 disabled=no add-default-route=yes default-route-distance=10
```

### Change Bundle Speed Limits
```bash
/ip hotspot user profile
set daily-1gb rate-limit=10M/10M    # Change from 5M/5M to 10M/10M
```

### Adjust Data Cap Enforcement Interval
```bash
/system scheduler
set task-enforce-caps interval=1m   # Change from 2m to 1m (check every minute)
```

### Disable Hotspot (Emergency Kill)
```bash
/ip hotspot
set hotspot-bundle disabled=yes
# All users disconnected immediately
```

---

## 🆘 TROUBLESHOOTING (If Something Goes Wrong)

### **WiFi Not Broadcasting**
**Problem**: Can't see `Bundle-WiFi-BundleRouter-01` network

**Solution**:
```bash
/interface wireless print           # Check if wlan0 exists and disabled=no
/interface bridge port print        # wlan0 should be in bridge-local
# If wlan0 missing, reboot:
/system reboot
```

### **Users Can't Access Hotspot**
**Problem**: WiFi connects but no portal appears

**Solution**:
```bash
/ip hotspot print                   # Should show disabled=no
/ip hotspot active print            # Check active sessions
# If none: hotspot not started, try:
/ip hotspot disable hotspot-bundle
/ip hotspot enable hotspot-bundle
```

### **No Internet After Login**
**Problem**: User logs in but no connectivity

**Solution**:
```bash
/ip firewall filter print           # Chain=forward should have LAN→WAN rules
# Check if NAT exists:
/ip firewall nat print              # Should have srcnat rule to ether2
# Verify WAN IP:
/ip address print                   # ether2 should have IP assigned
# Ping test:
ping 8.8.8.8                        # From terminal on router
```

### **Data Cap Not Enforcing**
**Problem**: User exceeds limit but stays connected

**Solution**:
```bash
# Check if script exists and scheduler is running:
/system scheduler print             # task-enforce-caps should be enabled
/system script print                # enforce-bundle-caps should exist

# Run script manually:
/system script run enforce-bundle-caps

# Check logs:
/log print tail=20 topics=script    # Look for enforcement messages
```

### **Router Completely Frozen / Slow**
**Problem**: Router unresponsive, WebFig times out

**Solution**:
```bash
# Option 1: Soft reboot (terminal)
/system reboot

# Option 2: Hard reboot (power off 30 sec, power on)
# Wait 2-3 minutes for router to boot

# Option 3: Factory reset (last resort)
/system reset-configuration no-defaults=yes
# WARNING: Deletes all config, need to re-run setup script
```

---

## 📊 MONITORING & DIAGNOSTICS

### Real-Time User Monitoring
```bash
# Active users
/ip hotspot active print

# User details (with data usage)
/ip hotspot active print detail

# All created users
/ip hotspot user print
```

### Check System Health
```bash
# CPU, Memory, Disk
/system resource print

# Uptime
/system clock print

# Temperature (if available)
/system health print
```

### Network Traffic
```bash
# See current connections
/ip firewall connection tracking print

# See interface statistics
/interface print stats
```

### Logs (For Debugging)
```bash
# Last 50 log entries
/log print tail=50

# Filter by topic
/log print topics=hotspot
/log print topics=script
/log print topics=api

# Export logs (via WebFig: System → Log)
# Or: /log print file=logs.txt
```

---

## 🔐 SECURITY TIPS (After Deployment)

1. **Change Default Password**
   ```bash
   /user set admin password=YourStrongPassword123
   ```

2. **Disable Unnecessary Services**
   ```bash
   /ip service disable telnet,ftp    # Keep SSH/API/HTTP
   ```

3. **Enable Firewall**
   ```bash
   /ip firewall enable                # Should already be on
   ```

4. **Update RouterOS** (Optional)
   - Check System → Package → Check for updates
   - Only update if router is stable first

5. **Backup After Success**
   ```bash
   # After everything works:
   /system backup save name=bundle-working
   ```

---

## 🎓 NEXT STEPS

### For Backend Integration
1. Update `.env` with router credentials:
   ```env
   MIKROTIK_HOST=192.168.100.1
   MIKROTIK_USER=admin
   MIKROTIK_PASS=YourPassword
   MIKROTIK_PORT=8728
   ```

2. Replace `mikroticServices.js` with `mikroticServices-enhanced.js`

3. Test API connection:
   ```javascript
   const { MikrotikService } = require('./services/mikroticServices-enhanced');
   const svc = new MikrotikService();
   svc.testConnection().then(console.log);
   ```

4. Create user via API:
   ```bash
   curl -X POST http://localhost:5000/api/users/create-bundle-user \
     -H "Content-Type: application/json" \
     -d '{
       "username": "john",
       "password": "pass123",
       "profile": "daily-1gb",
       "bundleExpiry": "2026-12-31"
     }'
   ```

### For Payment Integration
- Add payment processing → auto-create user
- Set expiry date based on bundle purchase
- Monitor data usage via `/api/users/data-usage`

### For Multi-Site (Starlink + 4G)
- Set up second router with same script
- Update backend `.env` to include SITE_2_*
- Load balance users across sites

---

## 📞 SUPPORT REFERENCE

| Component | Location | Purpose |
|-----------|----------|---------|
| **Router Status** | http://192.168.88.1 | Dashboard |
| **Hotspot Portal** | http://192.168.88.1:8091 | User Login |
| **API Port** | 8728 | RouterOS API (node-routeros) |
| **SSH** | admin@192.168.88.1:22 | Terminal access |
| **WebFig** | System menu | Full configuration |

---

## ✅ DEPLOYMENT CHECKLIST (FINAL)

- [ ] Backup completed
- [ ] Script copied and run successfully
- [ ] WiFi broadcasting (can see SSID)
- [ ] Hotspot portal accessible
- [ ] Test user created and can login
- [ ] Internet accessible after login
- [ ] Data cap enforcement running (scheduler enabled)
- [ ] Router rebooted cleanly (if needed)
- [ ] System logs show no errors
- [ ] Backend .env updated with credentials
- [ ] API connectivity tested

---

**Estimated Time**: 15 minutes  
**Difficulty**: Intermediate  
**Support**: See IMPLEMENTATION_GUIDE.md for detailed troubleshooting

🎉 **You're ready to deploy!**
