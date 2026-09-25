import unittest

from catalog.search import search


class SearchTest(unittest.TestCase):
    def test_exact_substring(self):
        self.assertIn("ThinkPad X1 Carbon", search("thinkpad x1 carbon")[0]["name"])


if __name__ == "__main__":
    unittest.main()
