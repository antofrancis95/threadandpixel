from dataclasses import replace
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.auth import User, check_user_allowed
from app.config import settings
from app.main import app

ACTIVE_AUTH_SETTINGS = replace(settings, auth_disabled=False)

def test_check_user_allowed_anonymous():
    anon = User(uid="anon123", role=None, is_anonymous=True)
    with patch("app.auth.settings", ACTIVE_AUTH_SETTINGS):
        with pytest.raises(HTTPException) as exc:
            check_user_allowed(anon)
        assert exc.value.status_code == 403
        assert "Anonymous" in exc.value.detail

def test_check_user_allowed_no_email():
    u = User(uid="u123", role=None, email=None, is_anonymous=False)
    with patch("app.auth.settings", ACTIVE_AUTH_SETTINGS):
        with pytest.raises(HTTPException) as exc:
            check_user_allowed(u)
        assert exc.value.status_code == 403

def test_check_user_allowed_factory_role():
    factory_user = User(uid="f123", role="factory", email="factory@atelier.com", is_anonymous=False)
    with patch("app.auth.settings", ACTIVE_AUTH_SETTINGS):
        # Should return cleanly without raising
        check_user_allowed(factory_user)

def test_check_user_allowed_firestore():
    allowed_user = User(uid="u123", role=None, email="designer@atelier.com", is_anonymous=False)
    
    mock_db = MagicMock()
    mock_doc = MagicMock()
    mock_snap = MagicMock()
    mock_snap.exists = True
    mock_snap.to_dict.return_value = {"enabled": True, "role": "designer"}
    mock_doc.get.return_value = mock_snap
    mock_db.collection.return_value.document.return_value = mock_doc

    with patch("app.auth.settings", ACTIVE_AUTH_SETTINGS), patch("app.clients.db", return_value=mock_db):
        check_user_allowed(allowed_user)

def test_check_user_allowed_disabled():
    disabled_user = User(uid="u123", role=None, email="former@atelier.com", is_anonymous=False)
    
    mock_db = MagicMock()
    mock_doc = MagicMock()
    mock_snap = MagicMock()
    mock_snap.exists = True
    mock_snap.to_dict.return_value = {"enabled": False}
    mock_doc.get.return_value = mock_snap
    mock_db.collection.return_value.document.return_value = mock_doc

    with patch("app.auth.settings", ACTIVE_AUTH_SETTINGS), patch("app.clients.db", return_value=mock_db):
        with pytest.raises(HTTPException) as exc:
            check_user_allowed(disabled_user)
        assert exc.value.status_code == 403

def test_auth_check_endpoint():
    client = TestClient(app)
    
    with patch("app.main.settings", ACTIVE_AUTH_SETTINGS), patch("app.auth.settings", ACTIVE_AUTH_SETTINGS):
        # 1. Unauthenticated (no token)
        res_no_token = client.get("/auth/check")
        assert res_no_token.status_code == 200
        assert res_no_token.json()["allowed"] is False
        assert res_no_token.json()["authenticated"] is False

        # 2. Anonymous user
        anon_user = User(uid="anon123", role=None, is_anonymous=True)
        with patch("app.main.verify_token", return_value=anon_user):
            res_anon = client.get("/auth/check", headers={"Authorization": "Bearer fake_anon_token"})
            assert res_anon.status_code == 200
            assert res_anon.json()["allowed"] is False
            assert res_anon.json()["authenticated"] is True
            assert "Anonymous" in res_anon.json()["reason"]

        # 3. Allowed user from Firestore
        allowed_user = User(uid="des123", role=None, email="afdev11cp@gmail.com", is_anonymous=False)
        mock_db = MagicMock()
        mock_doc = MagicMock()
        mock_snap = MagicMock()
        mock_snap.exists = True
        mock_snap.to_dict.return_value = {"enabled": True, "role": "admin"}
        mock_doc.get.return_value = mock_snap
        mock_db.collection.return_value.document.return_value = mock_doc

        with patch("app.main.verify_token", return_value=allowed_user), patch("app.main.db", return_value=mock_db):
            res_allowed = client.get("/auth/check", headers={"Authorization": "Bearer fake_token"})
            assert res_allowed.status_code == 200
            data = res_allowed.json()
            assert data["allowed"] is True
            assert data["email"] == "afdev11cp@gmail.com"
            assert data["role"] == "admin"
            assert data["authenticated"] is True

        # 4. Denied user (not in allowlist)
        denied_user = User(uid="stranger456", role=None, email="stranger@example.com", is_anonymous=False)
        mock_snap_missing = MagicMock()
        mock_snap_missing.exists = False
        mock_doc.get.return_value = mock_snap_missing

        with patch("app.main.verify_token", return_value=denied_user), patch("app.main.db", return_value=mock_db):
            res_denied = client.get("/auth/check", headers={"Authorization": "Bearer fake_token"})
            assert res_denied.status_code == 200
            data = res_denied.json()
            assert data["allowed"] is False
            assert data["authenticated"] is True
            assert "not in the approved design portal list" in data["reason"]
