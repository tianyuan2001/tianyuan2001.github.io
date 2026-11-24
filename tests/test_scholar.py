import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('crawler', Path(__file__).resolve().parents[1] / 'google_scholar_crawler/main.py')
crawler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(crawler)


class ScholarDataTests(unittest.TestCase):
    def test_missing_count_does_not_become_zero(self):
        for count in (None, -1, '100', True):
            with self.subTest(count=count), self.assertRaises(ValueError):
                crawler.serialize_author({'name': 'Author', 'citedby': count})

    def test_zero_and_incomplete_publications(self):
        result = crawler.serialize_author({'name': 'Author', 'citedby': 0, 'publications': [
            {'author_pub_id': 'user:paper', 'num_citations': 0},
            {'author_pub_id': 'user:missing'},
            {'num_citations': 5},
        ]})
        self.assertEqual(result['citedby'], 0)
        self.assertEqual(result['publications'], {'user:paper': {'num_citations': 0, 'title': ''}})
        self.assertTrue(result['updated'].endswith('+00:00'))


if __name__ == '__main__':
    unittest.main()
