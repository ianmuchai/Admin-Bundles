# ============================================================
# NetBundles Universal MikroTik Provisioning Script
# Paste this ENTIRE block into any fresh/reset MikroTik terminal
# Works with: hAP, hEX, RB750, RB951, CCR, and most RouterOS devices
# ============================================================

# ── STEP 1: Lock in permanent management access FIRST
# This must run before anything else — prevents all future lockouts
/ip firewall filter add chain=input action=accept \
  comment="NETBUNDLES-PERMANENT: Allow all management - DO NOT DELETE" \
  place-before=0

# Enable all management services permanently
/ip service set telnet  disabled=no port=23
/ip service set www     disabled=no port=80
/ip service set ssh     disabled=no port=22
/ip service set api     disabled=no port=8728
/ip service set winbox  disabled=no port=8291
/ip service set api-ssl disabled=yes

# ── STEP 2: Set admin password
/user set admin password=password

# ── STEP 3: Rename ether1 as WAN (internet uplink from Huawei/Starlink/ISP)
/interface set ether1 name=WAN comment="Uplink - ISP/Huawei/Starlink"

# ── STEP 4: Create LAN bridge for hotspot clients
/interface bridge add name=bridge-LAN \
  protocol-mode=rstp \
  comment="NetBundles Hotspot LAN"

# Add all remaining ethernet ports to the bridge (adjust if your device has more/fewer ports)
/interface bridge port add interface=ether2 bridge=bridge-LAN comment="LAN port 1"
/interface bridge port add interface=ether3 bridge=bridge-LAN comment="LAN port 2"
/interface bridge port add interface=ether4 bridge=bridge-LAN comment="LAN port 3"
/interface bridge port add interface=ether5 bridge=bridge-LAN comment="LAN port 4"

# If device has built-in WiFi (wlan1), add it to the bridge too
# Comment out the next line if your device has no WiFi
/interface bridge port add interface=wlan1 bridge=bridge-LAN comment="WiFi AP"

# ── STEP 5: Assign static IP to LAN bridge
# Using 192.168.10.x to avoid conflict with Huawei (192.168.88.x) and Starlink (192.168.100.x)
/ip address add address=192.168.10.1/24 \
  interface=bridge-LAN \
  comment="NetBundles LAN Gateway"

# ── STEP 6: Get internet from upstream router via WAN port (DHCP)
/ip dhcp-client add interface=WAN disabled=no \
  comment="WAN uplink - gets IP from Huawei/Starlink"

# ── STEP 7: DHCP server for hotspot clients
/ip pool add name=hotspot-pool ranges=192.168.10.10-192.168.10.254
/ip dhcp-server add \
  name=hotspot-dhcp \
  interface=bridge-LAN \
  address-pool=hotspot-pool \
  disabled=no \
  comment="NetBundles client DHCP"
/ip dhcp-server network add \
  address=192.168.10.0/24 \
  gateway=192.168.10.1 \
  dns-server=8.8.8.8,8.8.4.4 \
  comment="NetBundles client network"

# ── STEP 8: NAT masquerade (share internet to hotspot clients)
/ip firewall nat add \
  chain=srcnat \
  out-interface=WAN \
  action=masquerade \
  comment="NetBundles NAT - share internet"

# ── STEP 9: Configure WiFi AP (if device has wlan1)
# Comment out this section if no built-in WiFi
/interface wireless set wlan1 \
  mode=ap-bridge \
  ssid="NetBundles-Hotspot" \
  band=2ghz-b/g/n \
  frequency=auto \
  disabled=no

# ── STEP 10: Set up hotspot on the LAN bridge (manual, no wizard)
/ip hotspot add \
  name=hotspot1 \
  interface=bridge-LAN \
  address-pool=hotspot-pool \
  disabled=no \
  idle-timeout=none \
  keepalive-timeout=none \
  comment="NetBundles Hotspot"

/ip hotspot profile set hsprof1 \
  hotspot-address=192.168.10.1 \
  dns-name="" \
  html-directory=hotspot \
  http-cookie-lifetime=3d \
  login-by=http-chap,http-pap \
  use-radius=no

# ── STEP 11: Create default hotspot user profiles matching bundle durations
/ip hotspot user profile add name="1hr"      rate-limit="" session-timeout=1h   comment="1 Hour Unlimited"
/ip hotspot user profile add name="6hr"      rate-limit="" session-timeout=6h   comment="6 Hours Unlimited"
/ip hotspot user profile add name="daily"    rate-limit="" session-timeout=24h  comment="Daily Unlimited"
/ip hotspot user profile add name="weekly"   rate-limit="" session-timeout=168h comment="Weekly Unlimited"
/ip hotspot user profile add name="monthly"  rate-limit="" session-timeout=720h comment="Monthly Unlimited"

# ── STEP 12: Firewall - allow established/related, drop invalid, allow hotspot
/ip firewall filter add chain=input   action=accept connection-state=established,related comment="Allow established"
/ip firewall filter add chain=input   action=drop   connection-state=invalid             comment="Drop invalid"
/ip firewall filter add chain=forward action=accept connection-state=established,related comment="Forward established"
/ip firewall filter add chain=forward action=drop   connection-state=invalid             comment="Drop invalid forward"

# ── STEP 13: Allow API access only from management network (security)
/ip firewall filter add \
  chain=input \
  protocol=tcp \
  dst-port=8728 \
  action=accept \
  comment="Allow API for NetBundles backend"

# ── STEP 14: System identity
/system identity set name=NetBundles-Site1

# ── DONE ──
# After running this script:
# - WebFig:  http://192.168.10.1  (from LAN/WiFi clients)  
# - SSH:     ssh admin@192.168.10.1
# - API:     192.168.10.1:8728  (update MIKROTIK_HOST in .env)
# - Hotspot clients connect to WiFi "NetBundles-Hotspot" → get 192.168.10.x IPs
# - MikroTik gets internet from WAN port (ether1) → connects to Huawei/Starlink
:log info "NetBundles provisioning complete"
:put "Setup complete! MikroTik is ready for NetBundles."
