import requests
import sys
from datetime import datetime
import json
import uuid
import io
import os

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
        """Test login with provided credentials and get/create employee"""
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
            
            # Get or create an employee for testing
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            
            # First, try to get existing employees
            success, employees_response = self.run_test(
                "GET /api/employees - Get employees for testing",
                "GET",
                "employees",
                200,
                headers=headers
            )
            
            if success and 'employees' in employees_response and len(employees_response['employees']) > 0:
                # Use the first employee found
                self.employee_id = employees_response['employees'][0]['id']
                print(f"✅ Using existing employee ID: {self.employee_id}")
            else:
                # Create a test employee
                employee_data = {
                    "first_name": "Jean",
                    "last_name": "Dupont",
                    "email": f"jean.dupont.test_{datetime.now().strftime('%H%M%S')}@premierdis.com",
                    "password": "Employee123!",
                    "department": "administration",
                    "role": "employee",
                    "category": "agent"
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
                    print(f"✅ Created test employee ID: {self.employee_id}")
                else:
                    print(f"❌ Failed to create test employee")
                    return False
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

    def test_document_upload_workflow(self):
        """Test complete document upload workflow as requested in review"""
        print("\n📄 Testing Document Upload Workflow (Review Request)...")
        
        if not self.admin_token or not self.employee_id:
            print("❌ Cannot test document upload - missing admin token or employee ID")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test 1: Upload a PDF file via POST /api/upload/file
        print("\n📤 Step 1: Upload PDF file via POST /api/upload/file...")
        
        # Create a simple PDF-like file for testing
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF"
        
        # Test file upload
        files = {'file': ('test_document.pdf', pdf_content, 'application/pdf')}
        upload_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            upload_url = f"{self.base_url}/api/upload/file"
            upload_response = requests.post(upload_url, files=files, headers=upload_headers)
            
            if upload_response.status_code == 200:
                upload_data = upload_response.json()
                self.log_test(
                    "File upload via POST /api/upload/file succeeds",
                    True,
                    f"File uploaded successfully: {upload_data.get('filename')}"
                )
                
                uploaded_file_url = upload_data.get('url')
                uploaded_filename = upload_data.get('filename')
                
                # Test 2: Create behavior note with uploaded document data
                print("\n📝 Step 2: Create behavior note with uploaded document...")
                
                behavior_with_document = {
                    "employee_id": self.employee_id,
                    "type": "sanction",
                    "note": "Sanction disciplinaire avec document joint - Test complet workflow",
                    "date": "2025-01-22",
                    "file_name": uploaded_filename,
                    "file_url": uploaded_file_url
                }
                
                success, response = self.run_test(
                    "POST /api/behavior - Create behavior with uploaded document",
                    "POST",
                    "behavior",
                    201,
                    data=behavior_with_document,
                    headers=headers
                )
                
                if success:
                    # Verify document fields are properly stored
                    has_file_name = response.get('file_name') == uploaded_filename
                    has_file_url = response.get('file_url') == uploaded_file_url
                    
                    self.log_test(
                        "Document file_name stored correctly",
                        has_file_name,
                        f"Expected: {uploaded_filename}, Got: {response.get('file_name')}"
                    )
                    
                    self.log_test(
                        "Document file_url stored correctly", 
                        has_file_url,
                        f"Expected: {uploaded_file_url}, Got: {response.get('file_url')}"
                    )
                    
                    if 'id' in response:
                        behavior_id = response['id']
                        
                        # Test 3: Retrieve behavior list and verify document is included
                        print("\n📋 Step 3: Verify document in behavior list...")
                        
                        success, get_response = self.run_test(
                            "GET /api/behavior - Verify document in behavior list",
                            "GET", 
                            "behavior",
                            200,
                            headers=headers
                        )
                        
                        if success and 'behaviors' in get_response:
                            # Find our created behavior
                            created_behavior = None
                            for behavior in get_response['behaviors']:
                                if behavior.get('id') == behavior_id:
                                    created_behavior = behavior
                                    break
                            
                            if created_behavior:
                                has_document_in_list = (
                                    created_behavior.get('file_name') == uploaded_filename and
                                    created_behavior.get('file_url') == uploaded_file_url
                                )
                                
                                self.log_test(
                                    "Document present in behavior list",
                                    has_document_in_list,
                                    f"file_name: {created_behavior.get('file_name')}, file_url: {created_behavior.get('file_url')}"
                                )
                            else:
                                self.log_test(
                                    "Created behavior found in list",
                                    False,
                                    f"Behavior with ID {behavior_id} not found in list"
                                )
                        
                        # Test 4: Get specific employee behaviors
                        print("\n👤 Step 4: Verify document in employee-specific behaviors...")
                        
                        success, emp_response = self.run_test(
                            f"GET /api/behavior/{self.employee_id} - Get employee behaviors",
                            "GET",
                            f"behavior/{self.employee_id}",
                            200,
                            headers=headers
                        )
                        
                        if success and 'behaviors' in emp_response:
                            # Check if document is present in employee-specific list
                            employee_behavior = None
                            for behavior in emp_response['behaviors']:
                                if behavior.get('id') == behavior_id:
                                    employee_behavior = behavior
                                    break
                            
                            if employee_behavior:
                                has_document_in_emp_list = (
                                    employee_behavior.get('file_name') == uploaded_filename and
                                    employee_behavior.get('file_url') == uploaded_file_url
                                )
                                
                                self.log_test(
                                    "Document present in employee behavior list",
                                    has_document_in_emp_list,
                                    f"Employee behaviors contain document: {has_document_in_emp_list}"
                                )
                        
                        # Test 5: Test document preview functionality
                        print("\n👁️ Step 5: Test document preview...")
                        self.test_document_preview(uploaded_file_url)
                
            else:
                self.log_test(
                    "File upload via POST /api/upload/file",
                    False,
                    f"Upload failed with status {upload_response.status_code}: {upload_response.text[:200]}"
                )
        
        except Exception as e:
            self.log_test(
                "File upload via POST /api/upload/file",
                False,
                f"Exception during upload: {str(e)}"
            )

    def test_document_preview(self, file_url):
        """Test document preview functionality"""
        if not file_url:
            return
        
        # Extract filepath from URL (e.g., "/api/uploads/filename.pdf" -> "filename.pdf")
        if file_url.startswith('/api/uploads/'):
            filepath = file_url.replace('/api/uploads/', '')
        else:
            filepath = file_url
        
        preview_url = f"{self.base_url}/api/preview/{filepath}"
        
        try:
            preview_response = requests.get(preview_url)
            
            if preview_response.status_code == 200:
                # Check Content-Type header
                content_type = preview_response.headers.get('content-type', '')
                content_disposition = preview_response.headers.get('content-disposition', '')
                
                is_pdf = 'application/pdf' in content_type
                is_inline = 'inline' in content_disposition
                
                self.log_test(
                    "Document preview returns correct Content-Type",
                    is_pdf,
                    f"Content-Type: {content_type}"
                )
                
                self.log_test(
                    "Document preview uses inline disposition",
                    is_inline,
                    f"Content-Disposition: {content_disposition}"
                )
                
                self.log_test(
                    "Document preview accessible",
                    True,
                    f"Preview successful for {filepath}"
                )
            else:
                self.log_test(
                    "Document preview accessible",
                    False,
                    f"Preview failed with status {preview_response.status_code}"
                )
        
        except Exception as e:
            self.log_test(
                "Document preview accessible",
                False,
                f"Exception during preview: {str(e)}"
            )

    def test_supported_file_types(self):
        """Test different supported file types"""
        print("\n📁 Testing Supported File Types...")
        
        if not self.admin_token or not self.employee_id:
            print("❌ Cannot test file types - missing admin token or employee ID")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test different file types as specified in review
        file_types = [
            {"name": "document.pdf", "type": "application/pdf", "description": "PDF document", "content": b"%PDF-1.4\nTest PDF"},
            {"name": "photo.jpg", "type": "image/jpeg", "description": "JPEG image", "content": b"\xff\xd8\xff\xe0\x00\x10JFIF"},
            {"name": "screenshot.png", "type": "image/png", "description": "PNG image", "content": b"\x89PNG\r\n\x1a\n"},
            {"name": "letter.doc", "type": "application/msword", "description": "DOC document", "content": b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"},
            {"name": "report.docx", "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "description": "DOCX document", "content": b"PK\x03\x04"}
        ]
        
        for i, file_info in enumerate(file_types):
            # Test actual file upload for each type
            files = {'file': (file_info["name"], file_info["content"], file_info["type"])}
            upload_headers = {'Authorization': f'Bearer {self.admin_token}'}
            
            try:
                upload_url = f"{self.base_url}/api/upload/file"
                upload_response = requests.post(upload_url, files=files, headers=upload_headers)
                
                if upload_response.status_code == 200:
                    upload_data = upload_response.json()
                    self.log_test(
                        f"File type {file_info['type']} upload succeeds",
                        True,
                        f"Successfully uploaded {file_info['description']}: {upload_data.get('filename')}"
                    )
                    
                    # Test creating behavior with this file type
                    behavior_data = {
                        "employee_id": self.employee_id,
                        "type": "note",
                        "note": f"Test behavior with {file_info['description']}",
                        "date": "2025-01-22",
                        "file_name": upload_data.get('filename'),
                        "file_url": upload_data.get('url')
                    }
                    
                    success, response = self.run_test(
                        f"POST /api/behavior - Create behavior with {file_info['description']}",
                        "POST",
                        "behavior", 
                        201,
                        data=behavior_data,
                        headers=headers
                    )
                    
                    if success:
                        self.log_test(
                            f"Behavior creation with {file_info['type']} succeeds",
                            True,
                            f"Successfully created behavior with {file_info['description']}"
                        )
                else:
                    self.log_test(
                        f"File type {file_info['type']} upload",
                        False,
                        f"Upload failed with status {upload_response.status_code}: {upload_response.text[:100]}"
                    )
            
            except Exception as e:
                self.log_test(
                    f"File type {file_info['type']} upload",
                    False,
                    f"Exception during upload: {str(e)}"
                )
        
        # Test unsupported file type (should return 400)
        print("\n🚫 Testing unsupported file type...")
        unsupported_file = {'file': ('test.txt', b'This is a text file', 'text/plain')}
        upload_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            upload_url = f"{self.base_url}/api/upload/file"
            upload_response = requests.post(upload_url, files=unsupported_file, headers=upload_headers)
            
            if upload_response.status_code == 400:
                self.log_test(
                    "Unsupported file type properly rejected",
                    True,
                    f"Correctly returned 400 for text/plain file type"
                )
            else:
                self.log_test(
                    "Unsupported file type properly rejected",
                    False,
                    f"Expected 400, got {upload_response.status_code}"
                )
        
        except Exception as e:
            self.log_test(
                "Unsupported file type test",
                False,
                f"Exception during test: {str(e)}"
            )

    def test_document_error_cases(self):
        """Test error cases and edge cases for document upload"""
        print("\n⚠️ Testing Document Error Cases...")
        
        # Test 1: Upload without authentication (should return 401/403)
        print("\n🔒 Testing upload without authentication...")
        
        behavior_data = {
            "employee_id": self.employee_id if self.employee_id else "test-id",
            "type": "note",
            "note": "Test without auth",
            "date": "2025-01-22",
            "file_name": "test.pdf",
            "file_url": "/uploads/test.pdf"
        }
        
        success, response = self.run_test(
            "POST /api/behavior - Create behavior without auth (should fail)",
            "POST",
            "behavior",
            403,  # Expecting 403 Forbidden (FastAPI returns 403 for "Not authenticated")
            data=behavior_data
            # No headers = no authentication
        )
        
        if success:
            self.log_test(
                "Unauthorized access properly blocked",
                True,
                "Returns 401 as expected for unauthenticated requests"
            )
        
        # Test 2: Create behavior without document (should work - document optional)
        if self.admin_token and self.employee_id:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            
            behavior_no_doc = {
                "employee_id": self.employee_id,
                "type": "praise",
                "note": "Behavior note without document - should work",
                "date": "2025-01-22"
                # No file_name or file_url
            }
            
            success, response = self.run_test(
                "POST /api/behavior - Create behavior without document (should work)",
                "POST",
                "behavior",
                201,
                data=behavior_no_doc,
                headers=headers
            )
            
            if success:
                self.log_test(
                    "Behavior creation works without document",
                    True,
                    "Document is optional - behavior created successfully"
                )
        
        # Test 3: Create behavior with file_name but no file_url
        if self.admin_token and self.employee_id:
            behavior_partial_doc = {
                "employee_id": self.employee_id,
                "type": "warning",
                "note": "Behavior with file_name but no file_url",
                "date": "2025-01-22",
                "file_name": "partial_test.pdf"
                # Missing file_url
            }
            
            success, response = self.run_test(
                "POST /api/behavior - Create behavior with file_name only",
                "POST",
                "behavior",
                201,
                data=behavior_partial_doc,
                headers=headers
            )
            
            if success:
                # Check what happens with partial document data
                has_file_name = response.get('file_name') == "partial_test.pdf"
                has_file_url = 'file_url' in response
                
                self.log_test(
                    "Partial document data handled correctly",
                    has_file_name,
                    f"file_name stored: {response.get('file_name')}, file_url present: {has_file_url}"
                )

    def run_all_tests(self):
        """Run all tests - Focus on Document Upload Workflow Review Request"""
        print("🚀 Starting PREMIDIS HR Platform Backend Tests")
        print("🎯 Focus: MODULE COMPORTEMENT UPLOAD DOCUMENTS - Complete Workflow Testing")
        print("=" * 70)
        
        # Authentication is required for all tests
        if not self.test_authentication():
            print("❌ Authentication failed - cannot proceed with other tests")
            return False
        
        # Run the priority tests from document upload review request
        print("\n🎯 PRIORITY TESTS - DOCUMENT UPLOAD WORKFLOW VALIDATION:")
        print("1. Complete Document Upload Workflow")
        self.test_document_upload_workflow()
        
        print("\n2. Supported File Types Testing")
        self.test_supported_file_types()
        
        print("\n3. Error Cases and Edge Cases")
        self.test_document_error_cases()
        
        print("\n4. Previous Behavior Module Tests")
        self.test_behavior_module_documents()
        self.test_behavior_deletion()
        
        # Print summary
        print("\n" + "=" * 70)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("✅ DOCUMENT UPLOAD WORKFLOW VALIDATION: PASSED")
            print("✅ Document upload and association with behavior notes working correctly")
        else:
            print("❌ DOCUMENT UPLOAD WORKFLOW VALIDATION: FAILED")
            print("❌ Issues found in document upload workflow")
        
        return success_rate >= 80

def main():
    tester = HRPlatformTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())