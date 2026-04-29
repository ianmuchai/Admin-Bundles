# ============================================================
# CLEAN TEST SETUP - POST-RESET MIKROTIK BASELINE
# RouterOS 6.x / 7.x
# Purpose:
#   1. Bring up a stable LAN on ether2-ether5 + WiFi
#   2. Use ether1 strictly as WAN
#   3. Restore reliable Winbox/WebFig/SSH access from LAN
#   4. Prepare for ISP testing and backend testing
#
# PHYSICAL CABLING FOR THIS SCRIPT
#   ether1 = ISP / modem / ONT / Starlink
#   ether2 = laptop setup port
#   ether3-ether5 = extra LAN ports
#   power port = power only
#
# RUN ORDER
#   1. Keep laptop connected to ether2
#   2. Log in to router after reset
#   3. Paste this whole script
#   4. After it finishes, reconnect laptop if needed
#   5. Then plug ISP into ether1
# ============================================================

:put "=== STARTING CLEAN TEST SETUP ==="

# -----------------------------
# CONFIGURATION VALUES
# -----------------------------
:local routerName "BundleRouter-Test"
:local wanIf "ether1"
:local lanBridge "bridge-lan"
:local lanSubnet "172.20.50.0/24"
:local lanGateway "172.20.50.1"
:local lanIp "172.20.50.1/24"
:local poolStart "172.20.50.10"
:local poolEnd "172.20.50.254"
:local wifiSsid "Bundle-Test-WiFi"
:local wifiPassword "TestWiFi2026!"
:local adminPassword "AdminTest2026!"
:local apiUser "api-bundles"
:local apiPassword "ApiTest2026!"

# -----------------------------
# 0. IDENTITY + USERS
# -----------------------------
/system identity
set name=$routerName

/user
:if ([print count where name="admin"] > 0) do={
    set [find where name="admin"] password=$adminPassword
}
:if ([print count where name=$apiUser] = 0) do={
    add name=$apiUser password=$apiPassword group=full comment="Backend API user"
} else={
    set [find where name=$apiUser] password=$apiPassword group=full
}

# -----------------------------
# 1. CLEAN DEFAULT/OLD STATE
# -----------------------------
/ip dhcp-client
:foreach i in=[find] do={ remove $i }

/ip address
:foreach i in=[find] do={ remove $i }

/ip dhcp-server network
:foreach i in=[find] do={ remove $i }

/ip dhcp-server
:foreach i in=[find] do={ remove $i }

/ip pool
:foreach i in=[find] do={ remove $i }

/ip firewall nat
:foreach i in=[find] do={ remove $i }

/ip firewall filter
:foreach i in=[find] do={ remove $i }

/ip dns static
:foreach i in=[find where name="router.local"] do={ remove $i }
:foreach i in=[find where name="bundle.local"] do={ remove $i }

/interface list member
:foreach i in=[find] do={ remove $i }

# Reset services to a known test-safe baseline
/ip service
set telnet disabled=yes
set ftp disabled=yes
set www disabled=yes
set ssh disabled=no port=22 address=""
set api disabled=yes
set api-ssl disabled=no port=8729 address=""
set winbox address=""
set www-ssl disabled=no address="" tls-version=only-1.2

# -----------------------------
# 2. BRIDGE + LAN PORTS
# -----------------------------
/interface bridge
:if ([print count where name=$lanBridge] = 0) do={
    add name=$lanBridge comment="Main test LAN bridge"
}

/interface bridge port
:foreach i in=[find] do={ remove $i }
add bridge=$lanBridge interface=ether2 comment="Laptop setup LAN"
add bridge=$lanBridge interface=ether3 comment="LAN 2"
add bridge=$lanBridge interface=ether4 comment="LAN 3"
add bridge=$lanBridge interface=ether5 comment="LAN 4"

:if ([/interface print count where name="wlan1"] > 0) do={
    add bridge=$lanBridge interface=wlan1 comment="WiFi bridge"
}
:if ([/interface print count where name="wlan0"] > 0) do={
    add bridge=$lanBridge interface=wlan0 comment="WiFi bridge"
}

# -----------------------------
# 3. LAN ADDRESSING + DHCP
# -----------------------------
/ip address
add address=$lanIp interface=$lanBridge comment="LAN Gateway"

/ip pool
add name="dhcp-pool" ranges=($poolStart . "-" . $poolEnd)

/ip dhcp-server
add name="dhcp-lan" interface=$lanBridge address-pool="dhcp-pool" lease-time=1d disabled=no

/ip dhcp-server network
add address=$lanSubnet gateway=$lanGateway dns-server=$lanGateway,8.8.8.8,1.1.1.1

# -----------------------------
# 4. WAN ON ETHER1 ONLY
# -----------------------------
/ip dhcp-client
add interface=$wanIf disabled=no add-default-route=yes default-route-distance=1 use-peer-dns=yes comment="WAN DHCP on ether1"

/ip firewall nat
add chain=srcnat out-interface=$wanIf action=masquerade comment="NAT to ISP via ether1"

# -----------------------------
# 5. DNS
# -----------------------------
/ip dns
set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes cache-size=2048KiB cache-max-ttl=6h

/ip dns static
add name="router.local" address=$lanGateway
add name="bundle.local" address=$lanGateway

# -----------------------------
# 6. WIFI
# -----------------------------
/interface wireless
:if ([print count where name="wlan1"] > 0) do={
    set wlan1 ssid=$wifiSsid band=2ghz-onlyn disabled=no
}
:if ([print count where name="wlan0"] > 0) do={
    set wlan0 ssid=$wifiSsid band=2ghz-onlyn disabled=no
}

/interface wireless security-profiles
set default authentication-types=wpa2-psk unicast-ciphers=aes-ccm group-ciphers=aes-ccm wpa2-pre-shared-key=$wifiPassword

# -----------------------------
# 7. INTERFACE LISTS
# -----------------------------
/interface list
:if ([print count where name="LAN"] = 0) do={ add name="LAN" comment="Local interfaces" }
:if ([print count where name="WAN"] = 0) do={ add name="WAN" comment="Internet uplink" }

/interface list member
add list="LAN" interface=$lanBridge
add list="WAN" interface=$wanIf

# -----------------------------
# 8. FIREWALL - SIMPLE TEST RULES
# Keep management open only from LAN for now
# -----------------------------
/ip firewall filter
add chain=input action=accept connection-state=established,related,untracked comment="Accept established"
add chain=input action=drop connection-state=invalid comment="Drop invalid"
add chain=input action=accept protocol=icmp comment="Allow ping"
add chain=input action=accept in-interface=$lanBridge comment="Allow LAN management"
add chain=input action=drop in-interface-list=!LAN comment="Drop non-LAN to router"

add chain=forward action=accept connection-state=established,related,untracked comment="Forward established"
add chain=forward action=drop connection-state=invalid comment="Forward invalid"
add chain=forward action=accept in-interface=$lanBridge out-interface=$wanIf comment="LAN to WAN"
add chain=forward action=drop connection-state=new connection-nat-state=!dstnat in-interface-list=WAN comment="Drop WAN not dstnat"

# -----------------------------
# 9. WINBOX + MAC DISCOVERY
# -----------------------------
/tool mac-server
set allowed-interface-list=LAN

/tool mac-server mac-winbox
set allowed-interface-list=LAN

/ip neighbor discovery-settings
set discover-interface-list=LAN

/ip service
set ssh address=$lanSubnet
set api-ssl address=$lanSubnet
set winbox address=$lanSubnet
set www-ssl address=$lanSubnet

# -----------------------------
# 10. OPTIONAL HOTSPOT BASE FOR NEXT TESTS
# -----------------------------
/ip hotspot
:if ([print count where name="hotspot-bundle"] = 0) do={
    add name="hotspot-bundle" interface=$lanBridge address-pool="dhcp-pool" profile=default disabled=no
}

/ip hotspot profile
set default hotspot-address=$lanGateway login-by=http-chap,http-pap html-directory=hotspot http-cookie-lifetime=1d dns-name=bundle.local

/ip hotspot user profile
:if ([print count where name="daily-1gb"] = 0) do={ add name="daily-1gb" rate-limit=5M/5M session-timeout=1d keepalive-timeout=5m shared-users=5 }
:if ([print count where name="weekly-5gb"] = 0) do={ add name="weekly-5gb" rate-limit=10M/10M session-timeout=7d keepalive-timeout=5m shared-users=5 }
:if ([print count where name="monthly-20gb"] = 0) do={ add name="monthly-20gb" rate-limit=20M/20M session-timeout=30d keepalive-timeout=5m shared-users=5 }
:if ([print count where name="unlimited"] = 0) do={ add name="unlimited" rate-limit=50M/50M session-timeout=30d keepalive-timeout=5m shared-users=10 }

# -----------------------------
# 11. PORT LABELS
# -----------------------------
/interface ethernet
set ether1 comment="WAN / ISP uplink"
set ether2 comment="LAN 1 / laptop setup"
set ether3 comment="LAN 2"
set ether4 comment="LAN 3"
set ether5 comment="LAN 4"

# -----------------------------
# 12. FINAL OUTPUT
# -----------------------------
:put "=== CLEAN TEST SETUP COMPLETE ==="
:put ("Router name: " . $routerName)
:put ("LAN gateway: " . $lanGateway)
:put ("Laptop should be on ether2 or WiFi SSID: " . $wifiSsid)
:put "ISP should now be plugged into ether1"
:put "Winbox/WebFig/SSH/API-SSL are LAN-only during testing"
:put "Reconnect laptop if it does not immediately pick up a 172.20.50.x address"
