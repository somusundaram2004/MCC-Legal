import sys
import os
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

results = []

def record(test_name, success, details=""):
    status = "PASS" if success else "FAIL"
    print(f"[{status}] {test_name}: {details}")
    results.append({
        "test": test_name,
        "status": status,
        "details": str(details)
    })

def run_tests():
    print(f"Starting MCC Legal comprehensive API test suite on {BASE_URL}...\n")
    session = requests.Session()

    # 1. AUTHENTICATION TESTS
    # 1.1 Invalid Login
    try:
        res = session.post(f"{BASE_URL}/api/users/auth/login/", json={
            "email": "invalid_user@college.edu",
            "password": "WrongPassword123!"
        })
        record("Auth: Invalid Login (Expect 400/401)", res.status_code in [400, 401], f"Status: {res.status_code}")
    except Exception as e:
        record("Auth: Invalid Login", False, str(e))

    # 1.2 Valid Super Admin Login
    access_token = None
    refresh_token = None
    try:
        res = session.post(f"{BASE_URL}/api/users/auth/login/", json={
            "email": "superadmin@college.edu",
            "password": "AdminPass123!"
        })
        if res.status_code == 200:
            data = res.json()
            access_token = data.get("access")
            refresh_token = data.get("refresh")
            record("Auth: Super Admin Login", True, f"Token obtained, user: {data.get('user', {}).get('email')}")
        else:
            record("Auth: Super Admin Login", False, f"Status: {res.status_code}, Body: {res.text}")
    except Exception as e:
        record("Auth: Super Admin Login", False, str(e))

    if not access_token:
        print("Cannot continue without access token!")
        return

    auth_headers = {"Authorization": f"Bearer {access_token}"}

    # 1.3 JWT Refresh Token
    try:
        res = session.post(f"{BASE_URL}/api/users/auth/refresh/", json={"refresh": refresh_token})
        record("Auth: Token Refresh", res.status_code == 200, f"Status: {res.status_code}")
    except Exception as e:
        record("Auth: Token Refresh", False, str(e))

    # 1.4 Get Current User Profile (/api/users/me/)
    try:
        res = session.get(f"{BASE_URL}/api/users/me/", headers=auth_headers)
        data = res.json()
        record("Users: /api/users/me/", res.status_code == 200 and data.get("email") == "superadmin@college.edu", f"Email: {data.get('email')}, Role: {data.get('role', {}).get('name')}")
    except Exception as e:
        record("Users: /api/users/me/", False, str(e))

    # 2. DASHBOARD & STATS
    try:
        res = session.get(f"{BASE_URL}/api/dashboard/stats/", headers=auth_headers)
        data = res.json()
        record("Dashboard: /api/dashboard/stats/", res.status_code == 200, f"Total MOUs: {data.get('total_mous')}, Active: {data.get('active_mous')}")
    except Exception as e:
        record("Dashboard: /api/dashboard/stats/", False, str(e))

    # 3. NOTIFICATIONS
    try:
        res = session.get(f"{BASE_URL}/api/notifications/", headers=auth_headers)
        data = res.json()
        count = len(data.get("results", data) if isinstance(data, dict) else data)
        record("Notifications: GET /api/notifications/", res.status_code == 200, f"Count: {count}")
    except Exception as e:
        record("Notifications: GET /api/notifications/", False, str(e))

    # 4. ROLES & PERMISSIONS
    try:
        res = session.get(f"{BASE_URL}/api/roles/", headers=auth_headers)
        roles_data = res.json()
        roles_list = roles_data.get("results", roles_data) if isinstance(roles_data, dict) else roles_data
        record("Roles: GET /api/roles/", res.status_code == 200, f"Found {len(roles_list)} roles")
    except Exception as e:
        record("Roles: GET /api/roles/", False, str(e))

    try:
        res = session.get(f"{BASE_URL}/api/permissions/", headers=auth_headers)
        perms_data = res.json()
        perms_list = perms_data.get("results", perms_data) if isinstance(perms_data, dict) else perms_data
        record("Permissions: GET /api/permissions/", res.status_code == 200, f"Found {len(perms_list)} permissions")
    except Exception as e:
        record("Permissions: GET /api/permissions/", False, str(e))

    # 5. CUSTOM DYNAMIC PAGES
    try:
        res = session.get(f"{BASE_URL}/api/users/custom-pages/", headers=auth_headers)
        pages = res.json()
        record("Custom Pages: GET /api/users/custom-pages/", res.status_code == 200, f"Found {len(pages)} pages: {[p.get('title') for p in pages]}")
    except Exception as e:
        record("Custom Pages: GET /api/users/custom-pages/", False, str(e))

    # 6. GOOGLE DRIVE ENDPOINTS
    try:
        res = session.get(f"{BASE_URL}/api/google-drive/status/", headers=auth_headers)
        data = res.json()
        record("Google Drive: GET /status/", res.status_code == 200, f"Status: {data.get('connection_status')}, Email: {data.get('connected_email')}")
    except Exception as e:
        record("Google Drive: GET /status/", False, str(e))

    try:
        res = session.get(f"{BASE_URL}/api/google-drive/hierarchy-status/", headers=auth_headers)
        data = res.json()
        statuses = data.get("statuses", [])
        connected_count = sum(1 for s in statuses if s.get("status") == "Connected")
        record("Google Drive: GET /hierarchy-status/", res.status_code == 200, f"{connected_count}/{len(statuses)} modules Connected")
    except Exception as e:
        record("Google Drive: GET /hierarchy-status/", False, str(e))

    # 7. FOLDERS CRUD & LIFECYCLE
    created_folder_id = None
    try:
        test_folder_name = f"TestSuite_Folder_{int(time.time())}"
        res = session.post(f"{BASE_URL}/api/folders/", headers=auth_headers, json={"name": test_folder_name})
        if res.status_code in [200, 201]:
            data = res.json()
            created_folder_id = data.get("id")
            record("Folders: POST /api/folders/ (Create)", True, f"Created ID {created_folder_id}, Drive ID: {data.get('google_folder_id')}")
        else:
            record("Folders: POST /api/folders/ (Create)", False, f"Status: {res.status_code}, Body: {res.text}")
    except Exception as e:
        record("Folders: POST /api/folders/ (Create)", False, str(e))

    # 7.2 Rename Folder
    if created_folder_id:
        try:
            renamed_name = f"{test_folder_name}_Renamed"
            res = session.patch(f"{BASE_URL}/api/folders/{created_folder_id}/", headers=auth_headers, json={"name": renamed_name})
            record("Folders: PATCH /api/folders/:id/ (Rename)", res.status_code == 200, f"Renamed to {renamed_name}")
        except Exception as e:
            record("Folders: PATCH /api/folders/:id/ (Rename)", False, str(e))

    # 8. FILES CRUD & UPLOAD
    created_file_id = None
    if created_folder_id:
        try:
            file_content = b"%PDF-1.4 Mock PDF content for test suite validation\n%%EOF"
            files = {
                "file": ("test_doc.pdf", file_content, "application/pdf")
            }
            data = {
                "folder_id": created_folder_id,
                "document_type": "Agreement"
            }
            res = session.post(f"{BASE_URL}/api/files/upload/", headers=auth_headers, files=files, data=data)
            if res.status_code in [200, 201]:
                file_data = res.json()
                created_file_id = file_data.get("id")
                record("Files: POST /api/files/upload/", True, f"File ID: {created_file_id}, Drive ID: {file_data.get('google_file_id')}")
            else:
                record("Files: POST /api/files/upload/", False, f"Status: {res.status_code}, Body: {res.text}")
        except Exception as e:
            record("Files: POST /api/files/upload/", False, str(e))

    # 8.2 File Metadata / Details
    if created_file_id:
        try:
            res = session.get(f"{BASE_URL}/api/files/{created_file_id}/", headers=auth_headers)
            record("Files: GET /api/files/:id/", res.status_code == 200, f"Status: {res.status_code}")
        except Exception as e:
            record("Files: GET /api/files/:id/", False, str(e))

    # 9. MOU ENDPOINTS
    created_mou_id = None
    try:
        mou_payload = {
            "title": f"Test Partnership Agreement {int(time.time())}",
            "partner_organization": "Antigravity Research Labs",
            "signed_date": "2026-01-15",
            "duration_months": 24,
            "status": "Active",
            "summary": "Automated integration test MOU for lifecycle validation",
            "scope_of_work": "Conducting full system tests and validation",
            "coordinator_name": "Super Admin",
            "partner_name": "Dr. Antigravity",
            "department": created_folder_id
        }
        res = session.post(f"{BASE_URL}/api/mous/", headers=auth_headers, json=mou_payload)
        if res.status_code in [200, 201]:
            mou_data = res.json()
            created_mou_id = mou_data.get("id")
            record("MOU: POST /api/mous/ (Create)", True, f"MOU ID: {created_mou_id}, Expiry: {mou_data.get('expiry_date')}")
        else:
            record("MOU: POST /api/mous/ (Create)", False, f"Status: {res.status_code}, Body: {res.text}")
    except Exception as e:
        record("MOU: POST /api/mous/ (Create)", False, str(e))

    # 9.2 GET MOU Detail
    if created_mou_id:
        try:
            res = session.get(f"{BASE_URL}/api/mous/{created_mou_id}/", headers=auth_headers)
            record("MOU: GET /api/mous/:id/", res.status_code == 200, f"Title: {res.json().get('title')}")
        except Exception as e:
            record("MOU: GET /api/mous/:id/", False, str(e))

    # 9.3 MOU Expiry Calculator validation
    if created_mou_id:
        try:
            res = session.get(f"{BASE_URL}/api/mous/{created_mou_id}/", headers=auth_headers)
            data = res.json()
            # signed_date: 2026-01-15 + 24 months -> 2028-01-15
            expiry = data.get("expiry_date")
            is_correct_expiry = expiry is not None and "2028-01-15" in expiry
            record("MOU: Smart Expiry Date Calculation (Signed + 24 mos)", is_correct_expiry, f"Computed expiry: {expiry}")
        except Exception as e:
            record("MOU: Smart Expiry Date Calculation", False, str(e))

    # 10. ACTIVITY LOGS
    try:
        res = session.get(f"{BASE_URL}/api/activity-logs/", headers=auth_headers)
        data = res.json()
        count = len(data.get("results", data) if isinstance(data, dict) else data)
        record("Activity Logs: GET /api/activity-logs/", res.status_code == 200, f"Count: {count}")
    except Exception as e:
        record("Activity Logs: GET /api/activity-logs/", False, str(e))

    # 11. GLOBAL SEARCH
    try:
        res = session.get(f"{BASE_URL}/api/search/?q=Antigravity", headers=auth_headers)
        record("Global Search: GET /api/search/?q=...", res.status_code == 200, f"Results returned")
    except Exception as e:
        record("Global Search: GET /api/search/", False, str(e))

    # 12. CLEANUP: Delete created MOU, file, and folder
    if created_mou_id:
        try:
            res = session.delete(f"{BASE_URL}/api/mous/{created_mou_id}/", headers=auth_headers)
            record("MOU: DELETE /api/mous/:id/", res.status_code in [200, 204], f"Status: {res.status_code}")
        except Exception as e:
            record("MOU: DELETE /api/mous/:id/", False, str(e))

    if created_folder_id:
        try:
            res = session.delete(f"{BASE_URL}/api/folders/{created_folder_id}/", headers=auth_headers)
            record("Folders: DELETE /api/folders/:id/ (Soft Delete)", res.status_code in [200, 204], f"Status: {res.status_code}")
        except Exception as e:
            record("Folders: DELETE /api/folders/:id/", False, str(e))

    # 13. RECYCLE BIN: Check recycled items
    try:
        res = session.get(f"{BASE_URL}/api/recycle-bin/", headers=auth_headers)
        data = res.json()
        folders_bin = data.get("folders", [])
        record("Recycle Bin: GET /api/recycle-bin/", res.status_code == 200, f"{len(folders_bin)} folders in bin")
    except Exception as e:
        record("Recycle Bin: GET /api/recycle-bin/", False, str(e))

    # 14. PERMANENT CLEANUP in recycle bin
    if created_folder_id:
        try:
            res = session.post(f"{BASE_URL}/api/recycle-bin/permanent-delete/", headers=auth_headers, json={
                "items": [{"id": created_folder_id, "type": "folder"}]
            })
            record("Recycle Bin: Permanent Delete Folder", res.status_code in [200, 204], f"Cleaned up test folder")
        except Exception as e:
            record("Recycle Bin: Permanent Delete", False, str(e))

    # SUMMARY
    print("\n" + "=" * 60)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    print(f"TEST SUITE COMPLETE: {passed} PASSED, {failed} FAILED out of {len(results)} tests.")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
