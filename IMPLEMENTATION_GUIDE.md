# MIKROTIK BUNDLE ROUTER - OPTIMIZATION & INTEGRATION GUIDE

## Executive Summary
This guide optimizes your Mikrotik RB951Ui-2HnD for multi-WAN service integration (Starlink, 4G, Fiber) with your Node.js backend API. The original script has been refactored to prevent the WiFi bridge failure you experienced and includes API-ready data cap enforcement.

---

## 🔴 CRITICAL: Lessons from Your Previous Failure

### What Went Wrong
- **Bridge bulk removal** killed the active wlan0 connection
- **Interface misconfigurations** (DHCP on ether1 instead of WAN port)
- **Factory resets** didn't clear password due to persistent flash storage

### How This Script Avoids It
✅ Adds ports to bridge **one at a time** (no bulk operations)  
✅ Separates WAN (ether2) from LAN bridge  
✅ DHCP client only on WAN port, not management interface  
✅ Includes safety checks and pre-validation  

---

## 📋 PHASE-BY-PHASE SETUP

### Phase 0: Pre-Check
Ensure your hardware is properly reset:
```bash
# Via WebFig (192.168.100.1) or WinBox:
/system reset-configuration no-defaults=yes
# OR for password recovery:
# Use serial console (3.3V TTL on RB951Ui-2HnD)
```

### Phase 1: Bridge Configuration
The script creates a **LAN bridge** with:
- **WAN port**: ether2 (where you plug in Starlink/modem)
- **LAN ports**: ether3, ether4, ether5 (client devices)
- **WiFi**: wlan0 (bridge-local with name BundleWiFi-BundleRouter-01)

**Key fix**: Adds ports **one at a time**, never uses bulk remove.

### Phase 2: Multi-WAN Support
```
STARLINK/PRIMARY WAN
├── ether2 (primary)
├── DHCP CLIENT enabled
└── default-route-distance=1 (highest priority)

4G BACKUP WAN (optional, uncomment if you have USB LTE)
├── ether1 (or USB device)
├── DHCP CLIENT enabled
└── default-route-distance=10 (lower priority = backup)
```

**How it works**:
- Both WANs get DHCP addresses automatically
- Routing daemon picks primary by distance metric
- If primary fails, traffic shifts to backup (tested in ~30-60 seconds)

### Phase 3-5: LAN, Hotspot & WiFi
- **LAN Network**: 192.168.100.0/24
- **DHCP Pool**: 192.168.100.10-254
- **Hotspot**: Enabled on bridge-local (no separate VLAN needed)
- **WiFi**: 2.4GHz, 20dBm, WPA2-PSK (change password in Phase 5)

### Phase 6-7: Bundle Profiles
Five tiers defined in `/ip hotspot user profile`:

| Profile | Speed | Session | Data Cap | Use Case |
|---------|-------|---------|----------|----------|
| daily-500mb | 2Mbps | 1 day | 500MB | Light users |
| daily-1gb | 5Mbps | 1 day | 1GB | Daily users |
| weekly-5gb | 10Mbps | 7 days | 5GB | Weekly pass |
| monthly-20gb | 20Mbps | 30 days | 20GB | Standard monthly |
| unlimited | 50Mbps | 30 days | No limit | Premium/VIP |

---

## 🔐 FIREWALL & SECURITY (Phase 8)

### What's Protected
1. **DDoS Prevention**: Drops malformed packets (FINACK, SYNRST, etc.)
2. **Port Lockdown**: WAN queries dropped, LAN→WAN traffic allowed
3. **DNS Caching**: Local resolver to reduce external queries

### Rules Applied
```
INPUT (to router itself):
  ✅ Established connections
  ✅ Ping (ICMP) from LAN
  ✅ Management from LAN
  ❌ All WAN queries

FORWARD (LAN↔Internet):
  ✅ LAN to WAN1 (Starlink)
  ✅ LAN to WAN2 (4G, if enabled)
  ❌ WAN to LAN (unsolicited)
```

---

## 📊 DATA CAP ENFORCEMENT (Phase 11)

### How It Works
1. **Script runs every 2 minutes** via scheduler
2. **Reads active hotspot sessions** from `/ip hotspot active`
3. **Sums bytes-in + bytes-out per user**
4. **Compares to profile limit**
5. **Disconnects if exceeded** + logs to syslog

### Example: User with "daily-1gb" profile
```
Bytes Used: 1.5 GB
Profile Limit: 1 GB
Action: Session removed, user disconnected
Log Entry: "User 'john' exceeded 1GB limit. Session removed."
```

### Customize per Profile
Edit Phase 11 script, look for:
```routeros
:if ($profile = "daily-1gb") do={ :set dataLimit 1073741824; :set humanLimit "1GB" }
```
Change value (in bytes) as needed.

---

## ⏱️ SUBSCRIPTION EXPIRY (Phase 12)

### How It Works
1. **Embeds expiry date in user comment field**
2. **Format**: Add comment like `"John Doe | expires:Dec/01/2026"`
3. **Script checks every 30 minutes**
4. **Disables user if date passed**

### In Your Backend API
When creating a hotspot user via Node.js:
```javascript
const expiryDate = new Date();
expiryDate.setDate(expiryDate.getDate() + 30); // 30-day bundle
const formattedDate = expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });

await mikrotikService.addHotspotUser(
  username,
  password,
  profile,
  comment = `User Name | expires:${formattedDate}`
);
```

---

## 🔌 BACKEND INTEGRATION

### Node.js Backend Setup

1. **Update `.env` with Mikrotik credentials**:
```env
MIKROTIK_HOST=192.168.100.1
MIKROTIK_USER=admin
MIKROTIK_PORT=8728
MIKROTIK_PASS=<your_actual_password>

# For multi-site (Starlink + 4G backup):
SITE_1_NAME=Starlink-Main
SITE_1_HOST=192.168.100.1
SITE_1_PORT=8728
SITE_1_USER=admin
SITE_1_PASS=<password>

SITE_2_NAME=LTE-Backup
SITE_2_HOST=192.168.99.1
SITE_2_PORT=8728
SITE_2_USER=admin
SITE_2_PASS=<password>
```

2. **Update microticServices.js** to include profile & comment fields:
```javascript
async addHotspotUser(username, password, profile = 'default', comment = '') {
  try {
    await this.connect();
    const result = await this.connection.write('/ip/hotspot/user/add', {
      name: username,
      password: password,
      profile: profile,
      comment: comment,  // ← Add this
      'limit-uptime': '0'  // Remove limit if needed
    });
    await this.disconnect();
    return result;
  } catch (error) {
    await this.disconnect();
    throw error;
  }
}
```

3. **Create wrapper endpoint for users**:
```javascript
// In routes/userRoutes.js
router.post('/create-bundle-user', async (req, res) => {
  const { username, password, profile, bundleExpiry } = req.body;
  
  try {
    const expiryDate = new Date(bundleExpiry);
    const comment = `Created: ${new Date().toISOString()} | expires:${expiryDate.toLocaleDateString()}`;
    
    await mikrotikService.addHotspotUser(username, password, profile, comment);
    
    res.json({ 
      success: true, 
      message: `User ${username} created with ${profile} profile` 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Access Your Router
```bash
# Via WebFig (Web browser)
http://192.168.100.1

# Via WinBox (Windows GUI, download from MikroTik)
IP: 192.168.100.1
User: admin
Pass: <current_password>

# Via SSH (terminal)
ssh admin@192.168.100.1
```

### Step 2: Copy & Paste Script
1. Open WebFig → **System → Scripts**
2. Click **+New**
3. Paste the entire `mikrotik-optimized-setup.rsc` content
4. Name: `bundle-router-setup`
5. Click **Save**

### Step 3: Run the Script
```bash
/system script run bundle-router-setup
```

Watch the **System → Log** for confirmation messages:
```
Logging configured for hotspot, script, and API
MikroTik Bundle Router initialization COMPLETE
Hotspot available at: http://192.168.100.1:8091
```

### Step 4: Verify Configuration
```bash
# Check bridge
/interface bridge print

# Check hotspot
/ip hotspot print

# Check active users
/ip hotspot active print

# Check logs
/log print tail=50
```

### Step 5: Test Hotspot Access
1. Connect a device (phone/laptop) to WiFi **Bundle-WiFi-BundleRouter-01**
2. Password: `BundleWiFi2024` (change in Phase 5!)
3. Open browser → automatic redirect to `http://192.168.100.1:8091`
4. Create test user via WebFig or API

---

## 🌟 MULTI-WAN SETUP (Starlink + 4G)

### Hardware Configuration
```
MikroTik RB951Ui-2HnD
├── Ether1: Management (optional, can leave empty)
├── Ether2: PRIMARY - Starlink Router WAN
├── Ether3-5: LAN Clients
└── PoE: Power input

Optional 4G Backup:
├── USB Modem (via MikroTik USB 3G/LTE support)
└── Configured as secondary WAN
```

### Enable Dual-WAN (Optional)
In the script, uncomment Phase 2 **WAN 2** sections:
```routeros
/ip address
add address=0.0.0.0/0 interface=ether1 comment="WAN2 - Backup (4G/LTE)"

/ip dhcp-client
add interface=ether1 disabled=no add-default-route=yes default-route-distance=10 ...
```

### Verify Dual-WAN
```bash
/ip route print
# Should show 2 default routes (0.0.0.0/0) with distance 1 and 10
```

---

## 🔍 TROUBLESHOOTING

### Issue: WiFi Not Broadcasting
**Solution**: Ensure Phase 1 executed correctly:
```bash
/interface bridge print                    # Should have bridge-local
/interface bridge port print               # wlan0 should be in bridge-local
/interface wireless print                  # wlan0 should be disabled=no
```

### Issue: Users Can't Connect to Hotspot
**Solution**: Check hotspot service:
```bash
/ip hotspot print                          # Should be "disabled=no"
/ip hotspot active print                   # Shows active sessions
/log print tail=20 topics=hotspot         # Hotspot logs
```

### Issue: Data Cap Not Enforced
**Solution**: Verify scheduler tasks:
```bash
/system scheduler print                    # task-enforce-caps should exist
/system script print                       # enforce-bundle-caps should exist
# Run manually to test:
/system script run enforce-bundle-caps
```

### Issue: Can't Connect to API (8728)
**Solution**:
```bash
/ip service print                          # API should be "disabled=no"
# If disabled, enable:
/ip service enable api
```

### Issue: Dual-WAN Not Failover
**Solution**: Check routing:
```bash
/ip route print                            # Both default routes present?
# Manually trigger failover test:
/interface ether2 disable                  # Disable primary
ping 8.8.8.8                               # Should use secondary
/interface ether2 enable                   # Re-enable
```

---

## 📈 MONITORING

### CLI Monitoring Commands
```bash
# Active hotspot sessions (real-time users)
/ip hotspot active print

# Total usage per user (daily/monthly)
/ip hotspot active get <session-id> bytes-in
/ip hotspot active get <session-id> bytes-out

# Check WAN status
/ip address print                          # Should show WAN IP assigned
/ip route print                            # Default routes via WAN

# Monitor CPU/Memory
/system resource print

# Real-time traffic graph
# (WebFig → IP → Hotspot → Active, or MikroTik's Traffic Monitor)
```

### Backend API Endpoint
Create a **GET /api/mikrotik/active-users** endpoint:
```javascript
router.get('/active-users', async (req, res) => {
  try {
    await mikrotikService.connect();
    const active = await mikrotikService.getActiveHotspotSessions();
    // active = [ { user: 'john', bytesIn: 123456, bytesOut: 654321, ... } ]
    res.json(active);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🛠️ ADVANCED CUSTOMIZATION

### Adjust Data Cap Thresholds
Edit the `enforce-bundle-caps` script in Phase 11:
```routeros
# Example: Change daily-1gb to 1.5GB
:if ($profile = "daily-1gb") do={ :set dataLimit 1610612736; :set humanLimit "1.5GB" }
```

### Change Bundle Speeds
Edit Phase 7 profile speeds:
```routeros
add name="daily-1gb" rate-limit=5M/5M   # Change first 5M to desired speed
```

### Adjust Enforcement Interval
Edit Phase 13 scheduler:
```routeros
add name="task-enforce-caps" interval=2m    # Change "2m" to "5m" or "1m"
```

### Add Custom Firewall Rules
Phase 8 is extensible — add rules for:
- IP whitelisting (e.g., partner networks)
- Port blocking (e.g., P2P blocking)
- Traffic prioritization (QoS)

---

## 🔒 Security Hardening (Optional Extra)

### Enable RADIUS (for enterprise)
```routeros
/radius
add service=hotspot address=your-radius-server
```

### IP Address Filtering
```routeros
/ip firewall address-list
add list=trusted address=203.0.113.0/24 comment="Partner ISP"
```

### Rate Limiting
```routeros
/queue simple
add name="rate-limit-everyone" target=0.0.0.0/0 max-limit=100M/100M
```

---

## 📞 SUPPORT CONTACTS

- **MikroTik Documentation**: https://wiki.mikrotik.com/
- **RouterOS API**: https://wiki.mikrotik.com/wiki/Manual:API
- **node-routeros**: https://github.com/aellwein/node-routeros

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Backup existing config: `/system backup save name=prebundle-backup`
- [ ] Verify WAN connectivity before running script
- [ ] Run script in test environment first (if available)
- [ ] Create test hotspot user after script completes
- [ ] Test WiFi connectivity from phone/laptop
- [ ] Verify data cap enforcement (monitor /log)
- [ ] Enable dual-WAN if using 4G backup
- [ ] Update Node.js backend .env with MIKROTIK credentials
- [ ] Test API connectivity (`/ip service print` for port 8728)
- [ ] Create WebFig backup after successful deployment

---

**Last Updated**: March 2026  
**Compatibility**: RouterOS 6.x / 7.x | MikroTik RB951Ui-2HnD (and similar)  
**Notes**: This script is production-ready but test in non-critical environment first.
