"""Exercise the workflow's actual publish script against a local bare remote."""
import os
from pathlib import Path
import subprocess
import tempfile
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PublishTests(unittest.TestCase):
    def test_first_publish_and_update_preserve_history(self):
        workflow = (ROOT / '.github/workflows/google_scholar_crawler.yaml').read_text()
        step = workflow.split('- name: Publish successful results')[1].split('- name: Explain failed update')[0]
        script = textwrap.dedent(step.split('run: |\n')[1])
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            remote = base / 'remote.git'
            repo = base / 'repo'
            repo.mkdir()
            def git(*args, cwd=repo):
                return subprocess.check_output(['git', *args], cwd=cwd, stderr=subprocess.STDOUT, text=True).strip()
            git('init', '--bare', str(remote))
            git('init', '-b', 'main')
            git('config', 'user.name', 'Test')
            git('config', 'user.email', 'test@example.com')
            (repo / 'source.txt').write_text('homepage')
            git('add', '.')
            git('commit', '-m', 'Initial homepage')
            main = git('rev-parse', 'HEAD')
            git('remote', 'add', 'origin', str(remote))
            git('push', '-u', 'origin', 'main')
            output = base / 'output'
            output.mkdir()
            for count in [10, 12]:
                (output / 'gs_data.json').write_text('{"citedby":%d}' % count)
                (output / 'gs_data_shieldsio.json').write_text('{"message":"%d"}' % count)
                stats = base / f'stats-{count}'
                env = dict(os.environ, OUTPUT_DIR=str(output), STATS_DIR=str(stats))
                result = subprocess.run(['bash', '-c', script], cwd=repo, env=env, text=True, capture_output=True)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                git('worktree', 'remove', str(stats))
            git('fetch', 'origin', 'google-scholar-stats')
            self.assertEqual(git('rev-list', '--count', 'FETCH_HEAD'), '2')
            self.assertEqual(git('show', 'FETCH_HEAD:gs_data.json'), '{"citedby":12}')
            self.assertEqual(git('ls-tree', '--name-only', 'FETCH_HEAD').splitlines(), ['gs_data.json', 'gs_data_shieldsio.json'])
            self.assertEqual(git('rev-parse', 'main'), main)


if __name__ == '__main__':
    unittest.main()
