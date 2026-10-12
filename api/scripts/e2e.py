"""End-to-end API walkthrough against a running server (start it with AUTH_DISABLED=true locally).

Usage: python scripts/e2e.py [base_url]
"""

import json
import sys
import time
import urllib.request
import uuid
from pathlib import Path

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
OUT = Path(__file__).resolve().parents[1] / "tmp"
OUT.mkdir(exist_ok=True)


def call(method: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{BASE}{path}", data=data, method=method,
                                 headers={"Content-Type": "application/json"} if data else {})
    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} -> {e.code}: {e.read().decode()}")


def save(url: str, name: str) -> None:
    (OUT / name).write_bytes(urllib.request.urlopen(url, timeout=60).read())
    print(f"   saved tmp/{name}")


def upload_person(image: bytes) -> str:
    boundary = uuid.uuid4().hex
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"consent\"\r\n\r\ntrue\r\n"
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"person.jpg\"\r\n"
        "Content-Type: image/jpeg\r\n\r\n"
    ).encode() + image + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(f"{BASE}/uploads/person", data=body, method="POST",
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)["upload_id"]
    except urllib.error.HTTPError as e:
        sys.exit(f"POST /uploads/person -> {e.code}: {e.read().decode()}")


print("0. health:", call("GET", "/healthz"))

print("1. catalog:", len(call("GET", "/catalog")["fabrics"]), "fabrics")

d = call("POST", "/designs", {"text": "I'm going to a summer wedding. I want a flowy maxi dress in pastel blue "
                                      "with floral embroidery on the hem."})
print("2. create:", d["design_id"], "v", d["version"], json.dumps(d["spec"]), "\n   reply:", d["reply"])
save(d["image_url"], "e2e-v1.png")
did = d["design_id"]

d = call("POST", f"/designs/{did}/messages", {"text": "Make the sleeves long and sheer."})
print("3. edit: v", d["version"], "sleeve:", d["spec"]["sleeve"], "\n   reply:", d["reply"])
save(d["image_url"], "e2e-v2.png")

f = call("POST", f"/designs/{did}/flats")
print("4. flats ok")
save(f["flats_url"], "e2e-flats.png")

person = urllib.request.urlopen(
    "https://storage.googleapis.com/cloud-samples-data/generative-ai/image/woman.jpeg", timeout=60).read()
upload_id = upload_person(person)
tr = call("POST", f"/designs/{did}/tryon", {"upload_id": upload_id})
print("4b. try-on ok")
save(tr["tryon_url"], "e2e-tryon.jpg")

job = call("POST", f"/designs/{did}/runway")
started = time.time()
while job["status"] == "running":
    time.sleep(8)
    job = call("GET", f"/jobs/{job['job_id']}")
if job["status"] != "done":
    sys.exit(f"runway failed: {job['error']}")
print(f"4c. runway ok in {time.time() - started:.0f}s")
save(job["video_url"], "e2e-runway.mp4")

t = call("POST", f"/designs/{did}/techpack", {"size": "M", "measurements": {"bust_cm": 88, "waist_cm": 70}})
q = t["quote"]
print(f"5. quote {t['quote_id']}: ${q['total']} {q['complexity']} {q['yardage']}yd "
      f"manufacturable={t['techpack']['manufacturable']} notes={len(t['techpack']['construction_notes'])} "
      f"issues={t['techpack']['issues']}")

o = call("POST", f"/designs/{did}/order", {"quote_id": t["quote_id"]})
print("6. order:", o["order_id"])

g = call("GET", f"/orders/{o['order_id']}")
print("7. order status:", g["status"], "image:", bool(g["image_url"]), "flats:", bool(g["flats_url"]),
      "tryon:", bool(g["tryon_url"]), "runway:", bool(g["runway_url"]))
print("E2E PASS")
