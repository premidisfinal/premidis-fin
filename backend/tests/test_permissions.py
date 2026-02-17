"""
Test suite for Dynamic Permissions System
- POST /api/permissions/scan - Generate permissions from COMPREHENSIVE_PERMISSIONS
- GET /api/permissions/structure - Get permissions structure by module
- GET /api/permissions/roles - Get all roles with permissions
- GET /api/permissions/roles/{role_name} - Get specific role permissions
- PUT /api/permissions/roles/{role_name} - Update role permissions
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"


class TestPermissionsBackend:
    """Test suite for Permissions API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate as admin
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_01_auth_works(self):
        """Test that authentication is working"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print("✅ Admin authentication working")
        
    def test_02_scan_permissions(self):
        """Test POST /api/permissions/scan - Generate permissions"""
        response = self.session.post(f"{BASE_URL}/api/permissions/scan")
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "total_permissions" in data
        assert "total_modules" in data
        assert "roles_initialized" in data
        
        # Verify reasonable numbers
        assert data["total_permissions"] > 0, "Should have generated permissions"
        assert data["total_modules"] == 11, f"Expected 11 modules, got {data['total_modules']}"
        assert data["roles_initialized"] == 4, f"Expected 4 roles, got {data['roles_initialized']}"
        
        print(f"✅ Scan successful: {data['total_permissions']} permissions in {data['total_modules']} modules")
        
    def test_03_get_permissions_structure(self):
        """Test GET /api/permissions/structure - Get permissions grouped by module"""
        response = self.session.get(f"{BASE_URL}/api/permissions/structure")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "modules" in data
        modules = data["modules"]
        
        # Should have 11 modules
        assert len(modules) == 11, f"Expected 11 modules, got {len(modules)}"
        
        # Verify module structure
        expected_modules = [
            "dashboard", "communication", "gestion_personnel", "conges",
            "comportement", "documents", "sites", "departements",
            "notifications", "permissions", "parametres"
        ]
        
        module_names = [m["module"] for m in modules]
        for expected in expected_modules:
            assert expected in module_names, f"Missing module: {expected}"
        
        # Verify each module has required fields
        for module in modules:
            assert "module" in module
            assert "label" in module
            assert "icon" in module
            assert "permissions" in module
            assert isinstance(module["permissions"], list)
            
            # Verify permission structure
            for perm in module["permissions"]:
                assert "key" in perm
                assert "label" in perm
                assert "action" in perm
                assert "full_path" in perm
                assert "." in perm["full_path"], "full_path should be module.permission format"
        
        print(f"✅ Permissions structure returned with {len(modules)} modules")
        
    def test_04_list_all_roles(self):
        """Test GET /api/permissions/roles - Get all roles with permissions"""
        response = self.session.get(f"{BASE_URL}/api/permissions/roles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "roles" in data
        roles = data["roles"]
        
        # Should have 4 roles: super_admin, admin, secretary, employee
        assert len(roles) >= 4, f"Expected at least 4 roles, got {len(roles)}"
        
        role_names = [r["role"] for r in roles]
        expected_roles = ["super_admin", "admin", "secretary", "employee"]
        for expected in expected_roles:
            assert expected in role_names, f"Missing role: {expected}"
        
        # Verify role structure
        for role in roles:
            assert "role" in role
            assert "label" in role
            assert "description" in role
            assert "permissions" in role
            assert isinstance(role["permissions"], list)
        
        print(f"✅ Roles listed: {role_names}")
        
    def test_05_get_super_admin_permissions(self):
        """Test GET /api/permissions/roles/super_admin - Should have wildcard permission"""
        response = self.session.get(f"{BASE_URL}/api/permissions/roles/super_admin")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["role"] == "super_admin"
        assert data["label"] == "Super Administrateur"
        
        # Super admin should have wildcard permission
        permissions = data["permissions"]
        assert "*" in permissions, "super_admin should have wildcard (*) permission"
        
        print("✅ Super admin has wildcard permission (*)")
        
    def test_06_get_admin_permissions(self):
        """Test GET /api/permissions/roles/admin - Should have detailed permissions"""
        response = self.session.get(f"{BASE_URL}/api/permissions/roles/admin")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["role"] == "admin"
        assert data["label"] == "Administrateur"
        
        permissions = data["permissions"]
        assert len(permissions) > 20, f"Admin should have many permissions, got {len(permissions)}"
        
        # Check some expected permissions
        expected_perms = [
            "dashboard.view_dashboard",
            "gestion_personnel.view_employees",
            "conges.approve_leave",
            "permissions.view_permissions"
        ]
        for perm in expected_perms:
            assert perm in permissions, f"Admin missing permission: {perm}"
        
        print(f"✅ Admin has {len(permissions)} permissions")
        
    def test_07_get_secretary_permissions(self):
        """Test GET /api/permissions/roles/secretary"""
        response = self.session.get(f"{BASE_URL}/api/permissions/roles/secretary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["role"] == "secretary"
        assert data["label"] == "Secrétaire"
        
        permissions = data["permissions"]
        # Secretary should not have admin-only permissions
        assert "conges.approve_leave" not in permissions, "Secretary should not approve leaves"
        assert "permissions.edit_role_permissions" not in permissions, "Secretary should not edit permissions"
        
        print(f"✅ Secretary has {len(permissions)} permissions (correctly restricted)")
        
    def test_08_get_employee_permissions(self):
        """Test GET /api/permissions/roles/employee"""
        response = self.session.get(f"{BASE_URL}/api/permissions/roles/employee")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["role"] == "employee"
        assert data["label"] == "Employé"
        
        permissions = data["permissions"]
        # Employee should have limited permissions
        assert "dashboard.view_dashboard" in permissions
        assert "conges.view_own_leaves" in permissions
        assert "conges.create_leave" in permissions
        
        # Employee should not have management permissions
        assert "gestion_personnel.create_employee" not in permissions
        assert "conges.approve_leave" not in permissions
        
        print(f"✅ Employee has {len(permissions)} permissions (limited access)")
        
    def test_09_get_nonexistent_role(self):
        """Test GET /api/permissions/roles/nonexistent - Should return 404"""
        response = self.session.get(f"{BASE_URL}/api/permissions/roles/nonexistent_role_xyz")
        assert response.status_code == 404, f"Expected 404 for non-existent role, got {response.status_code}"
        print("✅ Non-existent role returns 404")
        
    def test_10_update_role_permissions(self):
        """Test PUT /api/permissions/roles/{role_name} - Update secretary permissions"""
        # First get current secretary permissions
        response = self.session.get(f"{BASE_URL}/api/permissions/roles/secretary")
        assert response.status_code == 200
        original_permissions = response.json()["permissions"]
        
        # Add a new permission temporarily
        new_permissions = original_permissions.copy()
        test_permission = "comportement.edit_behavior"
        if test_permission not in new_permissions:
            new_permissions.append(test_permission)
        
        # Update permissions
        update_response = self.session.put(
            f"{BASE_URL}/api/permissions/roles/secretary",
            json={"permissions": new_permissions}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify update - response contains "role" object with permissions
        updated_data = update_response.json()
        assert "role" in updated_data, "Response should contain 'role' object"
        assert test_permission in updated_data["role"]["permissions"], "New permission should be added"
        
        # Restore original permissions
        restore_response = self.session.put(
            f"{BASE_URL}/api/permissions/roles/secretary",
            json={"permissions": original_permissions}
        )
        assert restore_response.status_code == 200, "Should restore original permissions"
        
        print("✅ Role permissions update works correctly")
        
    def test_11_update_nonexistent_role(self):
        """Test PUT /api/permissions/roles/nonexistent - Should return 404"""
        response = self.session.put(
            f"{BASE_URL}/api/permissions/roles/nonexistent_role_xyz",
            json={"permissions": ["some.permission"]}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent role, got {response.status_code}"
        print("✅ Update non-existent role returns 404")
        
    def test_12_list_all_permissions(self):
        """Test GET /api/permissions - List all permissions from catalog"""
        response = self.session.get(f"{BASE_URL}/api/permissions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "permissions" in data
        
        permissions = data["permissions"]
        # After scan, should have permissions
        if permissions:
            assert data.get("total", len(permissions)) > 0
            # Verify permission structure
            for perm in permissions[:5]:  # Check first 5
                assert "module" in perm
                assert "key" in perm
                assert "label" in perm
        
        print(f"✅ Listed {len(permissions)} permissions from catalog")


class TestPermissionsEdgeCases:
    """Edge cases and error handling tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate as admin
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_unauthorized_access(self):
        """Test that unauthenticated requests are rejected"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try to access permissions without auth
        response = session.get(f"{BASE_URL}/api/permissions/structure")
        assert response.status_code == 403 or response.status_code == 401, \
            f"Expected 401/403 for unauthenticated request, got {response.status_code}"
        
        print("✅ Unauthorized access correctly rejected")
        
    def test_empty_permissions_update(self):
        """Test updating with empty permissions array"""
        # Get current employee permissions
        response = self.session.get(f"{BASE_URL}/api/permissions/roles/employee")
        assert response.status_code == 200
        original_permissions = response.json()["permissions"]
        
        # Update with empty array (should work)
        update_response = self.session.put(
            f"{BASE_URL}/api/permissions/roles/employee",
            json={"permissions": []}
        )
        assert update_response.status_code == 200
        
        # Verify empty
        verify_response = self.session.get(f"{BASE_URL}/api/permissions/roles/employee")
        assert verify_response.json()["permissions"] == []
        
        # Restore
        self.session.put(
            f"{BASE_URL}/api/permissions/roles/employee",
            json={"permissions": original_permissions}
        )
        
        print("✅ Empty permissions update works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
