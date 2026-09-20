#!/usr/bin/env bash
# Run on the Proxmox host. No remote curl | bash; inspect the downloaded checkout first.
set -Eeuo pipefail
trap 'echo "Abgebrochen in Zeile $LINENO. Vor Wiederholung den Containerzustand prüfen; es wird nichts automatisch gelöscht." >&2' ERR
[[ $EUID == 0 ]] || { echo 'Bitte als root auf dem Proxmox-Host ausführen.'; exit 1; }
command -v pct >/dev/null || { echo 'Dies ist kein Proxmox-Host.'; exit 1; }
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ -f "$script_dir/update.py" && -f "$script_dir/../assets/home-technik.conf" ]] || { echo 'Skill-Dateien fehlen. Vollständigen Skill herunterladen.'; exit 1; }
ask() {
  local value
  read -r -p "$2${3:+ [$3]}: " value
  printf -v "$1" '%s' "${value:-${3:-}}"
}
valid_name() { [[ $1 =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]]; }
number() { [[ $1 =~ ^[0-9]+$ ]] && (( 10#$1 >= $2 && 10#$1 <= $3 )); }
echo 'Home-Technik: neuen dedizierten, unprivilegierten LXC einrichten.'
echo 'App-Daten bleiben im Browser. Das Skript fragt vor dem Anlegen alle Einstellungen ab.'
pct list
pvesm status
ip -brief link
ask ctid 'Freie Container-ID'
number "$ctid" 100 999999999 || { echo 'Ungültige CT-ID'; exit 1; }
if pct status "$ctid" >/dev/null 2>&1; then echo 'CT-ID bereits belegt. Bestehender Container bleibt unverändert.'; exit 1; fi
ask hostname 'Container-Hostname' 'home-technik'
valid_name "$hostname" || exit 1
ask storage 'Storage für Container-Rootfs'
valid_name "$storage" || exit 1
ask template_storage 'Storage für Templates'
valid_name "$template_storage" || exit 1
pveam list "$template_storage"
echo 'Falls kein Debian-Template vorhanden ist: abbrechen, pveam update/available/download verwenden, dann erneut starten.'
ask template 'Vollständige Volume-ID eines vorhandenen Debian-Templates (aus obiger Liste)'
[[ $template == "$template_storage":vztmpl/debian-* && $template != *'..'* && $template != *','* && $template != *' '* ]] || { echo 'Debian-Template aus gewähltem Storage erforderlich'; exit 1; }
pvesm path "$template" >/dev/null
ask bridge 'Netzwerk-Bridge' 'vmbr0'
valid_name "$bridge" && ip link show "$bridge" >/dev/null || exit 1
ask vlan 'VLAN-ID (leer = ungetaggt)'
[[ -z $vlan ]] || number "$vlan" 1 4094 || exit 1
ask address 'IPv4/CIDR oder dhcp' 'dhcp'
gateway=''
if [[ $address != dhcp ]]; then
  ask gateway 'IPv4-Gateway'
  python3 -c 'import ipaddress,sys; ipaddress.IPv4Interface(sys.argv[1]); ipaddress.IPv4Address(sys.argv[2])' "$address" "$gateway"
fi
ask dns 'DNS-Server (leer = Proxmox-Vorgabe)'
if [[ -n $dns ]]; then python3 -c 'import ipaddress,sys; ipaddress.ip_address(sys.argv[1])' "$dns"; fi
ask cores 'CPU-Kerne' '1'
ask memory 'RAM in MB' '512'
ask disk 'Disk in GB' '4'
number "$cores" 1 128 && number "$memory" 256 1048576 && number "$disk" 2 1048576 || { echo 'Ressourcenwerte ungültig'; exit 1; }
ask public_url 'Dauerhafte Browser-Adresse (leer = zunächst Container-IP)'
if [[ -n $public_url ]]; then
  python3 -c 'from urllib.parse import urlsplit; import sys; u=urlsplit(sys.argv[1]); assert u.scheme in ("http","https") and u.hostname and not u.username and not u.password and u.path in ("", "/") and not u.query and not u.fragment' "$public_url"
fi
read -r -s -p 'Update-Passwort (mindestens 12 Zeichen, leer = sicher erzeugen): ' update_password
printf '\n'
if [[ -z $update_password ]]; then
  update_password=$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')
else
  [[ ${#update_password} -ge 12 && ${#update_password} -le 1024 ]] || { echo 'Passwortlänge ungültig'; exit 1; }
  read -r -s -p 'Update-Passwort wiederholen: ' password_repeat
  printf '\n'
  [[ $update_password == "$password_repeat" ]] || { echo 'Passwörter stimmen nicht überein'; exit 1; }
fi
net="name=eth0,bridge=$bridge,ip=$address,firewall=1"
[[ -z $gateway ]] || net+=",gw=$gateway"
[[ -z $vlan ]] || net+=",tag=$vlan"
printf '\nCT %s (%s), %s GB auf %s, %s CPU, %s MB RAM\nTemplate: %s\nNetz: %s\nDNS: %s\nAdresse: %s\n' "$ctid" "$hostname" "$disk" "$storage" "$cores" "$memory" "$template" "$net" "${dns:-Hostvorgabe}" "${public_url:-Container-IP}"
echo 'Ein vorhandener Reverse Proxy/TLS wird nicht geändert. Proxmox-Firewall muss HTTP aus dem Heimnetz erlauben.'
ask confirm 'Diesen neuen Container anlegen und neuestes Release installieren? Bitte ja eingeben'
[[ $confirm == ja ]] || { echo 'Abgebrochen ohne Änderungen.'; exit 0; }
options=(--hostname "$hostname" --unprivileged 1 --cores "$cores" --memory "$memory" --swap 256 --rootfs "$storage:$disk" --net0 "$net" --onboot 1)
[[ -z $dns ]] || options+=(--nameserver "$dns")
pct create "$ctid" "$template" "${options[@]}"
pct start "$ctid"
# Bounded network readiness check; no repeated package installation on unknown failures.
for attempt in {1..15}; do
  if pct exec "$ctid" -- getent hosts deb.debian.org >/dev/null 2>&1; then break; fi
  if [[ $attempt == 15 ]]; then echo 'Container-Netz/DNS noch nicht erreichbar'; exit 1; fi
  sleep 2
done
pct exec "$ctid" -- bash -c 'set -e; apt-get update; DEBIAN_FRONTEND=noninteractive apt-get install -y nginx python3 ca-certificates; install -d -m 755 /opt/home-technik /var/lib/home-technik /var/www/home-technik'
pct push "$ctid" "$script_dir/update.py" /opt/home-technik/update.py --perms 0755
pct push "$ctid" "$script_dir/../assets/home-technik.conf" /etc/nginx/sites-available/home-technik
pct exec "$ctid" -- bash -c 'set -e; test ! -e /usr/local/bin/Update; test ! -L /usr/local/bin/Update; test -L /etc/nginx/sites-enabled/default; test "$(readlink /etc/nginx/sites-enabled/default)" = /etc/nginx/sites-available/default; unlink /etc/nginx/sites-enabled/default; ln -s /etc/nginx/sites-available/home-technik /etc/nginx/sites-enabled/home-technik; ln -s /opt/home-technik/update.py /usr/local/bin/Update; touch /var/lib/home-technik/managed; nginx -t'
pct exec "$ctid" -- /usr/local/bin/Update --yes
pct push "$ctid" "$script_dir/update_api.py" /opt/home-technik/update_api.py --perms 0755
pct push "$ctid" "$script_dir/../assets/home-technik-update.service" /etc/systemd/system/home-technik-update.service
printf '%s' "$update_password" | pct exec "$ctid" -- python3 -c 'import hashlib,json,secrets,sys,os; salt=secrets.token_bytes(32); value={"salt":salt.hex(),"hash":hashlib.pbkdf2_hmac("sha256",sys.stdin.read().encode(),salt,600000).hex()}; path="/var/lib/home-technik/update-auth.json"; fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600); os.write(fd,json.dumps(value).encode()); os.close(fd)'
pct exec "$ctid" -- bash -c 'systemctl daemon-reload && systemctl enable --now home-technik-update.service'
pct exec "$ctid" -- hostname -I
printf '\nInstallation abgeschlossen. Browser-Adresse: %s\nUpdate im LXC: Update\nVom Host zuerst: pct enter %s\nNur prüfen: Update --check\nZurücksetzen: Update --rollback\n' "${public_url:-http://CONTAINER-IP/ (siehe oben)}" "$ctid"
echo 'Bei DHCP jetzt eine feste Reservierung setzen. JSON-Projektdatei an der neuen Browseradresse importieren.'
printf 'Update-Passwort für die App (sicher aufbewahren): %s\n' "$update_password"
unset update_password password_repeat
