import urllib.request
import json
import sys

# Fix encoding for Windows terminal
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

base_url = "https://gzgaming-production.up.railway.app"

print("=" * 55)
print("  GAME ZONE --- TEST DE CONECTIVIDAD CON RAILWAY")
print("=" * 55)

endpoints = {
    "PCs":      "/api/pcs",
    "Usuarios": "/api/users",
    "Planes":   "/api/plans",
    "Ofertas":  "/api/offers",
}

for name, path in endpoints.items():
    url = base_url + path
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "GameZone-Test"})
        res = urllib.request.urlopen(req, timeout=6)
        data = json.loads(res.read().decode())
        print(f"\n[OK] {name} ({len(data)} registros)")
        if name == "PCs":
            for pc in data:
                print(f"   -> {pc['id']} | {pc['pcName']} | Status: {pc['status']}")
        elif name == "Usuarios":
            for u in data:
                print(f"   -> {u['username']} | Rol: {u['role']} | Estado: {u['status']}")
    except urllib.error.HTTPError as e:
        print(f"\n[FAIL] {name} --- HTTP {e.code}: {e.reason}")
    except Exception as e:
        print(f"\n[FAIL] {name} --- Error: {e}")

print("\n" + "=" * 55)
print("  TEST COMPLETADO")
print("=" * 55)
