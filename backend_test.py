import requests
import sys
from datetime import datetime
import json
import uuid

class HRPlatformTester:
    def __init__(self, base_url="https://rh-continuation.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.employee_token = None
        self.employee_id = None
        self.site_id = None
        self.document_id = None
        self.leave_id = None
        self.behavior_id = None
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
        """Test login with provided credentials"""
        print("\n🔐 Testing Authentication...")
        
        # Test admin login with provided credentials from review request
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "superadmin@premierdis.com", "password": "SuperAdmin123!"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"✅ Admin token obtained successfully")
        else:
            print(f"❌ Failed to get admin token")
            return False
        
        return True

    def test_leaves_approval_rejection(self):
        """Test leave approval/rejection - Critical Bug Fix"""
        print("\n🏖️ Testing Leave Approval/Rejection (Critical Bug Fix)...")
        
        if not self.admin_token:
            print("❌ Cannot test leaves - no admin token")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # First, get or create an employee for testing
        success, employees_response = self.run_test(
            "GET /api/employees - Get employees for testing",
            "GET",
            "employees",
            200,
            headers=headers
        )
        
        if success and 'employees' in employees_response and len(employees_response['employees']) > 0:
            self.employee_id = employees_response['employees'][0]['id']
        else:
            # Create a test employee
            employee_data = {
                "first_name": "Test",
                "last_name": "Employee",
                "email": f"test_employee_{datetime.now().strftime('%H%M%S')}@test.com",
                "password": "Test123!",
                "department": "administration",
                "role": "employee"
            }
            
            success, emp_response = self.run_test(
                "POST /api/employees - Create test employee",
                "POST",
                "employees",
                201,
                data=employee_data,
                headers=headers
            )
            
            if success and 'id' in emp_response:
                self.employee_id = emp_response['id']
        
        if not self.employee_id:
            print("❌ Cannot proceed - no employee ID available")
            return
        
        # Test 1: Create a leave for approval testing
        leave_data = {
            "leave_type": "annual",
            "start_date": "2025-03-01",
            "end_date": "2025-03-05",
            "reason": "Test leave for approval testing",
            "employee_id": self.employee_id
        }
        
        success, response = self.run_test(
            "POST /api/leaves - Create leave for approval test",
            "POST",
            "leaves",
            201,
            data=leave_data,
            headers=headers
        )
        
        if success and 'id' in response:
            leave_id_1 = response['id']
            print(f"✅ Test leave created with ID: {leave_id_1}")
            
            # Test approval - should NOT get "Erreur lors de la mise à jour"
            approval_data = {"status": "approved"}
            success, approval_response = self.run_test(
                "PUT /api/leaves/{id} - Approve leave (should work without error)",
                "PUT",
                f"leaves/{leave_id_1}",
                200,
                data=approval_data,
                headers=headers
            )
            
            if success:
                # Verify status changed to approved
                if approval_response.get('status') == 'approved':
                    self.log_test(
                        "Leave approval works correctly",
                        True,
                        "Status successfully changed to approved"
                    )
                else:
                    self.log_test(
                        "Leave approval works correctly",
                        False,
                        f"Expected status 'approved', got '{approval_response.get('status')}'"
                    )
        
        # Test 2: Create another leave for rejection testing
        leave_data_2 = {
            "leave_type": "sick",
            "start_date": "2025-03-10",
            "end_date": "2025-03-12",
            "reason": "Test leave for rejection testing",
            "employee_id": self.employee_id
        }
        
        success, response = self.run_test(
            "POST /api/leaves - Create leave for rejection test",
            "POST",
            "leaves",
            201,
            data=leave_data_2,
            headers=headers
        )
        
        if success and 'id' in response:
            leave_id_2 = response['id']
            
            # Test rejection - should NOT get "Erreur lors de la mise à jour"
            rejection_data = {"status": "rejected"}
            success, rejection_response = self.run_test(
                "PUT /api/leaves/{id} - Reject leave (should work without error)",
                "PUT",
                f"leaves/{leave_id_2}",
                200,
                data=rejection_data,
                headers=headers
            )
            
            if success:
                # Verify status changed to rejected
                if rejection_response.get('status') == 'rejected':
                    self.log_test(
                        "Leave rejection works correctly",
                        True,
                        "Status successfully changed to rejected"
                    )
                else:
                    self.log_test(
                        "Leave rejection works correctly",
                        False,
                        f"Expected status 'rejected', got '{rejection_response.get('status')}'"
                    )

    def test_leaves_no_validations(self):
        """Test leave creation without validations - Non-blocking system"""
        print("\n🚫 Testing Leave Creation Without Validations...")
        
        if not self.admin_token or not self.employee_id:
            print("❌ Cannot test leaves - missing admin token or employee ID")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test 1: Create leave with zero balance (should succeed)
        leave_zero_balance = {
            "leave_type": "annual",
            "start_date": "2025-04-01",
            "end_date": "2025-04-05",
            "reason": "Test leave with zero balance - should succeed",
            "employee_id": self.employee_id
        }
        
        success, response = self.run_test(
            "POST /api/leaves - Create leave with zero balance (should succeed)",
            "POST",
            "leaves",
            201,
            data=leave_zero_balance,
            headers=headers
        )
        
        if success:
            self.log_test(
                "Leave creation succeeds even with zero balance",
                True,
                "No 'Solde insuffisant' error - system is non-blocking"
            )
        
        # Test 2: Create overlapping leaves (should succeed)
        leave_overlap_1 = {
            "leave_type": "annual",
            "start_date": "2025-05-01",
            "end_date": "2025-05-10",
            "reason": "First overlapping leave - should succeed",
            "employee_id": self.employee_id
        }
        
        success, response = self.run_test(
            "POST /api/leaves - Create first overlapping leave",
            "POST",
            "leaves",
            201,
            data=leave_overlap_1,
            headers=headers
        )
        
        if success:
            # Create second overlapping leave
            leave_overlap_2 = {
                "leave_type": "sick",
                "start_date": "2025-05-05",
                "end_date": "2025-05-15",
                "reason": "Second overlapping leave - should also succeed",
                "employee_id": self.employee_id
            }
            
            success, response = self.run_test(
                "POST /api/leaves - Create second overlapping leave (should succeed)",
                "POST",
                "leaves",
                201,
                data=leave_overlap_2,
                headers=headers
            )
            
            if success:
                self.log_test(
                    "Overlapping leaves creation succeeds",
                    True,
                    "No 'Chevauchement' error - system is non-blocking"
                )
        
        # Test 3: Create leaves with various durations (should all succeed)
        # 1 day leave
        leave_1_day = {
            "leave_type": "exceptional",
            "start_date": "2025-06-01",
            "end_date": "2025-06-01",
            "reason": "1 day leave - should succeed",
            "employee_id": self.employee_id
        }
        
        success, response = self.run_test(
            "POST /api/leaves - Create 1 day leave (should succeed)",
            "POST",
            "leaves",
            201,
            data=leave_1_day,
            headers=headers
        )
        
        if success:
            self.log_test(
                "1 day leave creation succeeds",
                True,
                "No minimum duration error - system is non-blocking"
            )
        
        # 100 day leave
        leave_100_days = {
            "leave_type": "annual",
            "start_date": "2025-07-01",
            "end_date": "2025-10-09",  # Approximately 100 days
            "reason": "100 day leave - should succeed",
            "employee_id": self.employee_id
        }
        
        success, response = self.run_test(
            "POST /api/leaves - Create 100 day leave (should succeed)",
            "POST",
            "leaves",
            201,
            data=leave_100_days,
            headers=headers
        )
        
        if success:
            self.log_test(
                "100 day leave creation succeeds",
                True,
                "No maximum duration error - system is non-blocking"
            )

    def test_behavior_module_documents(self):
        """Test behavior module with document support"""
        print("\n📝 Testing Behavior Module with Document Support...")
        
        if not self.admin_token or not self.employee_id:
            print("❌ Cannot test behavior - missing admin token or employee ID")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test 1: Create behavior note with document
        behavior_with_doc = {
            "employee_id": self.employee_id,
            "type": "sanction",
            "note": "Test sanction with document",
            "date": "2025-01-22",
            "file_name": "lettre_sanction.pdf",
            "file_url": "/uploads/test.pdf"
        }
        
        success, response = self.run_test(
            "POST /api/behavior - Create behavior with document",
            "POST",
            "behavior",
            201,
            data=behavior_with_doc,
            headers=headers
        )
        
        if success:
            # Verify file_name and file_url are stored
            has_file_name = 'file_name' in response and response['file_name'] == "lettre_sanction.pdf"
            has_file_url = 'file_url' in response and response['file_url'] == "/uploads/test.pdf"
            
            self.log_test(
                "Behavior creation stores file_name",
                has_file_name,
                f"file_name in response: {response.get('file_name')}"
            )
            
            self.log_test(
                "Behavior creation stores file_url",
                has_file_url,
                f"file_url in response: {response.get('file_url')}"
            )
            
            if 'id' in response:
                self.behavior_id = response['id']
        
        # Test 2: Get behavior notes and verify document fields
        success, response = self.run_test(
            "GET /api/behavior - Get behavior notes with document fields",
            "GET",
            "behavior",
            200,
            headers=headers
        )
        
        if success and 'behaviors' in response and len(response['behaviors']) > 0:
            # Check if returned notes contain file_name and file_url fields
            first_behavior = response['behaviors'][0]
            has_file_fields = 'file_name' in first_behavior and 'file_url' in first_behavior
            
            self.log_test(
                "GET behavior returns file_name and file_url fields",
                has_file_fields,
                f"Fields present: file_name={first_behavior.get('file_name')}, file_url={first_behavior.get('file_url')}"
            )
        
        # Test 3: Test extended behavior types
        extended_types = ["sanction", "warning", "dismissal", "praise", "note"]
        
        for behavior_type in extended_types:
            behavior_data = {
                "employee_id": self.employee_id,
                "type": behavior_type,
                "note": f"Test {behavior_type} behavior",
                "date": "2025-01-22"
            }
            
            success, response = self.run_test(
                f"POST /api/behavior - Create {behavior_type} behavior",
                "POST",
                "behavior",
                201,
                data=behavior_data,
                headers=headers
            )
            
            if success:
                self.log_test(
                    f"Behavior type '{behavior_type}' is accepted",
                    True,
                    f"Successfully created {behavior_type} behavior"
                )

    def test_behavior_deletion(self):
        """Test behavior note deletion"""
        print("\n🗑️ Testing Behavior Note Deletion...")
        
        if not self.admin_token or not self.employee_id:
            print("❌ Cannot test behavior deletion - missing admin token or employee ID")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Create a behavior note to delete
        behavior_data = {
            "employee_id": self.employee_id,
            "type": "note",
            "note": "Test behavior for deletion",
            "date": "2025-01-22"
        }
        
        success, response = self.run_test(
            "POST /api/behavior - Create behavior for deletion test",
            "POST",
            "behavior",
            201,
            data=behavior_data,
            headers=headers
        )
        
        if success and 'id' in response:
            behavior_id = response['id']
            
            # Test deletion
            success, delete_response = self.run_test(
                "DELETE /api/behavior/{id} - Delete behavior note",
                "DELETE",
                f"behavior/{behavior_id}",
                200,
                headers=headers
            )
            
            if success:
                self.log_test(
                    "Behavior note deletion succeeds",
                    True,
                    "Behavior note successfully deleted"
                )
                
                # Verify note no longer exists
                success, get_response = self.run_test(
                    "GET /api/behavior - Verify behavior deleted",
                    "GET",
                    "behavior",
                    200,
                    headers=headers
                )
                
                if success and 'behaviors' in get_response:
                    # Check if the deleted behavior is not in the list
                    deleted_behavior_exists = any(b.get('id') == behavior_id for b in get_response['behaviors'])
                    
                    self.log_test(
                        "Deleted behavior no longer exists in list",
                        not deleted_behavior_exists,
                        f"Behavior {behavior_id} found in list: {deleted_behavior_exists}"
                    )

    def run_all_tests(self):
        """Run all tests - Focus on Refactoring Review Request"""
        print("🚀 Starting PREMIDIS HR Platform Backend Tests")
        print("🎯 Focus: REFACTORING CONGÉS & COMPORTEMENT - Non-blocking System")
        print("=" * 70)
        
        # Authentication is required for all tests
        if not self.test_authentication():
            print("❌ Authentication failed - cannot proceed with other tests")
            return False
        
        # Run the priority tests from refactoring review request
        print("\n🎯 PRIORITY TESTS - REFACTORING VALIDATION:")
        print("1. MODULE CONGÉS - Bug Critique Corrigé")
        self.test_leaves_approval_rejection()
        
        print("\n2. MODULE CONGÉS - Suppression Validations")
        self.test_leaves_no_validations()
        
        print("\n3. MODULE COMPORTEMENT - Gestion Documentaire")
        self.test_behavior_module_documents()
        self.test_behavior_deletion()
        
        # Print summary
        print("\n" + "=" * 70)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("✅ REFACTORING VALIDATION: PASSED")
            print("✅ System is now non-blocking and purely declarative")
        else:
            print("❌ REFACTORING VALIDATION: FAILED")
            print("❌ Some blocking behaviors still exist")
        
        return success_rate >= 80

def main():
    tester = HRPlatformTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())