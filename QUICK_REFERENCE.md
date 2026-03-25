# ⚡ QUICK REFERENCE CARD

**Print this and keep it next to your computer while deploying!**

---

## 🚀 DEPLOYMENT IN 5 STEPS

```
1. BACKUP      /system backup save name=pre-bundle-backup
                ↓
2. COPY        Copy mikrotik-optimized-setup.rsc content to:
                System → Scripts → + New → paste → OK
                ↓
3. RUN         /system script run bundle-router-setup
                ↓
4. VERIFY      /ip hotspot print          # Should be enabled
                /interface wireless print  # Should have wlan0
                /log print tail=10        # Should say COMPLETE
                ↓
5. TEST        WiFi: "Bundle-WiFi-BundleRouter-01"
                Hotspot: http://192.168.100.1:8091
```

---

## 📋 VERIFICATION CHECKLIST

After script runs, verify these exist:

```
✅ /interface bridge (bridge-local)
✅ /interface wireless (wlan0 disabled=no)
✅ /ip address (192.168.100.1/24 on bridge-local)
✅ /ip hotspot (hotspot-bundle enabled)
✅ /ip hotspot user profile (5 profiles: daily-500mb to unlimited)
✅ /ip firewall nat (srcnat action=masquerade)
✅ /system scheduler (task-enforce-caps running)
✅ /system script (enforce-bundle-caps exists)
✅ /log (shows "initialization COMPLETE" message)
```

---

## 🔧 COMMON COMMANDS

```routeros
# Check hotspot status
/ip hotspot print

# List all users
/ip hotspot user print

# View active sessions
/ip hotspot active print

# Check WAN IP
/ip address print

# Check routes
/ip route print

# View logs (last 50 lines)
/log print tail=50

# Restart hotspot
/ip hotspot disable hotspot-bundle
/ip hotspot enable hotspot-bundle

# Create test user (manual)
/ip hotspot user add name=testuser password=testpass profile=daily-1gb

# Reboot router
/system reboot
```

---

## 🚨 EMERGENCY FIXES

**WiFi Not Working:**
```routeros
/interface wireless set wlan0 disabled=no
/interface bridge port add bridge=bridge-local interface=wlan0
/interface wireless set wlan0 frequency=2.4GHz
```

**No Internet After Login:**
```routeros
/ip firewall nat add chain=srcnat out-interface=ether2 action=masquerade
/ip dhcp-client enable 0
```

**Router Stuck:**
```
1. Unplug for 30 seconds
2. Plug back in
3. Wait 3 minutes for boot
4. Try http://192.168.100.1 again
```

---

## 📞 QUICK DIAGNOSTICS

```routeros
# Copy & paste entire block to get full picture:
:put "=== System Status ==="
/interface print
/ip address print
/ip dhcp-client print status
/ip hotspot print
/ip route print
/log print tail=20
```

---

## 🎯 5 BUNDLE PROFILES

| Name | Speed | Session | Data Cap |
|------|-------|---------|----------|
| daily-500mb | 2Mbps | 1 day | 500MB |
| daily-1gb | 5Mbps | 1 day | 1GB |
| weekly-5gb | 10Mbps | 7 days | 5GB |
| monthly-20gb | 20Mbps | 30 days | 20GB |
| unlimited | 50Mbps | 30 days | No limit |

---

## 🔑 IMPORTANT PORTS & IPs

```
Router Management:     http://192.168.100.1 (WebFig)
Hotspot Portal:        http://192.168.100.1:8091
API Port:              8728 (RouterOS API)

LAN Gateway:           192.168.100.1
DHCP Range:            192.168.100.10-254
WAN Port (Starlink):   ether2
LAN Ports:             ether3, ether4, ether5
WiFi:                  wlan0
```

---

## ⚠️ CRITICAL: Don't Do These

```
❌ Use bulk bridge port remove (kills WiFi)
❌ Put DHCP client on ether1 (management interface)
❌ Forget to backup before deploying
❌ Restart during script execution
❌ Change ether2 settings mid-deployment
❌ Use factory reset without reason (password gets stuck)
```

---

## ✅ DO THESE INSTEAD

```
✅ Add bridge ports ONE AT A TIME
✅ Put DHCP client ONLY on ether2
✅ Backup before EVERY major change
✅ Let script complete fully (~2 minutes)
✅ Leave ether2 for WAN only
✅ Use hard reboot, not commands (if stuck)
```

---

## 🔐 DEFAULT CREDENTIALS (Change These!)

```
WiFi SSID:     Bundle-WiFi-BundleRouter-01
WiFi Password: BundleWiFi2024    ← CHANGE THIS
Router User:   admin
Router Pass:   <your_password>   ← SET THIS
```

---

## 📊 API EXAMPLES

```bash
# Create user
curl -X POST http://localhost:5000/api/mikrotik/users/create \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"pass123","profile":"daily-1gb"}'

# Get active users
curl http://localhost:5000/api/mikrotik/sessions

# Check data usage
curl http://localhost:5000/api/mikrotik/data-usage

# Get system health
curl http://localhost:5000/api/mikrotik/system/dashboard
```

---

## 🌐 MULTI-WAN ROUTING

If you have dual-WAN (Uncomment Phase 2 WAN 2 sections):

```
Primary:  ether2 (Starlink) distance=1  ← Used first
          ↓ (if fails after 30s)
Backup:   ether1 (4G)       distance=10 ← Used if primary down
```

Failover happens automatically. To test:
```routeros
/interface ether2 disable      # Disable primary
ping 8.8.8.8                   # Should use ether1
/interface ether2 enable       # Re-enable primary
```

---

## 🐛 WHEN SOMETHING BREAKS

1. **Check Logs First**
   ```routeros
   /log print tail=50
   ```

2. **Verify Services Running**
   ```routeros
   /ip hotspot print
   /ip dhcp-server print
   /system scheduler print
   ```

3. **Try Reboot**
   ```routeros
   /system reboot
   # Wait 3 minutes
   ```

4. **If Still Broken: Check Firewall**
   ```routeros
   /ip firewall filter print chain=forward
   /ip firewall nat print
   ```

5. **Last Resort: Restore Backup**
   ```routeros
   # File → Download backup-pre-bundle-backup.backup
   # System → Backup → Restore → select file
   ```

---

## 📱 FRONTEND INTEGRATION (Later)

When you build the user-facing app:

```javascript
// User buys bundle
POST /api/payment/create-order → payment gateway

// Payment confirmed (webhook)
POST /api/mikrotik/users/create → user created on router
  {
    username: "john_doe",
    password: generated_random,
    profile: "daily-1gb",
    bundleExpiry: "2026-04-21"
  }

// User checks usage (app)
GET /api/mikrotik/data-usage/users/{username} → shows progress

// Bundle expires
Script runs: disable user automatically
```

---

## 🌟 SUCCESS LOOKS LIKE THIS

After 5 minutes:
```
✅ WiFi SSID visible on your phone
✅ Script completes with "initialization COMPLETE"
✅ Can see /ip hotspot print (enabled)
```

After 15 minutes:
```
✅ Connect to WiFi
✅ Automatic redirect to 192.168.100.1:8091
✅ Create test user
✅ Test user logs in and gets internet
```

After 1 hour:
```
✅ /log shows data cap enforcement running
✅ /ip hotspot user profile has 5 profiles
✅ /system scheduler shows 2 tasks (enforce, expiry)
✅ Router stable, no errors in logs
```

---

## 📞 IF YOU GET STUCK

1. Read: **QUICK_START.md** (this solves 90% of issues)
2. Search: **TROUBLESHOOTING.md** for your exact problem
3. Check: `/log print tail=50` for error messages
4. Verify: All commands in "Verification Checklist"
5. Ask: On MikroTik forum with /export output

---

**Print this card. Keep it visible. You'll reference it often.**

**Estimated total deployment time: 15 minutes**

**Good luck! 🚀**
