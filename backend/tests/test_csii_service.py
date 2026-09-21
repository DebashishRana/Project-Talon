import unittest

from integration.csii_service import MODE, analyze_demo


class CSIIDemoServiceTests(unittest.TestCase):
    def analyze(self, scenario):
        return analyze_demo(
            secret="test-only-secret",
            name="Test Person",
            dob="1990-01-01",
            document_number="P1234567",
            document_type="PASSPORT",
            nationality="IND",
            scenario=scenario,
        )

    def test_clear_scenario_has_no_alerts(self):
        result = self.analyze("clear")

        self.assertEqual(result["mode"], MODE)
        self.assertEqual(result["status"], "CLEAR")
        self.assertEqual(result["anomalies"], [])
        self.assertGreaterEqual(len(result["graph"]["nodes"]), 4)

    def test_travel_alert_detects_impossible_travel(self):
        result = self.analyze("travel_alert")

        self.assertEqual(result["status"], "REVIEW")
        self.assertEqual([item["type"] for item in result["anomalies"]], ["IMPOSSIBLE_TRAVEL"])

    def test_combined_scenario_exercises_all_demo_rules(self):
        result = self.analyze("combined")
        alert_types = {item["type"] for item in result["anomalies"]}

        self.assertEqual(result["status"], "REVIEW")
        self.assertSetEqual(
            alert_types,
            {"IDENTITY_HOPPING", "DOB_DIVERGENCE", "DOCUMENT_REUSE", "IMPOSSIBLE_TRAVEL"},
        )


if __name__ == "__main__":
    unittest.main()
