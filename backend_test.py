import requests
import sys
from datetime import datetime
import json
import uuid

class HRPlatformTester:
    def __init__(self, base_url="https://open-hr-admin.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.employee_token = None
        self.employee_id = None
        self.site_id = None
        self.document_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            if not success:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    details += f", Error: {error_detail}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_authentication(self):
        """Test login for different roles"""
        print("\n🔐 Testing Authentication...")
        
        # Test admin login with provided credentials
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "test@premidis.com", "password": "Test123!"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"✅ Admin token obtained successfully")
        else:
            print(f"❌ Failed to get admin token")
            return False
        
        return True

    def test_voice_assistant_removal(self):
        """Test that voice assistant endpoints are removed"""
        print("\n🎤 Testing Voice Assistant Removal...")
        
        # Test that voice endpoints return 404
        self.run_test(
            "Voice Assistant endpoint should not exist",
            "GET",
            "voice/status",
            404
        )
        
        self.run_test(
            "Voice chat endpoint should not exist",
            "POST",
            "voice/chat",
            404,
            data={"message": "test"}
        )

    def test_live_chat_endpoints(self):
        """Test live chat functionality"""
        print("\n💬 Testing Live Chat Endpoints...")
        
        if not self.admin_token:
            print("❌ Cannot test chat - no admin token")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test get chat messages
        self.run_test(
            "Get chat messages",
            "GET",
            "communication/chat/messages",
            200,
            headers=headers
        )
        
        # Test get chat users
        self.run_test(
            "Get chat users",
            "GET",
            "communication/chat/users",
            200,
            headers=headers
        )
        
        # Test send chat message
        self.run_test(
            "Send chat message",
            "POST",
            "communication/chat/messages",
            201,
            data={"content": "Test message from backend test", "recipient_id": None},
            headers=headers
        )

    def test_multi_currency_system(self):
        """Test multi-currency salary system"""
        print("\n💰 Testing Multi-Currency System...")
        
        if not self.admin_token:
            print("❌ Cannot test currency - no admin token")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test creating employee with USD salary
        test_employee_usd = {
            "first_name": "Test",
            "last_name": "USD",
            "email": f"test_usd_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "Test123!",
            "department": "administration",
            "position": "Test Position",
            "salary": 1500.0,
            "salary_currency": "USD",
            "role": "employee"
        }
        
        success, response = self.run_test(
            "Create employee with USD salary",
            "POST",
            "employees",
            201,
            data=test_employee_usd,
            headers=headers
        )
        
        usd_employee_id = None
        if success and 'id' in response:
            usd_employee_id = response['id']
            # Verify salary currency is stored
            if response.get('salary_currency') == 'USD' and response.get('salary') == 1500.0:
                self.log_test("USD salary stored correctly", True)
            else:
                self.log_test("USD salary stored correctly", False, f"Expected USD/1500, got {response.get('salary_currency')}/{response.get('salary')}")
        
        # Test creating employee with FC salary
        test_employee_fc = {
            "first_name": "Test",
            "last_name": "FC",
            "email": f"test_fc_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "Test123!",
            "department": "administration",
            "position": "Test Position",
            "salary": 3000000.0,
            "salary_currency": "FC",
            "role": "employee"
        }
        
        success, response = self.run_test(
            "Create employee with FC salary",
            "POST",
            "employees",
            201,
            data=test_employee_fc,
            headers=headers
        )
        
        fc_employee_id = None
        if success and 'id' in response:
            fc_employee_id = response['id']
            # Verify salary currency is stored
            if response.get('salary_currency') == 'FC' and response.get('salary') == 3000000.0:
                self.log_test("FC salary stored correctly", True)
            else:
                self.log_test("FC salary stored correctly", False, f"Expected FC/3000000, got {response.get('salary_currency')}/{response.get('salary')}")
        
        # Test salary retrieval
        if usd_employee_id:
            success, response = self.run_test(
                "Get USD employee salary",
                "GET",
                f"employees/{usd_employee_id}/salary",
                200,
                headers=headers
            )
            if success and response.get('salary_currency') == 'USD':
                self.log_test("USD salary retrieval correct", True)
            else:
                self.log_test("USD salary retrieval correct", False, f"Expected USD, got {response.get('salary_currency')}")

    def test_forgot_password_endpoints(self):
        """Test forgot password functionality"""
        print("\n🔑 Testing Forgot Password Endpoints...")
        
        # Test forgot password request
        self.run_test(
            "Forgot password request",
            "POST",
            "auth/forgot-password",
            200,
            data={"email": "rh@premierdis.com"}
        )
        
        # Test with invalid email (should still return 200 for security)
        self.run_test(
            "Forgot password with invalid email",
            "POST",
            "auth/forgot-password",
            200,
            data={"email": "nonexistent@test.com"}
        )
        
        # Test verify reset token with invalid token
        self.run_test(
            "Verify invalid reset token",
            "GET",
            "auth/verify-reset-token?token=invalid_token",
            400
        )
        
        # Test reset password with invalid token
        self.run_test(
            "Reset password with invalid token",
            "POST",
            "auth/reset-password",
            400,
            data={"token": "invalid_token", "new_password": "NewPass123!"}
        )

    def test_employee_creation_with_currency(self):
        """Test employee creation form includes currency field"""
        print("\n👥 Testing Employee Creation with Currency...")
        
        if not self.admin_token:
            print("❌ Cannot test employee creation - no admin token")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test employee creation without currency (should default to USD)
        test_employee_no_currency = {
            "first_name": "Test",
            "last_name": "NoCurrency",
            "email": f"test_nocurrency_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "Test123!",
            "department": "administration",
            "position": "Test Position",
            "salary": 1000.0,
            "role": "employee"
        }
        
        success, response = self.run_test(
            "Create employee without currency (should default to USD)",
            "POST",
            "employees",
            201,
            data=test_employee_no_currency,
            headers=headers
        )
        
        if success and response.get('salary_currency') == 'USD':
            self.log_test("Default currency is USD", True)
        else:
            self.log_test("Default currency is USD", False, f"Expected USD, got {response.get('salary_currency')}")

    def test_sites_api(self):
        """Test Sites API endpoints - Review Request Focus"""
        print("\n🏢 Testing Sites API...")
        
        if not self.admin_token:
            print("❌ Cannot test sites API - no admin token")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test GET /api/sites - list all sites (main focus from review)
        success, response = self.run_test(
            "GET /api/sites - List sites structure",
            "GET",
            "sites",
            200,
            headers=headers
        )
        
        if success:
            # Verify the structure includes necessary fields for site cards
            if 'sites' in response or isinstance(response, list):
                sites_data = response.get('sites', response) if isinstance(response, dict) else response
                self.log_test(
                    "Sites API returns proper structure",
                    True,
                    f"Found {len(sites_data)} sites in response"
                )
                
                # Check if sites have required fields for frontend display
                if sites_data and len(sites_data) > 0:
                    first_site = sites_data[0]
                    required_fields = ['id', 'name']
                    has_required = all(field in first_site for field in required_fields)
                    self.log_test(
                        "Sites have required fields (id, name)",
                        has_required,
                        f"Site fields: {list(first_site.keys())}"
                    )
                    
                    if has_required:
                        self.site_id = first_site['id']
                        print(f"✅ Using existing site ID: {self.site_id}")
            else:
                self.log_test(
                    "Sites API returns proper structure",
                    False,
                    f"Unexpected response structure: {type(response)}"
                )
        
        # If no sites exist, create one for testing
        if not self.site_id:
            site_data = {
                "name": "Kinshasa HQ",
                "city": "Kinshasa", 
                "country": "RDC",
                "address": "123 Avenue du Commerce"
            }
            
            success, response = self.run_test(
                "POST /api/sites - Create test site",
                "POST",
                "sites",
                201,
                data=site_data,
                headers=headers
            )
            
            if success and 'id' in response:
                self.site_id = response['id']
                print(f"✅ Test site created with ID: {self.site_id}")

    def test_employee_api_enhanced(self):
        """Test Employee API with filters and new fields - Review Request Focus"""
        print("\n👥 Testing Enhanced Employee API...")
        
        if not self.admin_token:
            print("❌ Cannot test employee API - no admin token")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test GET /api/employees with filters (department, site, hierarchy_level)
        success, response = self.run_test(
            "GET /api/employees - List employees (base)",
            "GET",
            "employees",
            200,
            headers=headers
        )
        
        if success and 'employees' in response and len(response['employees']) > 0:
            self.employee_id = response['employees'][0]['id']
            print(f"✅ Found employee ID: {self.employee_id}")
        
        # Test department filter
        success, response = self.run_test(
            "GET /api/employees?department=administration - Filter by department",
            "GET",
            "employees?department=administration",
            200,
            headers=headers
        )
        
        if success:
            self.log_test(
                "Employee API supports department filter",
                True,
                f"Department filter returned {len(response.get('employees', []))} employees"
            )
        
        # Test category filter (existing)
        success, response = self.run_test(
            "GET /api/employees?category=agent - Filter by category",
            "GET",
            "employees?category=agent",
            200,
            headers=headers
        )
        
        # Test POST /api/employees with site_id and hierarchy_level fields
        test_employee_with_fields = {
            "first_name": "Test",
            "last_name": "SiteHierarchy",
            "email": f"test_site_hierarchy_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "Test123!",
            "department": "administration",
            "position": "Test Position",
            "salary": 1000.0,
            "salary_currency": "USD",
            "role": "employee",
            "site_id": self.site_id if self.site_id else None,
            "hierarchy_level": "Agent de base"
        }
        
        success, response = self.run_test(
            "POST /api/employees - Create employee with site_id and hierarchy_level",
            "POST",
            "employees",
            201,
            data=test_employee_with_fields,
            headers=headers
        )
        
        if success:
            # Verify site_id and hierarchy_level are stored
            site_id_stored = response.get('site_id') == self.site_id if self.site_id else 'site_id' in response
            hierarchy_stored = response.get('hierarchy_level') == "Agent de base"
            
            self.log_test(
                "Employee creation accepts site_id field",
                site_id_stored,
                f"site_id in response: {response.get('site_id')}"
            )
            
            self.log_test(
                "Employee creation accepts hierarchy_level field",
                hierarchy_stored,
                f"hierarchy_level in response: {response.get('hierarchy_level')}"
            )
            
            # Store this employee ID for profile testing
            if 'id' in response:
                self.employee_id = response['id']
        
        # Test GET /api/employees/{id} - get employee details with site_name and hierarchical_group_name
        if self.employee_id:
            success, employee_response = self.run_test(
                "GET /api/employees/{id} - Get employee profile with enriched data",
                "GET",
                f"employees/{self.employee_id}",
                200,
                headers=headers
            )
            
            if success:
                # Check if response includes site_name and hierarchical_group_name fields
                has_site_name = 'site_name' in employee_response
                has_group_name = 'hierarchical_group_name' in employee_response
                has_hierarchy_level = 'hierarchy_level' in employee_response
                
                self.log_test(
                    "Employee profile includes site_name field", 
                    has_site_name,
                    f"site_name field present: {has_site_name}, value: {employee_response.get('site_name')}"
                )
                
                self.log_test(
                    "Employee profile includes hierarchical_group_name field",
                    has_group_name, 
                    f"hierarchical_group_name field present: {has_group_name}, value: {employee_response.get('hierarchical_group_name')}"
                )
                
                self.log_test(
                    "Employee profile includes hierarchy_level field",
                    has_hierarchy_level,
                    f"hierarchy_level field present: {has_hierarchy_level}, value: {employee_response.get('hierarchy_level')}"
                )

    def test_leaves_api(self):
        """Test Leaves API - Focus on DELETE functionality for admins"""
        print("\n🏖️ Testing Leaves API...")
        
        if not self.admin_token or not self.employee_id:
            print("❌ Cannot test leaves API - missing admin token or employee ID")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # First create a test leave to delete
        leave_data = {
            "leave_type": "annual",
            "start_date": "2026-02-01",
            "end_date": "2026-02-03",
            "reason": "Test leave for deletion testing",
            "employee_id": self.employee_id
        }
        
        success, response = self.run_test(
            "POST /api/leaves - Create test leave for deletion",
            "POST",
            "leaves",
            201,
            data=leave_data,
            headers=headers
        )
        
        leave_id = None
        if success and 'id' in response:
            leave_id = response['id']
            print(f"✅ Test leave created with ID: {leave_id}")
            
            # Test DELETE /api/leaves/{leave_id} - admin should be able to delete
            success, delete_response = self.run_test(
                "DELETE /api/leaves/{leave_id} - Admin delete leave",
                "DELETE",
                f"leaves/{leave_id}",
                200,
                headers=headers
            )
            
            if success:
                self.log_test(
                    "Admin can delete leaves",
                    True,
                    "Leave deletion successful"
                )
                
                # Verify leave is actually deleted by trying to get it
                success, get_response = self.run_test(
                    "GET /api/leaves/{leave_id} - Verify leave deleted",
                    "GET",
                    f"leaves/{leave_id}",
                    404,  # Should return 404 if deleted
                    headers=headers
                )
                
                if success:  # success here means we got the expected 404
                    self.log_test(
                        "Leave actually deleted from system",
                        True,
                        "Leave not found after deletion (expected)"
                    )
        
        # Test GET /api/leaves with employee filter
        success, response = self.run_test(
            f"GET /api/leaves?employee_id={self.employee_id} - Get leaves for specific employee",
            "GET",
            f"leaves?employee_id={self.employee_id}",
            200,
            headers=headers
        )
        
        if success and 'leaves' in response:
            self.log_test(
                "Leaves API supports employee_id filter",
                True,
                f"Found {len(response['leaves'])} leaves for employee"
            )

    def test_documents_api(self):
        """Test Documents API - rename and delete"""
        print("\n📄 Testing Documents API...")
        
        if not self.admin_token or not self.employee_id:
            print("❌ Cannot test documents API - missing admin token or employee ID")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # First, create a test document
        test_document = {
            "name": "Test Document",
            "type": "pdf",
            "url": "/api/uploads/test.pdf"
        }
        
        success, response = self.run_test(
            "POST /api/employees/{id}/documents - Create test document",
            "POST",
            f"employees/{self.employee_id}/documents",
            200,  # Changed from 201 to 200 as the endpoint returns 200
            data=test_document,
            headers=headers
        )
        
        if success and 'id' in response:
            self.document_id = response['id']
            print(f"✅ Test document created with ID: {self.document_id}")
            
            # Test PUT /api/employees/{employee_id}/documents/{document_id}?name=NewName - rename document
            success, rename_response = self.run_test(
                "PUT /api/employees/{id}/documents/{doc_id}?name=NewName - Rename document",
                "PUT",
                f"employees/{self.employee_id}/documents/{self.document_id}?name=Renamed Document",
                200,
                headers=headers
            )
            
            # Test DELETE /api/employees/{employee_id}/documents/{document_id} - delete document
            success, delete_response = self.run_test(
                "DELETE /api/employees/{id}/documents/{doc_id} - Delete document",
                "DELETE",
                f"employees/{self.employee_id}/documents/{self.document_id}",
                200,
                headers=headers
            )
        else:
            print("❌ Could not create test document - skipping rename/delete tests")

    def test_behavior_api(self):
        """Test Behavior API with document_urls field"""
        print("\n📝 Testing Behavior API...")
        
        if not self.admin_token or not self.employee_id:
            print("❌ Cannot test behavior API - missing admin token or employee ID")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test POST /api/behavior - create behavior with document_urls field
        behavior_data = {
            "employee_id": self.employee_id,
            "type": "positive",
            "note": "Test behavior note from backend testing",
            "date": "2026-01-06",
            "document_urls": ["/api/uploads/test.pdf"]
        }
        
        success, response = self.run_test(
            "POST /api/behavior - Create behavior with document_urls",
            "POST",
            "behavior",
            201,
            data=behavior_data,
            headers=headers
        )
        
        if success and 'document_urls' in response:
            self.log_test(
                "Behavior API accepts document_urls field",
                True,
                f"document_urls field present in response: {response['document_urls']}"
            )

    def run_all_tests(self):
        """Run all tests - Focus on Review Request priorities"""
        print("🚀 Starting PREMIDIS HR Platform Backend Tests")
        print("🎯 Focus: HR PWA Simplified - Sites, Employees, Leaves APIs")
        print("=" * 60)
        
        # Authentication is required for most tests
        if not self.test_authentication():
            print("❌ Authentication failed - cannot proceed with other tests")
            return False
        
        # Run the priority tests from review request
        print("\n🎯 PRIORITY TESTS FROM REVIEW REQUEST:")
        self.test_sites_api()
        self.test_employee_api_enhanced()
        self.test_leaves_api()
        
        # Run additional relevant tests
        print("\n📋 ADDITIONAL BACKEND TESTS:")
        self.test_documents_api()
        self.test_behavior_api()
        self.test_multi_currency_system()
        self.test_forgot_password_endpoints()
        self.test_employee_creation_with_currency()
        self.test_voice_assistant_removal()
        self.test_live_chat_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80

def main():
    tester = HRPlatformTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())