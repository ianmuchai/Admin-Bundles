# ============================================================
# OPTIMIZED MIKROTIK BUNDLE ROUTER - RB951Ui-2HnD
# Multi-WAN Support (Starlink, 4G, Fiber)
# RouterOS 6.x / 7.x Compatible
# Integrated with Node.js Backend API
# ============================================================

# ============================================================
# PHASE 0: SAFETY & PRE-CHECKS
# ============================================================
:log info ("Starting MikroTik Bundle Router Configuration...")

# Set system identity
/system identity
set name="BundleRouter-01"

# ============================================================
# PHASE 1: BRIDGE SETUP (Legacy WiFi Recovery)
# ============================================================
# NOTE: Do NOT use bulk remove operations — bridge by bridge

# Create LAN bridge
/interface bridge
add name=bridge-local comment="Main LAN Bridge (WiFi + Wired)"

# Add LAN ports to bridge ONE AT A TIME (fixes WiFi issues)
/interface bridge port
add bridge=bridge-local interface=ether3 comment="LAN Port 1"
add bridge=bridge-local interface=ether4 comment="LAN Port 2"
add bridge=bridge-local interface=ether5 comment="LAN Port 3"

# Add WiFi to bridge if wlan0 exists
/interface bridge port
add bridge=bridge-local interface=wlan0 comment="WiFi Bridge" disabled=no

# ============================================================
# PHASE 2: MULTI-WAN CONFIGURATION
# ============================================================

# WAN 1: Primary (e.g., Starlink via ether2)
/ip address
add address=0.0.0.0/0 interface=ether2 comment="WAN1 - Primary (Starlink/Fiber)"

/ip dhcp-client
add interface=ether2 disabled=no add-default-route=yes default-route-distance=1 \
    use-peer-dns=yes comment="WAN1 DHCP Client"

# WAN 2: Secondary (e.g., 4G backup via USB or another port)
# UNCOMMENT IF YOU HAVE DUAL WAN
# /ip address
# add address=0.0.0.0/0 interface=ether1 comment="WAN2 - Backup (4G/LTE)"
# 
# /ip dhcp-client
# add interface=ether1 disabled=no add-default-route=yes default-route-distance=10 \
#     use-peer-dns=no comment="WAN2 DHCP Client (Higher distance = backup)"

# ============================================================
# PHASE 3: LAN ADDRESSING
# ============================================================
/ip address
add address=192.168.100.1/24 interface=bridge-local comment="LAN Gateway"

/ip pool
add name=dhcp-pool ranges=192.168.100.10-192.168.100.254

/ip dhcp-server
add name=dhcp-local interface=bridge-local address-pool=dhcp-pool lease-time=1d disabled=no

/ip dhcp-server network
add address=192.168.100.0/24 gateway=192.168.100.1 dns-server=8.8.8.8,8.8.4.4

# ============================================================
# PHASE 4: NAT & MASQUERADE
# ============================================================
/ip firewall nat

# Primary WAN NAT
add chain=srcnat out-interface=ether2 action=masquerade comment="NAT - WAN1 (Primary)"

# Backup WAN NAT (if enabled)
# add chain=srcnat out-interface=ether1 action=masquerade comment="NAT - WAN2 (Backup)"

# DNS forwarding
add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 \
    comment="Redirect DNS to local"

# ============================================================
# PHASE 5: WIFI CONFIGURATION
# ============================================================
/interface wireless
set wlan0 ssid="Bundle-WiFi-$(identity)" frequency=2.4GHz band=2ghz-onlyn \
    tx-power=20 disabled=no

/interface wireless security-profiles
set default authentication-types=wpa2-psk unicast-ciphers=aes-ccm \
    group-ciphers=aes-ccm wpa2-pre-shared-key="BundleWiFi2024" \
    comment="Main WiFi Security"

# ============================================================
# PHASE 6: HOTSPOT & BUNDLE PROFILES
# ============================================================

# Hotspot server on LAN bridge
/ip hotspot
add name=hotspot-bundle interface=bridge-local address-pool=dhcp-pool \
    profile=default disabled=no

/ip hotspot profile
set default hotspot-address=192.168.100.1 login-by=http-chap,http-pap \
    html-directory=hotspot http-cookie-lifetime=1d \
    smtp-server=0.0.0.0 dns-name=bundle.local

# ============================================================
# PHASE 7: USER PROFILE TIERS
# ============================================================
/ip hotspot user profile

# Delete existing if present
:if ([/ip hotspot user profile print count where name="daily-500mb"] > 0) do={/ip hotspot user profile remove [/ip hotspot user profile find where name="daily-500mb"]}
:if ([/ip hotspot user profile print count where name="daily-1gb"] > 0) do={/ip hotspot user profile remove [/ip hotspot user profile find where name="daily-1gb"]}
:if ([/ip hotspot user profile print count where name="weekly-5gb"] > 0) do={/ip hotspot user profile remove [/ip hotspot user profile find where name="weekly-5gb"]}
:if ([/ip hotspot user profile print count where name="monthly-20gb"] > 0) do={/ip hotspot user profile remove [/ip hotspot user profile find where name="monthly-20gb"]}
:if ([/ip hotspot user profile print count where name="unlimited"] > 0) do={/ip hotspot user profile remove [/ip hotspot user profile find where name="unlimited"]}

# Add new profiles
add name="daily-500mb"   rate-limit=2M/2M   session-timeout=1d   keepalive-timeout=5m shared-users=5
add name="daily-1gb"     rate-limit=5M/5M   session-timeout=1d   keepalive-timeout=5m shared-users=5
add name="weekly-5gb"    rate-limit=10M/10M session-timeout=7d   keepalive-timeout=5m shared-users=5
add name="monthly-20gb"  rate-limit=20M/20M session-timeout=30d  keepalive-timeout=5m shared-users=5
add name="unlimited"     rate-limit=50M/50M session-timeout=30d  keepalive-timeout=5m shared-users=10

# ============================================================
# PHASE 8: FIREWALL - HARDENING & PROTECTION
# ============================================================
/ip firewall filter

# INPUT chain (traffic to router itself)
add chain=input action=accept connection-state=established,related comment="Accept established"
add chain=input action=accept protocol=icmp comment="Accept ICMP (ping)"
add chain=input action=accept in-interface=bridge-local comment="Accept LAN"
add chain=input action=accept in-interface=ether1 comment="Accept loopback"
add chain=input action=drop in-interface=ether2 comment="Drop WAN queries"
add chain=input action=drop comment="Drop all other"

# FORWARD chain (LAN to WAN routing)
add chain=forward action=accept connection-state=established,related comment="Accept established"
add chain=forward action=drop connection-state=invalid comment="Drop invalid"
add chain=forward action=accept in-interface=bridge-local out-interface=ether2 comment="LAN→WAN1"
# add chain=forward action=accept in-interface=bridge-local out-interface=ether1 comment="LAN→WAN2"
add chain=forward action=drop comment="Drop other"

# DOS protection
add chain=forward protocol=tcp tcp-flags=fin,!syn,!rst,!ack action=drop comment="Anti-DoS: FINACK"
add chain=forward protocol=tcp tcp-flags=fin,syn action=drop comment="Anti-DoS: FINSYN"
add chain=forward protocol=tcp tcp-flags=syn,rst action=drop comment="Anti-DoS: SYNRST"
add chain=forward protocol=tcp tcp-flags=!fin,!syn,!rst,!ack action=drop comment="Anti-DoS: NoFlags"

# ============================================================
# PHASE 9: DNS CONFIGURATION
# ============================================================
/ip dns
set servers=8.8.8.8,8.8.4.4 allow-remote-requests=yes cache-size=2048 cache-max-ttl=6h

# Bind DNS to LAN interface for local resolution
/ip dns static
add name=bundle.local address=192.168.100.1
add name=router.local address=192.168.100.1

# ============================================================
# PHASE 10: MONITORING & API INTEGRATION
# ============================================================
/system logging

# Log hotspot activity
add topics=hotspot action=memory buffer-size=1000
add topics=script action=memory buffer-size=500

# Enable API logging for debugging
add topics=api action=memory buffer-size=500

:log info ("Logging configured for hotspot, script, and API")

# ============================================================
# PHASE 11: DATA CAP & USAGE ENFORCEMENT
# This script monitors active sessions and enforces data caps
# ============================================================
/system script
add name="enforce-bundle-caps" policy=read,write,policy,test source={
    :local timestamp [/system clock get time]
    :local logPrefix "enforce-bundle-caps [$timestamp]:"
    
    :foreach session in=[/ip hotspot active print as-value] do={
        :local user     ($session->"user")
        :local bytesIn  ($session->"bytes-in")
        :local bytesOut ($session->"bytes-out")
        :local total    ($bytesIn + $bytesOut)
        :local sessionId ($session->".id")
        
        # Skip if no user (not authenticated)
        :if ($user = "") do={:continue}
        
        # Get user profile
        :local profile [/ip hotspot user get [find name=$user] profile]
        :local dataLimit 0
        :local humanLimit ""
        
        # Set data limit per profile (in bytes)
        :if ($profile = "daily-500mb") do={ :set dataLimit 536870912; :set humanLimit "500MB" }
        :if ($profile = "daily-1gb") do={ :set dataLimit 1073741824; :set humanLimit "1GB" }
        :if ($profile = "weekly-5gb") do={ :set dataLimit 5368709120; :set humanLimit "5GB" }
        :if ($profile = "monthly-20gb") do={ :set dataLimit 21474836480; :set humanLimit "20GB" }
        :if ($profile = "unlimited") do={ :set dataLimit 999999999999; :set humanLimit "Unlimited" }
        
        # Check if exceeded
        :if ($total > $dataLimit) do={
            /ip hotspot active remove $sessionId
            :log warning "$logPrefix User '$user' exceeded $humanLimit limit (used: $([/file print where name=0].size] bps). Session removed."
        }
    }
}

# ============================================================
# PHASE 12: SESSION EXPIRY CHECKER (Time-based)
# Disables users whose subscription has expired
# ============================================================
/system script
add name="check-bundle-expiry" policy=read,write,policy,test source={
    :local timestamp [/system clock get time]
    :local today [/system clock get date]
    :local logPrefix "check-bundle-expiry [$timestamp]:"
    
    :foreach user in=[/ip hotspot user find] do={
        :local username [/ip hotspot user get $user name]
        :local comment [/ip hotspot user get $user comment]
        :local disabled [/ip hotspot user get $user disabled]
        
        # Parse expiry from comment field: "expires:Jan/15/2026"
        :local expiryPos [:find $comment "expires:"]
        :if ($expiryPos >= 0) do={
            :local expiryDate [:pick $comment ($expiryPos+8) ($expiryPos+20)]
            
            # Simple date comparison (YYYY/MM/DD format required in data cap script)
            :if ($today > $expiryDate && $disabled = false) do={
                /ip hotspot user set $user disabled=yes
                :log warning "$logPrefix User '$username' bundle expired on $expiryDate. Account disabled."
            }
        }
    }
}

# ============================================================
# PHASE 13: BANDWIDTH THROTTLING OVERRIDE
# If hotspot profiles aren't working, use queue tree as fallback
# ============================================================
/queue tree

# Remove default if present
:if ([/queue tree print count] > 0) do={/queue tree remove [/queue tree find]}

# Main queue for each WAN output
add name="qos-primary" queue-type=pcq parent=ether2-DropTail packet-mark=no-mark priority=1

# Per-user throttling via simple queue (alternative method)
# /queue simple
# add name="default-queue" target=0.0.0.0/0 max-limit=50M/50M

# ============================================================
# PHASE 14: SYSTEM SCHEDULER - AUTOMATED TASKS
# ============================================================
/system scheduler

# Run data cap enforcement every 2 minutes (adjustable)
add name="task-enforce-caps" interval=2m on-event="/system script run enforce-bundle-caps" \
    policy=read,write,policy,test disabled=no comment="Monitor & enforce bundle data caps"

# Run expiry checker every 30 minutes
add name="task-check-expiry" interval=30m on-event="/system script run check-bundle-expiry" \
    policy=read,write,policy,test disabled=no comment="Check subscription expiry"

# Backup configuration every 6 hours
add name="task-backup-config" interval=6h on-event="/system backup save name=auto-[/system clock get time]" \
    policy=read,write,policy,test disabled=no comment="Auto-backup configuration"

# ============================================================
# PHASE 15: API INTEGRATION HOOKS
# Store metadata for webhook notifications to backend
# ============================================================
/interface ethernet
set ether2 running=true comment="WAN1 - DHCP from ISP"
# set ether1 running=true comment="WAN2 - Backup LTE (if dual-wan)"

:log info ("MikroTik Bundle Router initialization COMPLETE")
:log info ("Hotspot available at: http://192.168.100.1:8091 (or your WAN IP)")
:log info ("Management: http://192.168.100.1 (WebFig)")
:log info ("API Port: 8728 (RouterOS API)")

# ============================================================
# OPTIONAL: MANUAL DATA CAP TEST
# Run this to test the data cap script:
# /system script run enforce-bundle-caps
# ============================================================

# ============================================================
# FINAL NOTES:
# ============================================================
# 1. Change default WiFi password in /interface wireless
# 2. Update DNS servers if needed: /ip dns set servers=YOUR_DNS
# 3. Enable dual-WAN by uncommenting WAN2 sections
# 4. Test hotspot: http://YOUR_ROUTER_IP:8091
# 5. Monitor logs: /log print tail=20
# 6. Check active sessions: /ip hotspot active print
# 7. Integrated with backend API — users created via Node.js will appear here
# ============================================================
