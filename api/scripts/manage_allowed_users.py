"""CLI helper to manage allowed design portal users in Firestore:
  python scripts/manage_allowed_users.py add <email> [role]
  python scripts/manage_allowed_users.py list
  python scripts/manage_allowed_users.py remove <email>
  python scripts/manage_allowed_users.py set-password <email> <password>
"""

import sys
from pathlib import Path

# Insert parent directory so app packages can be imported
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import firebase_admin
from firebase_admin import auth as fb_auth
from google.cloud import firestore
from app.clients import db
from app.config import settings

if not firebase_admin._apps:
    firebase_admin.initialize_app(options={"projectId": settings.project})


def add_user(email: str, role: str = "designer"):
    email = email.strip().lower()
    if not email or "@" not in email:
        print(f"Error: Invalid email address: {email}")
        sys.exit(1)

    doc_ref = db().collection("allowed_users").document(email)
    doc_ref.set(
        {
            "email": email,
            "role": role,
            "enabled": True,
            "updated_at": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    print(f"Successfully added/enabled '{email}' (role={role}) in allowed_users.")


def remove_user(email: str):
    email = email.strip().lower()
    doc_ref = db().collection("allowed_users").document(email)
    snap = doc_ref.get()
    if not snap.exists:
        print(f"User '{email}' was not found in allowed_users.")
        return
    doc_ref.update({"enabled": False, "updated_at": firestore.SERVER_TIMESTAMP})
    print(f"Disabled access for '{email}' in allowed_users.")


def list_users():
    docs = db().collection("allowed_users").stream()
    found = False
    print("\n--- Approved Design Portal Users ---")
    for d in docs:
        found = True
        data = d.to_dict()
        status = "Active" if data.get("enabled", True) else "Disabled"
        role = data.get("role", "designer")
        print(f" • {data.get('email', d.id):<35} | Role: {role:<10} | Status: {status}")
    if not found:
        print(" (No allowed users found)")
    print("------------------------------------\n")


def set_password(email: str, password: str):
    email = email.strip().lower()
    if not email or "@" not in email:
        print(f"Error: Invalid email address: {email}")
        sys.exit(1)
    if len(password) < 6:
        print("Error: Password must be at least 6 characters long.")
        sys.exit(1)

    try:
        user = fb_auth.get_user_by_email(email)
        fb_auth.update_user(user.uid, password=password)
        print(f"Updated password for Firebase Auth user '{email}' (uid={user.uid}).")
    except fb_auth.UserNotFoundError:
        user = fb_auth.create_user(email=email, password=password)
        print(f"Created new Firebase Auth user '{email}' (uid={user.uid}) with specified password.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1].lower()
    if cmd == "list":
        list_users()
    elif cmd == "add":
        if len(sys.argv) < 3:
            print("Usage: python scripts/manage_allowed_users.py add <email> [role]")
            sys.exit(1)
        role = sys.argv[3] if len(sys.argv) > 3 else "designer"
        add_user(sys.argv[2], role)
    elif cmd == "remove":
        if len(sys.argv) < 3:
            print("Usage: python scripts/manage_allowed_users.py remove <email>")
            sys.exit(1)
        remove_user(sys.argv[2])
    elif cmd == "set-password":
        if len(sys.argv) < 4:
            print("Usage: python scripts/manage_allowed_users.py set-password <email> <password>")
            sys.exit(1)
        set_password(sys.argv[2], sys.argv[3])
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)
