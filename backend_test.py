#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class PREMIERDIsAPITester:
    def __init__(self, base_url="https://prometheus-hr.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.admin_token = None
        self.admin_user_id = None
        self.employee_id = None
        self.leave_id = None

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
            self.failed_tests.append({"test": test_name, "error": details})

    def make_request(self, method, endpoint, data=None, headers=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        
        if headers:
            request_headers.update(headers)
        
        if self.token and 'Authorization' not in request_headers:
            request_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=30)
            
            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_health_check(self):
        """Test API health"""
        success, response, status = self.make_request('GET', '', expected_status=200)
        self.log_result("API Health Check", success, f"Status: {status}")
        return success

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_employee_{datetime.now().strftime('%H%M%S')}@premierdis.com"
        user_data = {
            "email": test_email,
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "Employee",
            "department": "administration",
            "role": "employee"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', user_data, expected_status=200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log_result("User Registration", True)
            return True
        else:
            self.log_result("User Registration", False, f"Status: {status}, Response: {response}")
            return False

    def test_admin_registration(self):
        """Test admin user registration"""
        admin_email = f"admin_{datetime.now().strftime('%H%M%S')}@premierdis.com"
        admin_data = {
            "email": admin_email,
            "password": "AdminPass123!",
            "first_name": "Admin",
            "last_name": "User",
            "department": "ressources_humaines",
            "role": "admin"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', admin_data, expected_status=200)
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.admin_user_id = response['user']['id']
            self.log_result("Admin Registration", True)
            return True
        else:
            self.log_result("Admin Registration", False, f"Status: {status}, Response: {response}")
            return False

    def test_user_login(self):
        """Test user login"""
        if not self.user_id:
            return False
            
        login_data = {
            "email": f"test_employee_{datetime.now().strftime('%H%M%S')}@premierdis.com",
            "password": "TestPass123!"
        }
        
        success, response, status = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        self.log_result("User Login", success, f"Status: {status}")
        return success

    def test_get_current_user(self):
        """Test get current user profile"""
        success, response, status = self.make_request('GET', 'auth/me', expected_status=200)
        self.log_result("Get Current User", success, f"Status: {status}")
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response, status = self.make_request('GET', 'dashboard/stats', expected_status=200)
        self.log_result("Dashboard Stats", success, f"Status: {status}")
        return success

    def test_create_employee(self):
        """Test employee creation (admin only)"""
        if not self.admin_token:
            return False
            
        # Switch to admin token
        original_token = self.token
        self.token = self.admin_token
        
        employee_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": f"john.doe_{datetime.now().strftime('%H%M%S')}@premierdis.com",
            "phone": "+243123456789",
            "department": "marketing",
            "position": "Marketing Manager",
            "hire_date": "2025-01-01",
            "salary": 2500.0,
            "contract_type": "CDI",
            "country": "RDC"
        }
        
        success, response, status = self.make_request('POST', 'employees', employee_data, expected_status=200)
        
        if success and 'id' in response:
            self.employee_id = response['id']
            self.log_result("Create Employee", True)
        else:
            self.log_result("Create Employee", False, f"Status: {status}, Response: {response}")
        
        # Switch back to original token
        self.token = original_token
        return success

    def test_list_employees(self):
        """Test listing employees"""
        success, response, status = self.make_request('GET', 'employees', expected_status=200)
        self.log_result("List Employees", success, f"Status: {status}")
        return success

    def test_create_leave_request(self):
        """Test creating leave request"""
        leave_data = {
            "leave_type": "annual",
            "start_date": "2025-02-01",
            "end_date": "2025-02-05",
            "reason": "Annual vacation"
        }
        
        success, response, status = self.make_request('POST', 'leaves', leave_data, expected_status=200)
        
        if success and 'id' in response:
            self.leave_id = response['id']
            self.log_result("Create Leave Request", True)
        else:
            self.log_result("Create Leave Request", False, f"Status: {status}, Response: {response}")
        
        return success

    def test_list_leaves(self):
        """Test listing leave requests"""
        success, response, status = self.make_request('GET', 'leaves', expected_status=200)
        self.log_result("List Leaves", success, f"Status: {status}")
        return success

    def test_leave_stats(self):
        """Test leave statistics"""
        success, response, status = self.make_request('GET', 'leaves/stats', expected_status=200)
        self.log_result("Leave Stats", success, f"Status: {status}")
        return success

    def test_approve_leave(self):
        """Test approving leave request (admin only)"""
        if not self.admin_token or not self.leave_id:
            return False
            
        # Switch to admin token
        original_token = self.token
        self.token = self.admin_token
        
        update_data = {
            "status": "approved",
            "admin_comment": "Approved for vacation"
        }
        
        success, response, status = self.make_request('PUT', f'leaves/{self.leave_id}', update_data, expected_status=200)
        self.log_result("Approve Leave", success, f"Status: {status}")
        
        # Switch back to original token
        self.token = original_token
        return success

    def test_list_payslips(self):
        """Test listing payslips"""
        success, response, status = self.make_request('GET', 'payroll', expected_status=200)
        self.log_result("List Payslips", success, f"Status: {status}")
        return success

    def test_list_announcements(self):
        """Test listing announcements"""
        success, response, status = self.make_request('GET', 'communication/announcements', expected_status=200)
        self.log_result("List Announcements", success, f"Status: {status}")
        return success

    def test_create_announcement(self):
        """Test creating announcement (admin only)"""
        if not self.admin_token:
            return False
            
        # Switch to admin token
        original_token = self.token
        self.token = self.admin_token
        
        announcement_data = {
            "title": "Test Announcement",
            "content": "This is a test announcement for the HR platform.",
            "priority": "normal",
            "target_departments": []
        }
        
        success, response, status = self.make_request('POST', 'communication/announcements', announcement_data, expected_status=200)
        self.log_result("Create Announcement", success, f"Status: {status}")
        
        # Switch back to original token
        self.token = original_token
        return success

    def test_list_messages(self):
        """Test listing messages"""
        success, response, status = self.make_request('GET', 'communication/messages', expected_status=200)
        self.log_result("List Messages", success, f"Status: {status}")
        return success

    def test_list_contacts(self):
        """Test listing contacts"""
        success, response, status = self.make_request('GET', 'communication/contacts', expected_status=200)
        self.log_result("List Contacts", success, f"Status: {status}")
        return success

    def test_list_rules(self):
        """Test listing rules"""
        success, response, status = self.make_request('GET', 'rules', expected_status=200)
        self.log_result("List Rules", success, f"Status: {status}")
        return success

    def test_create_rule(self):
        """Test creating rule (admin only)"""
        if not self.admin_token:
            return False
            
        # Switch to admin token
        original_token = self.token
        self.token = self.admin_token
        
        rule_data = {
            "title": "Test Company Rule",
            "content": "This is a test company rule for compliance.",
            "category": "general",
            "effective_date": "2025-01-01"
        }
        
        success, response, status = self.make_request('POST', 'rules', rule_data, expected_status=200)
        self.log_result("Create Rule", success, f"Status: {status}")
        
        # Switch back to original token
        self.token = original_token
        return success

    def test_leaves_calendar(self):
        """Test leaves calendar endpoint"""
        success, response, status = self.make_request('GET', 'leaves/calendar', expected_status=200)
        self.log_result("Leaves Calendar", success, f"Status: {status}")
        return success

    def test_attendance_check_in(self):
        """Test attendance check-in"""
        success, response, status = self.make_request('POST', 'attendance/check-in', {}, expected_status=200)
        self.log_result("Attendance Check-in", success, f"Status: {status}")
        return success

    def test_attendance_check_out(self):
        """Test attendance check-out"""
        success, response, status = self.make_request('POST', 'attendance/check-out', {}, expected_status=200)
        self.log_result("Attendance Check-out", success, f"Status: {status}")
        return success

    def test_attendance_today(self):
        """Test get today's attendance"""
        success, response, status = self.make_request('GET', 'attendance/today', expected_status=200)
        self.log_result("Today's Attendance", success, f"Status: {status}")
        return success

    def test_list_attendance(self):
        """Test listing attendance records"""
        success, response, status = self.make_request('GET', 'attendance', expected_status=200)
        self.log_result("List Attendance", success, f"Status: {status}")
        return success

    def test_create_attendance_record(self):
        """Test creating attendance record (admin only)"""
        if not self.admin_token:
            return False
            
        # Switch to admin token
        original_token = self.token
        self.token = self.admin_token
        
        attendance_data = {
            "employee_id": self.user_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "check_in": "09:00",
            "check_out": "17:00",
            "notes": "Test attendance record"
        }
        
        success, response, status = self.make_request('POST', 'attendance', attendance_data, expected_status=200)
        self.log_result("Create Attendance Record", success, f"Status: {status}")
        
        # Switch back to original token
        self.token = original_token
        return success

    def test_voice_endpoints(self):
        """Test voice AI endpoints availability"""
        # Test transcribe endpoint (will fail without audio data, but should return 400 not 500)
        success, response, status = self.make_request('POST', 'voice/transcribe', {}, expected_status=400)
        self.log_result("Voice Transcribe Endpoint", success, f"Status: {status}")
        
        # Test TTS endpoint (will fail without text, but should return 400 not 500)
        success, response, status = self.make_request('POST', 'voice/speak', {}, expected_status=400)
        self.log_result("Voice TTS Endpoint", success, f"Status: {status}")
        
        # Test chat endpoint (will fail without text, but should return 400 not 500)
        success, response, status = self.make_request('POST', 'voice/chat', {}, expected_status=400)
        self.log_result("Voice Chat Endpoint", success, f"Status: {status}")
        
        return True

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting PREMIERDIs HR API Tests")
        print("=" * 50)
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ API is not accessible, stopping tests")
            return False
        
        # Authentication tests
        if not self.test_user_registration():
            print("❌ User registration failed, stopping tests")
            return False
            
        if not self.test_admin_registration():
            print("❌ Admin registration failed, continuing with limited tests")
        
        self.test_get_current_user()
        
        # Dashboard and stats
        self.test_dashboard_stats()
        
        # Employee management
        self.test_create_employee()
        self.test_list_employees()
        
        # Leave management
        self.test_create_leave_request()
        self.test_list_leaves()
        self.test_leave_stats()
        self.test_approve_leave()
        self.test_leaves_calendar()
        
        # Attendance management
        self.test_attendance_check_in()
        self.test_attendance_today()
        self.test_attendance_check_out()
        self.test_list_attendance()
        self.test_create_attendance_record()
        
        # Payroll
        self.test_list_payslips()
        
        # Communication
        self.test_list_announcements()
        self.test_create_announcement()
        self.test_list_messages()
        self.test_list_contacts()
        
        # Rules
        self.test_list_rules()
        self.test_create_rule()
        
        # Voice AI
        self.test_voice_endpoints()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['error']}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"\n✨ Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80

def main():
    """Main test execution"""
    tester = PREMIERDIsAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())