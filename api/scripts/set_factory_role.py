"""Grant the factory role to a Firebase user: python scripts/set_factory_role.py <uid>"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from firebase_admin import auth  # noqa: E402

import app.auth  # noqa: E402,F401  (initialises firebase_admin)

if len(sys.argv) != 2:
    sys.exit(__doc__)
auth.set_custom_user_claims(sys.argv[1], {"role": "factory"})
print(f"Granted role=factory to {sys.argv[1]}. The user must sign out/in to refresh their token.")
