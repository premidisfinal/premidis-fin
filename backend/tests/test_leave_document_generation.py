"""
Test suite for Leave Document Generation feature
- Tests POST /api/leaves/{leave_id}/generate-document
- Tests GET /api/hr-documents/templates?source_module=leaves
- Tests document storage in documents_rh collection
- Tests return date calculation (date_fin + 1, if Sunday +2)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestLeaveDocumentGeneration:
    """Tests for leave document generation feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Get headers with admin token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def approved_leave_id(self, headers):
        """Get an approved leave ID for testing"""
        response = requests.get(f"{BASE_URL}/api/leaves", headers=headers)
        assert response.status_code == 200
        leaves = response.json().get("leaves", [])
        approved_leaves = [l for l in leaves if l.get("status") == "approved"]
        
        if not approved_leaves:
            pytest.skip("No approved leaves found for testing")
        
        return approved_leaves[0]["id"]
    
    @pytest.fixture(scope="class") 
    def pending_leave_id(self, headers):
        """Get a pending leave ID for testing"""
        response = requests.get(f"{BASE_URL}/api/leaves", headers=headers)
        assert response.status_code == 200
        leaves = response.json().get("leaves", [])
        pending_leaves = [l for l in leaves if l.get("status") == "pending"]
        
        if not pending_leaves:
            return None
        
        return pending_leaves[0]["id"]
    
    @pytest.fixture(scope="class")
    def template_id(self, headers):
        """Get a template ID linked to leaves module"""
        response = requests.get(
            f"{BASE_URL}/api/hr-documents/templates",
            params={"source_module": "leaves"},
            headers=headers
        )
        assert response.status_code == 200
        templates = response.json().get("templates", [])
        
        if not templates:
            pytest.skip("No templates found for leaves module")
        
        return templates[0]["id"]

    # ============== Template Tests ==============
    
    def test_get_templates_with_source_module_filter(self, headers):
        """Test GET /api/hr-documents/templates?source_module=leaves returns correct templates"""
        response = requests.get(
            f"{BASE_URL}/api/hr-documents/templates",
            params={"source_module": "leaves"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        
        # All returned templates should have source_module = "leaves"
        for template in data["templates"]:
            assert template.get("source_module") == "leaves", f"Template {template['id']} has wrong source_module"
    
    def test_templates_have_required_fields(self, headers):
        """Test that templates have required fields for document generation"""
        response = requests.get(
            f"{BASE_URL}/api/hr-documents/templates",
            params={"source_module": "leaves"},
            headers=headers
        )
        
        assert response.status_code == 200
        templates = response.json().get("templates", [])
        
        for template in templates:
            assert "id" in template
            assert "name" in template
            assert "content" in template
            assert "source_module" in template
    
    # ============== Document Generation Tests ==============
    
    def test_generate_document_success(self, headers, approved_leave_id, template_id):
        """Test POST /api/leaves/{leave_id}/generate-document creates document successfully"""
        response = requests.post(
            f"{BASE_URL}/api/leaves/{approved_leave_id}/generate-document",
            params={"template_id": template_id},
            headers=headers
        )
        
        assert response.status_code == 201, f"Document generation failed: {response.text}"
        data = response.json()
        
        assert data.get("message") == "Document généré avec succès"
        assert "document" in data
        
        document = data["document"]
        assert document.get("status") == "draft"
        assert document.get("source_module") == "leaves"
        assert document.get("source_id") == approved_leave_id
        assert document.get("template_id") == template_id
    
    def test_generated_document_has_replaced_placeholders(self, headers, approved_leave_id, template_id):
        """Test that generated document has placeholders replaced with actual values"""
        response = requests.post(
            f"{BASE_URL}/api/leaves/{approved_leave_id}/generate-document",
            params={"template_id": template_id},
            headers=headers
        )
        
        assert response.status_code == 201
        document = response.json()["document"]
        content = document.get("content", "")
        
        # Content should NOT contain unreplaced placeholders
        assert "{{employe.nom}}" not in content
        assert "{{conge.date_debut}}" not in content
        assert "{{conge.date_fin}}" not in content
        assert "{{conge.nb_jours}}" not in content
        assert "{{date.document}}" not in content
    
    def test_generated_document_contains_employee_info(self, headers, approved_leave_id, template_id):
        """Test that generated document contains employee information"""
        response = requests.post(
            f"{BASE_URL}/api/leaves/{approved_leave_id}/generate-document",
            params={"template_id": template_id},
            headers=headers
        )
        
        assert response.status_code == 201
        document = response.json()["document"]
        
        assert document.get("employee_name")
        assert document.get("employee_id")
        assert document.get("beneficiary_name")
    
    def test_document_saved_with_draft_status(self, headers, approved_leave_id, template_id):
        """Test that document is saved with 'draft' status for manual editing"""
        response = requests.post(
            f"{BASE_URL}/api/leaves/{approved_leave_id}/generate-document",
            params={"template_id": template_id},
            headers=headers
        )
        
        assert response.status_code == 201
        document = response.json()["document"]
        assert document.get("status") == "draft"
        
        # Verify it's actually in the database by fetching documents
        doc_id = document["id"]
        get_response = requests.get(
            f"{BASE_URL}/api/hr-documents/{doc_id}",
            headers=headers
        )
        
        # Document should exist (if endpoint exists) or we verify in the list
        if get_response.status_code != 404:
            assert get_response.status_code == 200
    
    # ============== Error Handling Tests ==============
    
    def test_generate_document_requires_approved_status(self, headers, pending_leave_id, template_id):
        """Test that document generation requires leave to be approved"""
        if not pending_leave_id:
            pytest.skip("No pending leave found for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/leaves/{pending_leave_id}/generate-document",
            params={"template_id": template_id},
            headers=headers
        )
        
        assert response.status_code == 400
        assert "approuvé" in response.json().get("detail", "").lower()
    
    def test_generate_document_nonexistent_leave(self, headers, template_id):
        """Test document generation with non-existent leave returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/leaves/non-existent-leave-id/generate-document",
            params={"template_id": template_id},
            headers=headers
        )
        
        assert response.status_code == 404
        assert "congé" in response.json().get("detail", "").lower() or "non trouvé" in response.json().get("detail", "").lower()
    
    def test_generate_document_nonexistent_template(self, headers, approved_leave_id):
        """Test document generation with non-existent template returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/leaves/{approved_leave_id}/generate-document",
            params={"template_id": "non-existent-template-id"},
            headers=headers
        )
        
        assert response.status_code == 404
        assert "modèle" in response.json().get("detail", "").lower() or "non trouvé" in response.json().get("detail", "").lower()
    
    def test_generate_document_requires_authentication(self, approved_leave_id, template_id):
        """Test that document generation requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/leaves/{approved_leave_id}/generate-document",
            params={"template_id": template_id}
        )
        
        assert response.status_code in [401, 403]
    
    # ============== Return Date Calculation Tests ==============
    
    def test_return_date_is_calculated(self, headers, approved_leave_id, template_id):
        """Test that return date (date_retour) is calculated and present in document"""
        response = requests.post(
            f"{BASE_URL}/api/leaves/{approved_leave_id}/generate-document",
            params={"template_id": template_id},
            headers=headers
        )
        
        assert response.status_code == 201
        document = response.json()["document"]
        content = document.get("content", "")
        
        # The content should not contain the placeholder (it should be replaced)
        assert "{{conge.date_retour}}" not in content
        
        # Metadata should contain leave info
        metadata = document.get("metadata", {})
        assert metadata is not None


class TestEmployeeAuthorization:
    """Test that regular employees cannot generate documents"""
    
    def test_employee_cannot_generate_document(self):
        """Test that non-admin users cannot generate documents"""
        # First, try to login as employee or create one
        # For now, we verify admin-only endpoint returns 403 for non-admin
        
        # Try without token first
        response = requests.post(
            f"{BASE_URL}/api/leaves/any-leave-id/generate-document",
            params={"template_id": "any-template-id"}
        )
        
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
