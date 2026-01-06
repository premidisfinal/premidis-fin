import requests
import sys
from datetime import datetime
import json

class HRPlatformTester:
    def __init__(self, base_url="https://open-hr-admin.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.employee_token = None
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
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "rh@premierdis.com", "password": "Admin123!"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
        
        # Test employee login
        success, response = self.run_test(
            "Employee Login",
            "POST",
            "auth/login",
            200,
            data={"email": "employe@premierdis.com", "password": "Emp123!"}
        )
        if success and 'access_token' in response:
            self.employee_token = response['access_token']

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

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting PREMIDIS HR Platform Backend Tests")
        print("=" * 60)
        
        self.test_authentication()
        self.test_voice_assistant_removal()
        self.test_live_chat_endpoints()
        self.test_multi_currency_system()
        self.test_forgot_password_endpoints()
        self.test_employee_creation_with_currency()
        
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