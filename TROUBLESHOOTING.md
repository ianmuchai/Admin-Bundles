# MIKROTIK TROUBLESHOOTING REFERENCE
## Complete Error Diagnosis & Solutions

---

## 🔴 CRITICAL ISSUES

### Router Completely Unresponsive (90s timeout on WebFig)

**Symptoms:**
- WebFig/WinBox: "Connection refused" or 90s+ timeout
- Ping: No response
- Device not accessible on network

**Root Causes:**
1. Script introduced invalid syntax (rare)
2. Bridge configuration broke access (most common)
3. Firewall rules blocking management port
4. Memory/CPU exhaustion

**Solutions (in order):**

**Option 1: Hard Reboot (Safest)**
```
1. Unplug power for 30 seconds
2. Plug back in
3. Wait 3-5 minutes for boot
4. Try WebFig again: http://192.168.100.1
```

**Option 2: Factory Reset (Last Resort)**
```
1. Get serial cable (RB951Ui-2HnD: TTL @ 3.3V)
2. Connect to serial, boot into recovery
3. Follow MikroTik reset procedure
4. Re-run deployment script
⚠️ WARNING: Deletes ALL configuration
```

**Option 3: Netinstall Recovery (Advanced)**
```
1. Download Netinstall from mikrotik.com
2. Boot device into netinstall mode (hold Reset, power on)
3. Reinstall RouterOS via Netinstall
4. Restore from backup if you have one
```

**Prevention:**
- Always backup before major changes
- Test script on spare device first
- Save script after each successful run
- Monitor /log for errors immediately after deployment

---

## 🟠 HIGH PRIORITY ISSUES

### WiFi Not Broadcasting

**Symptoms:**
- Can't see `Bundle-WiFi-BundleRouter-01` SSID
- Wireless appears offline
- Phone/laptop can't detect network

**Check Points:**

**1. Wireless Interface Disabled?**
```routeros
/interface wireless print
# Look for wlan0, should show disabled=false
```
**Fix if disabled:**
```routeros
/interface wireless set wlan0 disabled=no
```

**2. Wireless Not in Bridge?**
```routeros
/interface bridge port print
# wlan0 should be in bridge-local, disabled=no
```
**Fix if missing:**
```routeros
/interface bridge port add bridge=bridge-local interface=wlan0 disabled=no
```

**3. WiFi Profile Issue?**
```routeros
/interface wireless print detail
# Check: band=*, frequency=*, tx-power-level=*
```

**4. Still Not Working → Power Cycle**
```
1. /system reboot
2. Wait 2 minutes for boot
3. Check WiFi again
```

**5. Emergency: Restore Bridge**
```routeros
# If bridge totally broken:
/interface bridge reset-mac-address bridge-local

# Or recreate:
/interface bridge remove bridge-local
/interface bridge add name=bridge-local
/interface bridge port add bridge=bridge-local interface=ether3
/interface bridge port add bridge=bridge-local interface=ether4
/interface bridge port add bridge=bridge-local interface=ether5
/interface bridge port add bridge=bridge-local interface=wlan0
```

---

### Users Can't Access Hotspot Portal

**Symptoms:**
- Connect to WiFi OK
- Browser to 192.168.100.1:8091 → timeout or connection refused
- Manual hotspot login page never appears
- Users say "No internet" or "Can't authenticate"

**Check Points:**

**1. Hotspot Service Running?**
```routeros
/ip hotspot print
# Should show: name=hotspot-bundle, disabled=false, interface=bridge-local

# If not running:
/ip hotspot enable hotspot-bundle
```

**2. DHCP Server Working?**
```routeros
/ip dhcp-server print
# Should show: disabled=false, interface=bridge-local, running=true

/ip pool print
# Should show: dhcp-pool, ranges=192.168.100.10-192.168.100.254
```

**3. User Has IP Address?**
```
On client device:
Windows: ipconfig | find 192.168.100
Mac/Linux: ifconfig | grep 192.168.100
# Should show address in 192.168.100.x range

If not: Try: ipconfig /renew (Windows) or sudo dhclient (Linux)
```

**4. Can Ping Router Gateway?**
```
On client device:
ping 192.168.88.1
# Should get replies

If fails: WiFi connected? Bridge broken?
```

**5. Firewall Blocking?**
```routeros
/ip firewall filter print where chain=input
# Should have: accept in-interface=bridge-local

/ip firewall filter print where chain=forward
# Should have: accept in-interface=bridge-local ...
```

**Fix Firewall:**
```routeros
# If missing input rule:
/ip firewall filter add chain=input action=accept in-interface=bridge-local place-before=0

# If missing forward rule:
/ip firewall filter add chain=forward action=accept in-interface=bridge-local out-interface=ether2 place-before=0
```

**6. Last Resort: Hotspot Reset**
```routeros
/ip hotspot disable hotspot-bundle
/ip hotspot enable hotspot-bundle

# Or recreate:
/ip hotspot remove hotspot-bundle
/ip hotspot add name=hotspot-bundle interface=bridge-local address-pool=dhcp-pool profile=default disabled=no
```

---

### No Internet After Hotspot Login

**Symptoms:**
- Portal login successful
- User authenticated
- But: no internet access, "No network"
- Can ping 192.168.100.1 but not 8.8.8.8

**Check Points:**

**1. WAN Has IP Address?**
```routeros
/ip address print
# Should show ether2 with IP address (not 0.0.0.0/0)

/ip dhcp-client print
# Should show: interface=ether2, enabled=true, status=bound
```

**If no IP on ether2:**
```routeros
# Try restart DHCP:
/ip dhcp-client disable 0
/ip dhcp-client enable 0

# Or manually set IP:
/ip address add address=203.0.113.1/24 interface=ether2
# (Replace 203.0.113.1 with your ISP's IP)
```

**2. NAT Rule Exists?**
```routeros
/ip firewall nat print
# Should show: chain=srcnat, out-interface=ether2, action=masquerade
```

**If missing:**
```routeros
/ip firewall nat add chain=srcnat out-interface=ether2 action=masquerade place-before=0
```

**3. Route to Gateway Exists?**
```routeros
/ip route print
# Should show: 0.0.0.0/0 via x.x.x.1 (your WAN gateway)
```

**If missing — DHCP not working:**
```routeros
# Check DHCP client status:
/ip dhcp-client print status

# Force renew:
/ip dhcp-client renew 0

# Or set static gateway:
/ip route add dst-address=0.0.0.0/0 gateway=203.0.113.254 comment="Gateway"
```

**4. Locally Test DNS/Internet**
```routeros
# From router terminal, can we reach internet?
ping 8.8.8.8
# Should get replies

ping google.com
# Should resolve and reply
```

**If router itself can't reach internet:**
- WAN problem (ISP down, cable unplugged)
- Modem reboot required
- Check /ip address and /ip route

**If router can reach but clients can't:**
- NAT missing (see #2)
- Firewall forward rules blocking (see WiFi troubleshooting #5)
- User profile rate-limit = 0 (check /ip hotspot user profile)

---

## 🟡 MEDIUM PRIORITY ISSUES

### Data Cap Not Enforcing

**Symptoms:**
- Users exceed limit but don't get disconnected
- Script isn't running
- No log entries for enforcement

**Check Points:**

**1. Script Exists?**
```routeros
/system script print where name="enforce-bundle-caps"
# Should show it

If not: Script didn't run during setup, manually copy from Phase 11
```

**2. Scheduler Task Exists?**
```routeros
/system scheduler print where name="task-enforce-caps"
# Should show: enabled=true, interval=2m

# If disabled, enable:
/system scheduler enable task-enforce-caps
```

**3. Script Executes by Running Manually?**
```routeros
/system script run enforce-bundle-caps

# Check logs:
/log print tail=10 topics=script,hotspot
# Should see enforcement log entries

If errors: Check script source code for syntax
```

**4. Active Sessions Exist?**
```routeros
/ip hotspot active print
# If empty: No users logged in, script has nothing to check
```

**5. Data Checks Out?**
```routeros
# Check usage for active user:
/ip hotspot active get [find user=john] bytes-in
/ip hotspot active get [find user=john] bytes-out
# Sum these, compare to profile limit

# View profile limit:
/ip hotspot user profile print where name=daily-1gb
# rate-limit shows the speed, not the cap
```

**If Script Not Triggering:**
```routeros
# Check scheduler policy:
/system scheduler print detail
# Should have: policy=read,write,policy,test

# Set correct policy:
/system scheduler set task-enforce-caps policy=read,write,policy,test

# Try manual run again:
/system script run enforce-bundle-caps
/log print tail=5
```

---

### Dual-WAN Not Failing Over

**Symptoms:**
- Have 2 WANs configured (Starlink + 4G)
- Primary goes down
- Traffic stuck (doesn't switch to backup)

**Check Points:**

**1. Both DHCP Clients Enabled?**
```routeros
/ip dhcp-client print
# Should show 2 entries: interface=ether2 AND interface=ether1
# Both should: disabled=false, status=bound
```

**2. Both Routes Exist?**
```routeros
/ip route print
# Should show TWO entries for 0.0.0.0/0:
#   Route 1: gateway=x.x.x.1, distance=1 (Starlink)
#   Route 2: gateway=y.y.y.1, distance=10 (4G)

If one missing: DHCP client not getting IP from that interface
  → Check interface IP: /ip address print
  → Check ISP connectivity on that interface
```

**3. Test Failover Manually**
```routeros
# Disable primary:
/interface ether2 disable

# Check route switch (should use ether1 now):
/ip route print
ping 8.8.8.8                    # Should work via ether1

# Re-enable primary:
/interface ether2 enable

# Check route switch back:
/ip route print
ping 8.8.8.8                    # Should work via ether2 again
```

**If Doesn't Fail Over:**
- Delete and recreate ether1 DHCP client
- Check ether1 interface exists: `/interface print`
- Verify 4G modem connected to ether1 (or USB)
- Force metric change:
```routeros
/ip route set [find dst-address=0.0.0.0/0 gateway=y.y.y.1] distance=10
```

---

### Users Report Very Slow Speed

**Symptoms:**
- Internet works but SLOW
- Stuck at 0.5 Mbps instead of 5Mbps
- Downloads/streams don't work

**Check Points:**

**1. User's Profile Speed Limit?**
```routeros
/ip hotspot user print
# Check user's profile field

/ip hotspot user profile print
# Look up speeds: rate-limit=X/X (X Mbps)

If profile=daily-500mb: only 2Mbps (by design)
```

**2. WAN Speed Available?**
```routeros
# Check WAN connection quality:
/ip dhcp-client print status
# Look for: DHCP Lease is valid, IP assigned

# Manually test from router:
/tool bandwidth-test [WAN Gateway IP]
```

**3. Queue/SQM Rules?**
```routeros
/queue tree print
/queue simple print
# If rules exist: might be throttling traffic

# Temporarily disable to test:
/queue simple disable [id]
/queue tree disable [id]
```

**4. Packet Loss?**
```routeros
ping [user's client] -c 100
# If >5% loss: WiFi signal weak or interference
```

**5. ISP/WAN Congestion?**
```routeros
# Test from multiple users:
/network neighbors print       # Peer connections
/interface print stats         # Interface throughput
# If all users slow: WAN problem, not specific user
```

**Fix Slow Speed:**
- Restart modem/ISP device
- Move user closer to WiFi
- Reduce channel congestion (change WiFi channel)
- Upgrade user's profile to higher tier
- Check for DDoS/abuse in /log

---

## 🟢 LOW PRIORITY ISSUES

### Users See Different IPs at Login Portal

**Symptoms:**
- Hotspot shows: "Your IP: 203.0.113.45"
- On test device: actual IP is 192.168.100.123
- Confusion about "real" IP

**Root Cause:**
- Portal shows **WAN IP** (your modem)
- Test device shows **LAN IP** (local 192.168.100.x)

**This is Normal!**
- External services see WAN IP
- Internal network sees LAN IP
- Both correct

---

### API Port 8728 Unreachable from Backend

**Symptoms:**
- Node.js: "Connection refused on 192.168.100.1:8728"
- node-routeros: Cannot connect
- Backend user creation fails

**Check Points:**

**1. API Service Enabled?**
```routeros
/ip service print
# Look for "api", should: disabled=false
# "ports" should show 8728

# If disabled:
/ip service enable api
```

**2. Firewall Allowing?**
```routeros
/ip firewall filter print chain=input
# Should have rule: accept port=8728 or accept protocol=tcp dst-port=8728
```

**3. Backend Can Reach Router?**
```powershell
# From Windows backend server:
ping 192.168.88.1
# Should succeed

telnet 192.168.100.1 8728
# Should connect (or show connection refused clearly)
```

**4. Credentials Correct?**
```javascript
// Node.js test:
const { RouterOSAPI } = require('node-routeros');
const api = new RouterOSAPI({
  host: '192.168.100.1',
  user: 'admin',
  password: 'YOUR_PASSWORD',
  port: 8728
});
api.connect()
  .then(() => console.log('✅ Connected'))
  .catch(e => console.log('❌ Failed:', e.message));
```

**Fix API Connectivity:**
- Enable service: `/ip service enable api`
- Add firewall rule: `/ip firewall filter add chain=input action=accept protocol=tcp dst-port=8728`
- Check router IP: `/ip address print`
- Verify network path from backend to router (ping, tracert)

---

### Logs Filling Up / Storage Full

**Symptoms:**
- "Disk full" messages
- Can't create new users
- Routes taking time

**Check Points:**

**1. Disk Usage?**
```routeros
/system resource print
# Look for: disk-free (should be >10MB)

If <5MB: Running out of storage
```

**2. Logs Too Large?**
```routeros
/log print count
# How many log entries?

If >10000: Clear old logs
```

**Clear Logs:**
```routeros
/log print find number=0 action=delete  # Delete oldest first

# Or set max size:
/system logging set default-log-size=100  # 100KB per log topic
```

---

## 🔍 DIAGNOSTIC COMMANDS

### Get Complete System Status
```routeros
# Copy-paste all these to get full picture:
:put "=== INTERFACES ==="
/interface print
:put "=== ADDRESSES ==="
/ip address print
:put "=== ROUTES ==="
/ip route print
:put "=== DHCP CLIENTS ==="
/ip dhcp-client print status
:put "=== HOTSPOT STATUS ==="
/ip hotspot print
:put "=== ACTIVE SESSIONS ==="
/ip hotspot active print
:put "=== FIREWALL FILTER ==="
/ip firewall filter print
:put "=== FIREWALL NAT ==="
/ip firewall nat print
:put "=== LOGS (last 30) ==="
/log print tail=30
:put "=== RESOURCES ==="
/system resource print
```

### Export Config for Backup
```routeros
/export file=config-backup-$(system clock get date)-export.rsc

# Then download via WebFig File → Download
```

### Test Internet Connectivity
```routeros
# If router can't reach internet:
ping 8.8.8.8          # Google DNS
ping 1.1.1.1          # Cloudflare DNS
ping google.com       # DNS test
traceroute 8.8.8.8    # Check routing path
```

---

## 📋 SYSTEMATIC TROUBLESHOOTING PROCESS

When something breaks:

1. **Identify Symptom**
   - "WiFi not working" vs "User can't get internet"
   - Affects 1 user or everyone?
   - When did it start?

2. **Check Logs**
   ```routeros
   /log print tail=50 | grep -i error
   ```

3. **Verify Basic Services**
   ```routeros
   /ip hotspot print            # Hotspot running?
   /ip dhcp-server print        # DHCP running?
   /interface print             # Interfaces up?
   /ip address print            # IPs assigned?
   ```

4. **Test Connectivity Layer by Layer**
   - Layer 1: Cable plugged in? LEDs on?
   - Layer 2: Bridge working? `/interface bridge port print`
   - Layer 3: IP assigned? `/ip address print`
   - Layer 4: Routes exist? `/ip route print`

5. **Check Firewall**
   ```routeros
   /ip firewall filter print
   /ip firewall nat print
   # Are rules blocking traffic?
   ```

6. **Try Reboot**
   ```routeros
   /system reboot
   # Wait 3 minutes
   # Retest
   ```

7. **Check Logs After Reboot**
   ```routeros
   /log print tail=50
   # Any errors during startup?
   ```

8. **If Still Broken → Factory Reset**
   - Last resort
   - Backup first if possible
   - Redeploy script

---

## 🆘 When All Else Fails

**Contact Support With This Info:**
1. Output of: `/system resource print`
2. Output of: `/ip address print`
3. Output of: `/ip route print`
4. Last 100 log lines: `/log print tail=100`
5. Exact error message from WebFig/backend
6. Timeline: "Broke after X change" or "Spontaneous"
7. Already tried: (what you've attempted)

---

**Last Updated**: March 2026  
**For**: MikroTik RB951Ui-2HnD with Optimized Bundle Script  
**Revision**: 1.0

Good luck! 🚀
