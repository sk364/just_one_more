import pytest
from django.urls import reverse
from conftest import UserFactory


@pytest.mark.django_db
class TestRegister:
    url = "/api/v1/auth/register/"

    def test_register_creates_user_and_returns_tokens(self, api_client):
        resp = api_client.post(self.url, {
            "email": "new@example.com",
            "display_name": "New User",
            "password": "Secure123!",
            "password2": "Secure123!",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access" in data
        assert "refresh" in data
        assert data["user"]["email"] == "new@example.com"

    def test_register_rejects_mismatched_passwords(self, api_client):
        resp = api_client.post(self.url, {
            "email": "new@example.com",
            "display_name": "New User",
            "password": "Secure123!",
            "password2": "Wrong123!",
        })
        assert resp.status_code == 400

    def test_register_rejects_duplicate_email(self, api_client, user):
        resp = api_client.post(self.url, {
            "email": user.email,
            "display_name": "Dup",
            "password": "Secure123!",
            "password2": "Secure123!",
        })
        assert resp.status_code == 400

    def test_register_rejects_missing_fields(self, api_client):
        resp = api_client.post(self.url, {"email": "x@example.com"})
        assert resp.status_code == 400


@pytest.mark.django_db
class TestLogin:
    url = "/api/v1/auth/login/"

    def test_login_returns_tokens(self, api_client, user):
        resp = api_client.post(self.url, {"email": user.email, "password": "Password123"})
        assert resp.status_code == 200
        assert "access" in resp.json()
        assert "user" in resp.json()

    def test_login_wrong_password(self, api_client, user):
        resp = api_client.post(self.url, {"email": user.email, "password": "wrong"})
        assert resp.status_code == 401

    def test_login_unknown_email(self, api_client):
        resp = api_client.post(self.url, {"email": "nobody@x.com", "password": "Password123"})
        assert resp.status_code == 401


@pytest.mark.django_db
class TestMe:
    url = "/api/v1/auth/me/"

    def test_get_profile(self, auth_client, user):
        resp = auth_client.get(self.url)
        assert resp.status_code == 200
        assert resp.json()["email"] == user.email

    def test_update_display_name(self, auth_client):
        resp = auth_client.patch(self.url, {"display_name": "Updated Name"})
        assert resp.status_code == 200
        assert resp.json()["display_name"] == "Updated Name"

    def test_unauthenticated_returns_401(self, api_client):
        resp = api_client.get(self.url)
        assert resp.status_code == 401


@pytest.mark.django_db
class TestChangePassword:
    url = "/api/v1/auth/password/change/"

    def test_change_password_success(self, auth_client):
        resp = auth_client.post(self.url, {
            "old_password": "Password123",
            "new_password": "NewPass456!",
        })
        assert resp.status_code == 200

    def test_change_password_wrong_old(self, auth_client):
        resp = auth_client.post(self.url, {
            "old_password": "wrongold",
            "new_password": "NewPass456!",
        })
        assert resp.status_code == 400

    def test_change_password_requires_auth(self, api_client):
        resp = api_client.post(self.url, {
            "old_password": "Password123",
            "new_password": "New456!",
        })
        assert resp.status_code == 401
