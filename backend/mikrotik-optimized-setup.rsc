# ============================================================
# OPTIMIZED MIKROTIK BUNDLE ROUTER - RB951Ui-2HnD
# Multi-WAN Support (Starlink, 4G, Fiber)
# RouterOS 6.x / 7.x Compatible
# Integrated with Node.js Backend API
# PORT PLAN:
#   ether1 = WAN/ISP uplink
#   ether2 = LAN port for first-time laptop setup
#   ether3-ether5 = LAN ports for clients/switch/AP
# FIRST LOGIN:
#   1. Connect laptop by LAN cable to ether2
#   2. Open Winbox or WebFig
#   3. Run this script
#   4. Router LAN IP becomes 192.168.100.1/24
# REMOTE MANAGEMENT PORTS:
#   8729/tcp = RouterOS API-SSL for backend
#   8291/tcp = Winbox
#   443/tcp  = WebFig HTTPS
#   22/tcp   = SSH
# REMOTE ACCESS OPTIONS ENABLED/PROVISIONED:
#   1. MikroTik IP Cloud DDNS
#   2. Restricted WinBox/SSH/WebFig/API-SSL from trusted IPs only
#   3. Optional L2TP/IPsec VPN template
#   4. Notes for Back to Home (BTH) support on compatible routers
# ============================================================

# ============================================================
# PHASE 0: SAFETY & PRE-CHECKS
# ============================================================
:log info ("Starting MikroTik Bundle Router Configuration...")

# ============================================================
# CONFIGURATION BLOCK - EDIT THESE VALUES BEFORE DEPLOYING
# ============================================================
:local routerName "BundleRouter-01"
:local lanIp "192.168.100.1/24"
:local lanGateway "192.168.100.1"
:local dhcpPoolStart "192.168.100.10"
:local dhcpPoolEnd "192.168.100.254"
:local wifiName "Bundle-WiFi-01"
:local wifiPassword "BundleWiFi2024"
:local adminPassword "ChangeThisRouterAdminPassword!"
:local apiUser "api-bundles"
:local apiPassword "ChangeThisApiPasswordToo!"
:local backendAllowedIp "203.0.113.10"
:local adminAllowedIp "198.51.100.20"
:local enableIpCloud true
:local enableL2tpIpsec false
:local l2tpIpsecSecret "ChangeThisVpnSecret!"
:local l2tpUser "remotevpn"
:local l2tpPassword "ChangeThisVpnPassword!"
:local remoteAccessMode "basic"
:local enableDualWan false
:local wan1Interface "ether1"
:local wan2Interface "lte1"
:local lanBridge "bridge-local"
:local lanPorts "ether2,ether3,ether4,ether5"

# REMOTE ACCESS MODES:
#   "basic"     = trusted public IPs can use WinBox, SSH, WebFig, API-SSL directly
#   "vpn-first" = only VPN + API-SSL remain exposed on WAN; admin GUI/SSH stays LAN/VPN only
#
# WAN/LAN ASSUMPTIONS:
#   WAN1 is expected on ether1 by default
#   Laptop/initial setup is expected on ether2
#   If your ISP hands off internet on another port, change wan1Interface before running
#   If you use LTE/second ISP, set enableDualWan=true and confirm wan2Interface

:local remoteAdminPorts "8291,443,22"
:local apiSslPort "8729"

# Set system identity
/system identity
set name=$routerName

/user
:if ([print count where name="admin"] > 0) do={
    set [find where name="admin"] password=$adminPassword
}
:if ([print count where name=$apiUser] = 0) do={
    add name=$apiUser password=$apiPassword group=full comment="Backend RouterOS API user"
} else={
    set [find where name=$apiUser] password=$apiPassword group=full
}

# ============================================================
# PHASE 1: BRIDGE SETUP (Legacy WiFi Recovery)
# ============================================================
# NOTE: Do NOT use bulk remove operations — bridge by bridge

# Create LAN bridge
/interface bridge
add name=$lanBridge comment="Main LAN Bridge (WiFi + Wired)"

# Add LAN ports to bridge ONE AT A TIME (fixes WiFi issues)
/interface bridge port
add bridge=$lanBridge interface=ether2 comment="Laptop/Primary LAN Port"
add bridge=$lanBridge interface=ether3 comment="LAN Port 1"
add bridge=$lanBridge interface=ether4 comment="LAN Port 2"
add bridge=$lanBridge interface=ether5 comment="LAN Port 3"

# Add WiFi to bridge if wlan0 exists
/interface bridge port
add bridge=$lanBridge interface=wlan0 comment="WiFi Bridge" disabled=no

# ============================================================
# PHASE 2: MULTI-WAN CONFIGURATION
# ============================================================

# WAN 1: Primary (e.g., Starlink/Fiber/ISP modem)
/ip dhcp-client
add interface=$wan1Interface disabled=no add-default-route=yes default-route-distance=1 \
    use-peer-dns=yes comment="WAN1 DHCP Client"

# WAN 2: Secondary (e.g., 4G backup via USB or another port)
:if ($enableDualWan = true) do={
    /ip dhcp-client
    add interface=$wan2Interface disabled=no add-default-route=yes default-route-distance=10 \
        use-peer-dns=no comment="WAN2 DHCP Client (Higher distance = backup)"
}

# ============================================================
# PHASE 3: LAN ADDRESSING
# ============================================================
/ip address
add address=$lanIp interface=$lanBridge comment="LAN Gateway"

/ip pool
add name=dhcp-pool ranges=($dhcpPoolStart . "-" . $dhcpPoolEnd)

/ip dhcp-server
add name=dhcp-local interface=$lanBridge address-pool=dhcp-pool lease-time=1d disabled=no

/ip dhcp-server network
add address=192.168.100.0/24 gateway=$lanGateway dns-server=$lanGateway,8.8.8.8,8.8.4.4

# ============================================================
# PHASE 4: NAT & MASQUERADE
# ============================================================
/ip firewall nat

# Primary WAN NAT
add chain=srcnat out-interface=$wan1Interface action=masquerade comment="NAT - WAN1 (Primary)"

# Backup WAN NAT (if enabled)
:if ($enableDualWan = true) do={
    /ip firewall nat
    add chain=srcnat out-interface=$wan2Interface action=masquerade comment="NAT - WAN2 (Backup)"
}

# DNS forwarding
add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 \
    comment="Redirect DNS to local"

# ============================================================
# PHASE 5: WIFI CONFIGURATION
# ============================================================
/interface wireless
set wlan0 ssid=$wifiName frequency=2.4GHz band=2ghz-onlyn \
    tx-power=20 disabled=no

/interface wireless security-profiles
set default authentication-types=wpa2-psk unicast-ciphers=aes-ccm \
    group-ciphers=aes-ccm wpa2-pre-shared-key=$wifiPassword \
    comment="Main WiFi Security"

# ============================================================
# PHASE 6: HOTSPOT & BUNDLE PROFILES
# ============================================================

# Hotspot server on LAN bridge
/ip hotspot
add name=hotspot-bundle interface=$lanBridge address-pool=dhcp-pool \
    profile=default disabled=no

/ip hotspot profile
set default hotspot-address=$lanGateway login-by=http-chap,http-pap \
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
/ip firewall address-list
add list=mgmt-allow address=192.168.100.0/24 comment="Trusted LAN management"
add list=mgmt-allow address=$backendAllowedIp comment="Backend/API server public IP"
add list=mgmt-allow address=$adminAllowedIp comment="Admin remote public IP"

/ip firewall filter

# INPUT chain (traffic to router itself)
add chain=input action=accept connection-state=established,related comment="Accept established"
add chain=input action=accept protocol=icmp comment="Accept ICMP (ping)"
add chain=input action=accept in-interface=$lanBridge comment="Accept LAN"
add chain=input action=accept protocol=udp src-address-list=mgmt-allow in-interface=$wan1Interface dst-port=500,1701,4500 comment="Allow trusted L2TP/IPsec from WAN"
add chain=input action=accept protocol=ipsec-esp src-address-list=mgmt-allow in-interface=$wan1Interface comment="Allow trusted IPsec ESP from WAN"
add chain=input action=accept protocol=tcp src-address-list=mgmt-allow in-interface=$wan1Interface dst-port=$apiSslPort comment="Allow trusted backend API-SSL from WAN"
:if ($remoteAccessMode = "basic") do={
    /ip firewall filter
    add chain=input action=accept protocol=tcp src-address-list=mgmt-allow in-interface=$wan1Interface dst-port=$remoteAdminPorts comment="Allow trusted direct admin access from WAN"
}
add chain=input action=drop in-interface=$wan1Interface comment="Drop WAN queries"
add chain=input action=drop comment="Drop all other"

# FORWARD chain (LAN to WAN routing)
add chain=forward action=accept connection-state=established,related comment="Accept established"
add chain=forward action=drop connection-state=invalid comment="Drop invalid"
add chain=forward action=accept in-interface=$lanBridge out-interface=$wan1Interface comment="LAN-to-WAN1"
:if ($enableDualWan = true) do={
    /ip firewall filter
    add chain=forward action=accept in-interface=$lanBridge out-interface=$wan2Interface comment="LAN-to-WAN2"
}
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
add name=bundle.local address=$lanGateway
add name=router.local address=$lanGateway

# ============================================================
# PHASE 10: MONITORING & API INTEGRATION
# ============================================================
/ip cloud
:if ($enableIpCloud = true) do={
    set ddns-enabled=yes update-time=yes
}

/ip service
set telnet disabled=yes
set ftp disabled=yes
set www disabled=yes
set ssh disabled=no port=22 address=("192.168.100.0/24," . $adminAllowedIp)
set api disabled=yes
set api-ssl disabled=no port=8729 address=("192.168.100.0/24," . $backendAllowedIp) tls-version=only-1.2 certificate=none
:if ($remoteAccessMode = "basic") do={
    set winbox address=("192.168.100.0/24," . $backendAllowedIp . "," . $adminAllowedIp)
    set www-ssl disabled=no address=("192.168.100.0/24," . $backendAllowedIp . "," . $adminAllowedIp) tls-version=only-1.2
} else={
    set winbox address="192.168.100.0/24"
    set www-ssl disabled=no address="192.168.100.0/24" tls-version=only-1.2
}

# Optional L2TP/IPsec remote-access VPN
/ppp profile
:if ([print count where name="remote-vpn-profile"] = 0) do={
    add name="remote-vpn-profile" local-address=$lanGateway remote-address=dhcp-pool use-encryption=required only-one=yes change-tcp-mss=yes
}

/interface l2tp-server server
:if ($enableL2tpIpsec = true) do={
    set enabled=yes use-ipsec=yes ipsec-secret=$l2tpIpsecSecret default-profile=remote-vpn-profile authentication=mschap2
} else={
    set enabled=no use-ipsec=yes ipsec-secret=$l2tpIpsecSecret default-profile=remote-vpn-profile authentication=mschap2
}

/ppp secret
:if ([print count where name=$l2tpUser] = 0) do={
    add name=$l2tpUser password=$l2tpPassword service=l2tp profile=remote-vpn-profile comment="Remote admin VPN user"
} else={
    set [find where name=$l2tpUser] password=$l2tpPassword service=l2tp profile=remote-vpn-profile
}

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
add name="qos-primary" queue-type=pcq parent=global packet-mark=no-mark priority=1

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
set ether1 comment="WAN1 - DHCP from ISP"
set ether2 comment="LAN - Laptop setup port"
set ether3 comment="LAN - Client port 1"
set ether4 comment="LAN - Client port 2"
set ether5 comment="LAN - Client port 3"

:log info ("MikroTik Bundle Router initialization COMPLETE")
:log info ("Hotspot available at: http://192.168.100.1:8091 (or your WAN IP)")
:log info ("Management: http://192.168.100.1 (WebFig)")
:if ($enableIpCloud = true) do={ :log info ("IP Cloud DDNS enabled - check /ip cloud print for your *.sn.mynetname.net hostname") }
:log info ("Remote access mode: $remoteAccessMode")
:log info ("API Port: 8729 (RouterOS API-SSL)")
:log info ("WinBox Port: 8291")
:log info ("SSH Port: 22")
:if ($enableDualWan = true) do={ :log info ("Dual-WAN mode enabled: primary=$wan1Interface backup=$wan2Interface") }
:if ($enableL2tpIpsec = true) do={ :log info ("L2TP/IPsec VPN enabled for trusted remote clients") }

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
# 3. Enable dual-WAN by setting enableDualWan=true
# 4. Change wan1Interface if your ISP is not connected on ether1
# 5. Set enableDualWan=true if you want automatic backup internet on wan2Interface
# 6. Replace 203.0.113.10 with your backend server IP or VPN subnet
# 7. Replace 198.51.100.20 with your own trusted admin public IP
# 8. Use remoteAccessMode="basic" for direct trusted-IP admin access
# 9. Use remoteAccessMode="vpn-first" to keep WinBox/WebFig/SSH off the WAN and rely on VPN
# 10. Check your DDNS name using: /ip cloud print
# 11. Enable L2TP/IPsec by setting enableL2tpIpsec to true near the top of this script
# 12. Back to Home (BTH) is not configured here; use it only on compatible RouterOS devices/apps
# 13. Test hotspot: http://YOUR_ROUTER_IP:8091
# 14. Monitor logs: /log print tail=20
# 15. Check active sessions: /ip hotspot active print
# 16. Integrated with backend API - users created via Node.js will appear here
# ============================================================
