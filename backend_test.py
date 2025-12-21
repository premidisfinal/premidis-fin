#!/usr/bin/env python3
"""
PREMIDIS SARL HR Platform - Backend API Testing
Tests authentication, role-based permissions, leave management, and attendance tracking
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class PremidisHRTester:
    def __init__(self, base_url="https://prometheus-hr.preview.emergentagent.com"):
        self.base_url = base_url
        self.tokens = {}
        self.users = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials
        self.credentials = {
            "admin": {"email": "rh@premierdis.com", "password": "Admin123!"},
            "secretary": {"email": "secretaire2@premierdis.com", "password": "Secret123!"},
            "employee": {"email": "employe@premierdis.com", "password": "Emp123!"}
        }

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"test": name, "details": details})

    def make_request(self, method: str, endpoint: str, role: str = None, data: Dict = None, expected_status: int = 200) -> tuple:
        """Make API request with optional authentication"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if role and role in self.tokens:
            headers['Authorization'] = f'Bearer {self.tokens[role]}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_authentication(self):
        """Test authentication for all roles"""
        print("\n🔐 Testing Authentication...")
        
        for role, creds in self.credentials.items():
            success, response, status = self.make_request(
                'POST', 'auth/login', data=creds, expected_status=200
            )
            
            if success and 'access_token' in response:
                self.tokens[role] = response['access_token']
                self.users[role] = response['user']
                self.log_test(f"Login as {role}", True, f"Role: {response['user']['role']}")
            else:
                self.log_test(f"Login as {role}", False, f"Status: {status}, Response: {response}")

    def test_role_permissions(self):
        """Test role-based access control"""
        print("\n🛡️ Testing Role-Based Permissions...")
        
        # Test employee list access
        for role in ['admin', 'secretary', 'employee']:
            success, response, status = self.make_request('GET', 'employees', role=role)
            
            if role == 'employee':
                # Employee should only see themselves
                expected = len(response.get('employees', [])) == 1
                self.log_test(f"{role} - Employee list (self only)", expected, 
                            f"Employees visible: {len(response.get('employees', []))}")
            else:
                # Admin/Secretary should see all employees
                expected = len(response.get('employees', [])) > 1
                self.log_test(f"{role} - Employee list (all)", expected,
                            f"Employees visible: {len(response.get('employees', []))}")

    def test_leave_management(self):
        """Test leave request creation and approval workflow"""
        print("\n📅 Testing Leave Management...")
        
        # Create leave request as employee
        leave_data = {
            "leave_type": "annual",
            "start_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(days=9)).strftime("%Y-%m-%d"),
            "reason": "Test leave request"
        }
        
        success, response, status = self.make_request(
            'POST', 'leaves', role='employee', data=leave_data, expected_status=201
        )
        
        if success:
            leave_id = response.get('id')
            working_days = response.get('working_days', 0)
            self.log_test("Employee - Create leave request", True, 
                        f"Leave ID: {leave_id}, Working days: {working_days}")
            
            # CRITICAL BUG FIX TEST: Secretary CAN NOW approve leaves (was previously blocked)
            if leave_id:
                success, response, status = self.make_request(
                    'PUT', f'leaves/{leave_id}', role='secretary', 
                    data={"status": "approved"}, expected_status=200
                )
                self.log_test("Secretary CAN approve leaves (BUG FIX)", success, 
                            f"Status: {status}, Leave status: {response.get('status', 'unknown')}")
                
                # Test admin CAN also approve
                success, response, status = self.make_request(
                    'PUT', f'leaves/{leave_id}', role='admin', 
                    data={"status": "rejected"}, expected_status=200
                )
                self.log_test("Admin CAN approve/reject leaves", success, 
                            f"Status: {response.get('status', 'unknown')}")
        else:
            self.log_test("Employee - Create leave request", False, f"Status: {status}")

    def test_leave_rules_visibility(self):
        """Test that employees can see leave rules clearly before submitting request"""
        print("\n📋 Testing Leave Rules Visibility...")
        
        for role in ['admin', 'secretary', 'employee']:
            success, response, status = self.make_request('GET', 'leaves/rules', role=role)
            
            if success:
                rules = response.get('rules', {})
                leave_types = response.get('leave_types', [])
                has_annual_days = 'annual_days' in rules
                has_leave_types = len(leave_types) > 0
                
                self.log_test(f"{role} - Leave rules access", has_annual_days and has_leave_types, 
                            f"Rules: {list(rules.keys())}, Leave types: {len(leave_types)}")
            else:
                self.log_test(f"{role} - Leave rules access", False, f"Status: {status}")

    def test_leave_balance(self):
        """Test leave balance calculation"""
        print("\n💰 Testing Leave Balance...")
        
        for role in ['admin', 'secretary', 'employee']:
            success, response, status = self.make_request('GET', 'leaves/balance', role=role)
            
            if success:
                balance_types = list(response.keys())
                has_annual = 'annual' in balance_types
                self.log_test(f"{role} - Leave balance access", has_annual, 
                            f"Balance types: {balance_types}")
            else:
                self.log_test(f"{role} - Leave balance access", False, f"Status: {status}")

    def test_attendance_tracking(self):
        """Test attendance check-in/check-out"""
        print("\n⏰ Testing Attendance Tracking...")
        
        # Test check-in as employee
        success, response, status = self.make_request(
            'POST', 'attendance/check-in', role='employee', expected_status=200
        )
        
        if success:
            check_in_time = response.get('check_in')
            self.log_test("Employee - Check-in", True, f"Check-in time: {check_in_time}")
            
            # Test check-out
            success, response, status = self.make_request(
                'POST', 'attendance/check-out', role='employee', expected_status=200
            )
            
            if success:
                check_out_time = response.get('check_out')
                self.log_test("Employee - Check-out", True, f"Check-out time: {check_out_time}")
            else:
                self.log_test("Employee - Check-out", False, f"Status: {status}")
        else:
            self.log_test("Employee - Check-in", False, f"Status: {status}")

    def test_working_day_calculation(self):
        """Test working day calculation accuracy"""
        print("\n📊 Testing Working Day Calculation...")
        
        # Test weekend exclusion (Monday to Friday = 5 working days)
        test_cases = [
            {
                "start": "2025-01-06",  # Monday
                "end": "2025-01-10",    # Friday
                "expected": 5
            },
            {
                "start": "2025-01-06",  # Monday  
                "end": "2025-01-12",    # Sunday (includes weekend)
                "expected": 5  # Should exclude weekend
            }
        ]
        
        for case in test_cases:
            leave_data = {
                "leave_type": "annual",
                "start_date": case["start"],
                "end_date": case["end"],
                "reason": "Working day calculation test"
            }
            
            success, response, status = self.make_request(
                'POST', 'leaves', role='employee', data=leave_data, expected_status=201
            )
            
            if success:
                actual_days = response.get('working_days', 0)
                correct = actual_days == case["expected"]
                self.log_test(f"Working days calculation ({case['start']} to {case['end']})", 
                            correct, f"Expected: {case['expected']}, Got: {actual_days}")
            else:
                self.log_test(f"Working days calculation test", False, f"Status: {status}")

    def test_calendar_access(self):
        """Test calendar view permissions"""
        print("\n📅 Testing Calendar Access...")
        
        for role in ['admin', 'secretary', 'employee']:
            success, response, status = self.make_request('GET', 'leaves/calendar', role=role)
            
            if success:
                leaves = response.get('leaves', [])
                self.log_test(f"{role} - Calendar access", True, f"Leaves visible: {len(leaves)}")
            else:
                self.log_test(f"{role} - Calendar access", False, f"Status: {status}")

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📈 Testing Dashboard Statistics...")
        
        for role in ['admin', 'secretary', 'employee']:
            success, response, status = self.make_request('GET', 'dashboard/stats', role=role)
            
            if success:
                if role in ['admin', 'secretary']:
                    has_admin_stats = 'total_employees' in response
                    self.log_test(f"{role} - Admin dashboard stats", has_admin_stats,
                                f"Stats keys: {list(response.keys())}")
                else:
                    has_employee_stats = 'leave_balance' in response
                    self.log_test(f"{role} - Employee dashboard stats", has_employee_stats,
                                f"Stats keys: {list(response.keys())}")
            else:
                self.log_test(f"{role} - Dashboard stats", False, f"Status: {status}")

    def test_employee_creation(self):
        """Test employee creation by Admin and Secretary"""
        print("\n👥 Testing Employee Creation...")
        
        # Test data for new employee
        new_employee = {
            "first_name": "Test",
            "last_name": "Employee",
            "email": f"test.employee.{datetime.now().strftime('%H%M%S')}@premierdis.com",
            "password": "TestPass123!",
            "phone": "+243123456789",
            "department": "administration",
            "position": "Test Position",
            "hire_date": datetime.now().strftime("%Y-%m-%d"),
            "salary": 1000.0,
            "role": "employee",
            "category": "agent"
        }
        
        # Test Admin can create employee
        success, response, status = self.make_request(
            'POST', 'employees', role='admin', data=new_employee, expected_status=201
        )
        
        if success:
            created_id = response.get('id')
            self.log_test("Admin - Create employee", True, f"Employee ID: {created_id}")
        else:
            self.log_test("Admin - Create employee", False, f"Status: {status}, Response: {response}")
        
        # Test Secretary can create employee
        new_employee['email'] = f"test.secretary.{datetime.now().strftime('%H%M%S')}@premierdis.com"
        success, response, status = self.make_request(
            'POST', 'employees', role='secretary', data=new_employee, expected_status=201
        )
        
        if success:
            created_id = response.get('id')
            self.log_test("Secretary - Create employee", True, f"Employee ID: {created_id}")
        else:
            self.log_test("Secretary - Create employee", False, f"Status: {status}, Response: {response}")
        
        # Test Employee CANNOT create employee
        new_employee['email'] = f"test.fail.{datetime.now().strftime('%H%M%S')}@premierdis.com"
        success, response, status = self.make_request(
            'POST', 'employees', role='employee', data=new_employee, expected_status=403
        )
        self.log_test("Employee CANNOT create employee", success, f"Status: {status}")

    def test_behavior_tracking(self):
        """Test behavior tracking functionality"""
        print("\n📝 Testing Behavior Tracking...")
        
        # Get employee ID for behavior note
        employee_id = self.users.get('employee', {}).get('id')
        if not employee_id:
            self.log_test("Behavior tracking", False, "No employee ID available")
            return
        
        # Test Admin can create behavior note
        behavior_data = {
            "employee_id": employee_id,
            "type": "positive",
            "note": "Excellent performance on project delivery",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        
        success, response, status = self.make_request(
            'POST', 'behavior', role='admin', data=behavior_data, expected_status=201
        )
        
        if success:
            behavior_id = response.get('id')
            self.log_test("Admin - Create behavior note", True, f"Behavior ID: {behavior_id}")
        else:
            self.log_test("Admin - Create behavior note", False, f"Status: {status}, Response: {response}")
        
        # Test Employee can view their own behavior history
        success, response, status = self.make_request(
            'GET', f'behavior/{employee_id}', role='employee'
        )
        
        if success:
            behaviors = response.get('behaviors', [])
            self.log_test("Employee - View own behavior history", True, f"Behaviors found: {len(behaviors)}")
        else:
            self.log_test("Employee - View own behavior history", False, f"Status: {status}")
        
        # Test Employee CANNOT create behavior note
        success, response, status = self.make_request(
            'POST', 'behavior', role='employee', data=behavior_data, expected_status=403
        )
        self.log_test("Employee CANNOT create behavior note", success, f"Status: {status}")

    def test_leave_types(self):
        """Test simplified leave types"""
        print("\n📋 Testing Leave Types...")
        
        valid_leave_types = ["annual", "sick", "maternity", "exceptional", "public"]
        
        for leave_type in valid_leave_types:
            leave_data = {
                "leave_type": leave_type,
                "start_date": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
                "end_date": (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d"),
                "reason": f"Test {leave_type} leave"
            }
            
            success, response, status = self.make_request(
                'POST', 'leaves', role='employee', data=leave_data, expected_status=201
            )
            
            self.log_test(f"Leave type '{leave_type}' accepted", success, 
                        f"Status: {status}, Leave ID: {response.get('id', 'N/A')}")

    def test_file_upload_functionality(self):
        """Test file upload functionality for PDF, JPEG, PNG files"""
        print("\n📁 Testing File Upload Functionality...")
        
        # Test file upload endpoint exists and accepts files
        # Note: We can't actually upload files in this test, but we can test the endpoint
        
        # Test upload endpoint accessibility
        success, response, status = self.make_request(
            'POST', 'upload/file', role='employee', expected_status=422  # Expect validation error without file
        )
        
        # 422 means endpoint exists but missing file data - this is expected
        endpoint_exists = status == 422
        self.log_test("File upload endpoint exists", endpoint_exists, f"Status: {status}")
        
        # Test avatar upload endpoint
        employee_id = self.users.get('employee', {}).get('id')
        if employee_id:
            success, response, status = self.make_request(
                'POST', f'upload/avatar/{employee_id}', role='employee', expected_status=422
            )
            
            avatar_endpoint_exists = status == 422
            self.log_test("Avatar upload endpoint exists", avatar_endpoint_exists, f"Status: {status}")

    def test_communication_features(self):
        """Test announcement creation by Admin and Secretary"""
        print("\n💬 Testing Communication Features...")
        
        # Test announcement creation by Admin
        announcement_data = {
            "title": "Test Admin Announcement",
            "content": "This is a test announcement from admin",
            "priority": "normal"
        }
        
        success, response, status = self.make_request(
            'POST', 'communication/announcements', role='admin', 
            data=announcement_data, expected_status=201
        )
        
        if success:
            announcement_id = response.get('id')
            self.log_test("Admin - Create announcement", True, f"Announcement ID: {announcement_id}")
        else:
            self.log_test("Admin - Create announcement", False, f"Status: {status}, Response: {response}")
        
        # Test announcement creation by Secretary (BUG FIX)
        announcement_data['title'] = "Test Secretary Announcement"
        announcement_data['content'] = "This is a test announcement from secretary"
        
        success, response, status = self.make_request(
            'POST', 'communication/announcements', role='secretary', 
            data=announcement_data, expected_status=201
        )
        
        if success:
            announcement_id = response.get('id')
            self.log_test("Secretary - Create announcement (BUG FIX)", True, f"Announcement ID: {announcement_id}")
        else:
            self.log_test("Secretary - Create announcement (BUG FIX)", False, f"Status: {status}, Response: {response}")
        
        # Test Employee CANNOT create announcements
        success, response, status = self.make_request(
            'POST', 'communication/announcements', role='employee', 
            data=announcement_data, expected_status=403
        )
        self.log_test("Employee CANNOT create announcements", success, f"Status: {status}")
        
        # Test announcement listing
        for role in ['admin', 'secretary', 'employee']:
            success, response, status = self.make_request(
                'GET', 'communication/announcements', role=role
            )
            
            if success:
                announcements = response.get('announcements', [])
                self.log_test(f"{role} - View announcements", True, f"Announcements visible: {len(announcements)}")
            else:
                self.log_test(f"{role} - View announcements", False, f"Status: {status}")

    def test_employee_data_isolation(self):
        """Test that employees can only access their own data"""
        print("\n🔒 Testing Employee Data Isolation...")
        
        # Get employee's own ID
        employee_id = self.users.get('employee', {}).get('id')
        if not employee_id:
            self.log_test("Employee data isolation", False, "No employee ID available")
            return
        
        # Test employee can access their own data
        success, response, status = self.make_request(
            'GET', f'employees/{employee_id}', role='employee'
        )
        self.log_test("Employee - Access own profile", success, f"Status: {status}")
        
        # Test employee cannot access admin's data (if we have admin ID)
        admin_id = self.users.get('admin', {}).get('id')
        if admin_id and admin_id != employee_id:
            success, response, status = self.make_request(
                'GET', f'employees/{admin_id}', role='employee', expected_status=403
            )
            self.log_test("Employee CANNOT access other profiles", success, f"Status: {status}")

        )
        
        if success:
            announcement_id = response.get('id')
            self.log_test("Secretary - Create announcement (BUG FIX)", True, f"Announcement ID: {announcement_id}")
        else:
            self.log_test("Secretary - Create announcement (BUG FIX)", False, f"Status: {status}, Response: {response}")
        
        # Test Employee CANNOT create announcements
        success, response, status = self.make_request(
            'POST', 'communication/announcements', role='employee', 
            data=announcement_data, expected_status=403
        )
        self.log_test("Employee CANNOT create announcements", success, f"Status: {status}")
        
        # Test announcement listing
        for role in ['admin', 'secretary', 'employee']:
            success, response, status = self.make_request(
                'GET', 'communication/announcements', role=role
            )
            
            if success:
                announcements = response.get('announcements', [])
                self.log_test(f"{role} - View announcements", True, f"Announcements visible: {len(announcements)}")
            else:
                self.log_test(f"{role} - View announcements", False, f"Status: {status}")

    def test_calendar_approved_leaves_only(self):
        """Test that calendar shows only APPROVED leaves, not pending or rejected"""
        print("\n📅 Testing Calendar Shows Only Approved Leaves...")
        
        # Create leaves with different statuses
        leave_data_pending = {
            "leave_type": "annual",
            "start_date": (datetime.now() + timedelta(days=20)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%d"),
            "reason": "Test pending leave for calendar"
        }
        
        # Create pending leave
        success, response, status = self.make_request(
            'POST', 'leaves', role='employee', data=leave_data_pending, expected_status=201
        )
        
        pending_leave_id = None
        if success:
            pending_leave_id = response.get('id')
            self.log_test("Created pending leave for calendar test", True, f"Leave ID: {pending_leave_id}")
        
        # Create and approve another leave
        leave_data_approved = {
            "leave_type": "sick",
            "start_date": (datetime.now() + timedelta(days=25)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(days=26)).strftime("%Y-%m-%d"),
            "reason": "Test approved leave for calendar"
        }
        
        success, response, status = self.make_request(
            'POST', 'leaves', role='employee', data=leave_data_approved, expected_status=201
        )
        
        approved_leave_id = None
        if success:
            approved_leave_id = response.get('id')
            # Approve this leave
            success, response, status = self.make_request(
                'PUT', f'leaves/{approved_leave_id}', role='admin', 
                data={"status": "approved"}, expected_status=200
            )
            if success:
                self.log_test("Created and approved leave for calendar test", True, f"Leave ID: {approved_leave_id}")
        
        # Now check calendar - should only show approved leaves
        success, response, status = self.make_request('GET', 'leaves/calendar', role='employee')
        
        if success:
            calendar_leaves = response.get('leaves', [])
            
            # Check if only approved leaves are shown
            approved_count = sum(1 for leave in calendar_leaves if leave.get('status') == 'approved')
            pending_count = sum(1 for leave in calendar_leaves if leave.get('status') == 'pending')
            rejected_count = sum(1 for leave in calendar_leaves if leave.get('status') == 'rejected')
            
            only_approved = pending_count == 0 and rejected_count == 0
            self.log_test("Calendar shows only APPROVED leaves (BUG FIX)", only_approved, 
                        f"Approved: {approved_count}, Pending: {pending_count}, Rejected: {rejected_count}")
        else:
            self.log_test("Calendar shows only APPROVED leaves", False, f"Status: {status}")

    def test_document_upload_in_profile(self):
        """Test document upload in employee profile"""
        print("\n📄 Testing Document Upload in Employee Profile...")
        
        employee_id = self.users.get('employee', {}).get('id')
        if not employee_id:
            self.log_test("Document upload in profile", False, "No employee ID available")
            return
        
        # Test document upload endpoint for employee profile
        document_data = {
            "name": "test_document.pdf",
            "type": "pdf",
            "url": "/uploads/test_document.pdf"
        }
        
        success, response, status = self.make_request(
            'POST', f'employees/{employee_id}/documents', role='employee', 
            data=document_data, expected_status=201
        )
        
        if success:
            doc_id = response.get('id')
            self.log_test("Employee - Upload document to profile", True, f"Document ID: {doc_id}")
        else:
            self.log_test("Employee - Upload document to profile", False, f"Status: {status}, Response: {response}")
        
        # Test document listing
        success, response, status = self.make_request(
            'GET', f'employees/{employee_id}/documents', role='employee'
        )
        
        if success:
            documents = response.get('documents', [])
            self.log_test("Employee - View profile documents", True, f"Documents found: {len(documents)}")
        else:
            self.log_test("Employee - View profile documents", False, f"Status: {status}")

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting PREMIDIS SARL HR Platform Backend Tests")
        print("=" * 60)
        
        # Core functionality tests
        self.test_authentication()
        
        if not self.tokens:
            print("❌ Authentication failed - cannot proceed with other tests")
            return False
        
        self.test_role_permissions()
        self.test_employee_creation()
        self.test_behavior_tracking()
        self.test_leave_types()
        self.test_leave_rules_visibility()
        self.test_leave_management()
        self.test_leave_balance()
        self.test_calendar_approved_leaves_only()
        self.test_attendance_tracking()
        self.test_working_day_calculation()
        self.test_calendar_access()
        self.test_dashboard_stats()
        self.test_file_upload_functionality()
        self.test_communication_features()
        self.test_document_upload_in_profile()
        self.test_employee_data_isolation()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"✅ Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ as passing

def main():
    tester = PremidisHRTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())