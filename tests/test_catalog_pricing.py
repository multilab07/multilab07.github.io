import pytest

def test_company_catalogue_tabs_and_independent_pricing(client):
    # 1. Fetch companies
    res = client.get("/api/companies")
    assert res.status_code == 200
    companies = res.get_json()
    assert len(companies) >= 3

    company_names = [c["name"] for c in companies]
    assert "Apollo Diagnostics" in company_names
    assert "PathCare" in company_names
    assert "Primgen" in company_names

    # Check is_primary_tab
    apollo = next(c for c in companies if c["name"] == "Apollo Diagnostics")
    pathcare = next(c for c in companies if c["name"] == "PathCare")
    primgen = next(c for c in companies if c["name"] == "Primgen")
    assert apollo["is_primary_tab"] is True
    assert pathcare["is_primary_tab"] is True
    assert primgen["is_primary_tab"] is True

    # 2. Verify all 11 required categories
    res = client.get("/api/categories")
    assert res.status_code == 200
    categories = res.get_json()
    expected_categories = [
        "Blood tests", "Urine tests", "Stool tests", "Thyroid tests",
        "Liver and kidney function tests", "Diabetes tests", "Lipid profile",
        "Vitamin and hormone tests", "Cancer-related laboratory tests",
        "Infection-related tests", "Health packages"
    ]
    for cat in expected_categories:
        assert cat in categories, f"Expected category '{cat}' missing"

    # 3. Verify independent company pricing for CBC test
    apollo_tests = client.get(f"/api/tests?company_id={apollo['id']}").get_json()
    pathcare_tests = client.get(f"/api/tests?company_id={pathcare['id']}").get_json()
    primgen_tests = client.get(f"/api/tests?company_id={primgen['id']}").get_json()

    apollo_cbc = next((t for t in apollo_tests if t["code"] == "CBC"), None)
    pathcare_cbc = next((t for t in pathcare_tests if t["code"] == "CBC"), None)
    primgen_cbc = next((t for t in primgen_tests if t["code"] == "CBC"), None)

    assert apollo_cbc is not None
    assert pathcare_cbc is not None
    assert primgen_cbc is not None

    # Verify verified different company pricing
    assert apollo_cbc["price"] == 350.0
    assert pathcare_cbc["price"] == 300.0
    assert primgen_cbc["price"] == 320.0
