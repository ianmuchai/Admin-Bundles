# ============================================================
# SIMPLE MIKROTIK SETUP - FAST DEPLOYMENT
# RouterOS 6.x / 7.x
# ether1 = WAN
# ether2-ether5 = LAN
# This version enables direct remote access from trusted IPs.
# ============================================================

# -----------------------------
# EDIT BEFORE RUNNING
# -----------------------------
:local routerName "BundleRouter-Simple"
:local wanInterface "ether1"
:local lanBridge "bridge-lan"
:local lanIp "172.20.88.1/24"
:local lanGateway "172.20.88.1"
:local lanSubnet "172.20.88.0/24"
:local dhcpRange "172.20.88.50-172.20.88.250"
:local wifiName "Bundle-WiFi"
:local wifiPassword "aqN%3HepT1T@v01Khqqr"
:local adminPassword "9TCQyEc9wvhti0x1APXiq07n"
:local apiUser "api-bundles"
:local apiPassword "0W0P9ZHLeEh15sEahW_eK-4M"
:local backendAllowedIp "203.0.113.10"
:local adminAllowedIp "198.51.100.20"
:local enableIpCloud true

:log info "Starting SIMPLE MikroTik setup"

# -----------------------------
# SYSTEM USERS
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
# LAN BRIDGE
# -----------------------------
/interface bridge
:if ([print count where name=$lanBridge] = 0) do={
    add name=$lanBridge comment="Main LAN bridge"
}

/interface bridge port
:if ([print count where interface="ether2" and bridge=$lanBridge] = 0) do={ add bridge=$lanBridge interface=ether2 comment="LAN 1 / setup port" }
:if ([print count where interface="ether3" and bridge=$lanBridge] = 0) do={ add bridge=$lanBridge interface=ether3 comment="LAN 2" }
:if ([print count where interface="ether4" and bridge=$lanBridge] = 0) do={ add bridge=$lanBridge interface=ether4 comment="LAN 3" }
:if ([print count where interface="ether5" and bridge=$lanBridge] = 0) do={ add bridge=$lanBridge interface=ether5 comment="LAN 4" }
:if ([/interface print count where name="wlan0"] > 0 && [print count where interface="wlan0" and bridge=$lanBridge] = 0) do={ add bridge=$lanBridge interface=wlan0 comment="WiFi bridge" }
:if ([/interface print count where name="wlan1"] > 0 && [print count where interface="wlan1" and bridge=$lanBridge] = 0) do={ add bridge=$lanBridge interface=wlan1 comment="WiFi bridge" }

# -----------------------------
# WAN INTERNET
# -----------------------------
/ip dhcp-client
:if ([print count where interface=$wanInterface] = 0) do={
    add interface=$wanInterface disabled=no add-default-route=yes default-route-distance=1 use-peer-dns=yes comment="WAN DHCP"
}

# -----------------------------
# LAN IP + DHCP
# -----------------------------
/ip address
:if ([print count where interface=$lanBridge and address=$lanIp] = 0) do={
    add address=$lanIp interface=$lanBridge comment="LAN gateway"
}

/ip pool
:if ([print count where name="dhcp-pool"] = 0) do={
    add name="dhcp-pool" ranges=$dhcpRange
}

/ip dhcp-server
:if ([print count where name="dhcp-lan"] = 0) do={
    add name="dhcp-lan" interface=$lanBridge address-pool="dhcp-pool" lease-time=1d disabled=no
}

/ip dhcp-server network
:if ([print count where address=$lanSubnet] = 0) do={
    add address=$lanSubnet gateway=$lanGateway dns-server=$lanGateway,8.8.8.8,1.1.1.1
}

# -----------------------------
# NAT + DNS
# -----------------------------
/ip firewall nat
:if ([print count where chain="srcnat" and out-interface=$wanInterface and action="masquerade"] = 0) do={
    add chain=srcnat out-interface=$wanInterface action=masquerade comment="WAN masquerade"
}
:if ([print count where chain="dstnat" and protocol="udp" and dst-port="53"] = 0) do={
    add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="Redirect DNS to router"
}

/ip dns
set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes cache-size=2048KiB

/ip dns static
:if ([print count where name="router.local"] = 0) do={ add name="router.local" address=$lanGateway }
:if ([print count where name="bundle.local"] = 0) do={ add name="bundle.local" address=$lanGateway }

# -----------------------------
# WIFI
# -----------------------------
/interface wireless
:if ([print count where name="wlan0"] > 0) do={
    set wlan0 ssid=$wifiName band=2ghz-onlyn disabled=no
}
:if ([print count where name="wlan1"] > 0) do={
    set wlan1 ssid=$wifiName band=2ghz-onlyn disabled=no
}

/interface wireless security-profiles
set default authentication-types=wpa2-psk unicast-ciphers=aes-ccm group-ciphers=aes-ccm wpa2-pre-shared-key=$wifiPassword

# -----------------------------
# HOTSPOT BASE
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
# REMOTE ACCESS - SIMPLE
# -----------------------------
/ip cloud
:if ($enableIpCloud = true) do={ set ddns-enabled=yes update-time=yes }

/ip firewall address-list
:if ([print count where list="mgmt-allow" and address=$lanSubnet] = 0) do={ add list="mgmt-allow" address=$lanSubnet comment="LAN management" }
:if ([print count where list="mgmt-allow" and address=$backendAllowedIp] = 0) do={ add list="mgmt-allow" address=$backendAllowedIp comment="Backend public IP" }
:if ([print count where list="mgmt-allow" and address=$adminAllowedIp] = 0) do={ add list="mgmt-allow" address=$adminAllowedIp comment="Admin public IP" }

/ip firewall filter
:if ([print count where comment="Accept established"] = 0) do={ add chain=input action=accept connection-state=established,related comment="Accept established" }
:if ([print count where comment="Accept ICMP"] = 0) do={ add chain=input action=accept protocol=icmp comment="Accept ICMP" }
:if ([print count where comment="Accept LAN"] = 0) do={ add chain=input action=accept in-interface=$lanBridge comment="Accept LAN" }
:if ([print count where comment="Allow trusted remote admin"] = 0) do={ add chain=input action=accept protocol=tcp src-address-list=mgmt-allow in-interface=$wanInterface dst-port=8291,443,22,8729 comment="Allow trusted remote admin" }
:if ([print count where comment="Drop WAN input"] = 0) do={ add chain=input action=drop in-interface=$wanInterface comment="Drop WAN input" }

:if ([print count where comment="Forward established"] = 0) do={ add chain=forward action=accept connection-state=established,related comment="Forward established" }
:if ([print count where comment="Forward invalid drop"] = 0) do={ add chain=forward action=drop connection-state=invalid comment="Forward invalid drop" }
:if ([print count where comment="LAN to WAN"] = 0) do={ add chain=forward action=accept in-interface=$lanBridge out-interface=$wanInterface comment="LAN to WAN" }
:if ([print count where comment="Forward drop rest"] = 0) do={ add chain=forward action=drop comment="Forward drop rest" }

/ip service
set telnet disabled=yes
set ftp disabled=yes
set www disabled=yes
set ssh disabled=no port=22 address=($lanSubnet . "," . $adminAllowedIp)
set api disabled=yes
set api-ssl disabled=no port=8729 address=($lanSubnet . "," . $backendAllowedIp)
set winbox address=($lanSubnet . "," . $adminAllowedIp)
set www-ssl disabled=no address=($lanSubnet . "," . $adminAllowedIp) tls-version=only-1.2

/interface ethernet
set ether1 comment="WAN / ISP uplink"
set ether2 comment="LAN 1 / laptop setup"
set ether3 comment="LAN 2"
set ether4 comment="LAN 3"
set ether5 comment="LAN 4"

:log info "SIMPLE MikroTik setup complete"
:log info ("Router LAN IP: " . $lanGateway)
:log info "WAN is ether1, LAN is ether2-ether5"
:log info "Remote ports: 8291 WinBox, 443 WebFig, 22 SSH, 8729 API-SSL"
:if ($enableIpCloud = true) do={ :log info "Run /ip cloud print to view DDNS hostname" }
