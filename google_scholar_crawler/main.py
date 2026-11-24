"""Fetch a public Scholar profile. A failed fetch never overwrites published data."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path



def scholar_id():
    import yaml
    config = yaml.safe_load((Path(__file__).resolve().parents[1] / '_config.yml').read_text())
    value = os.environ.get('GOOGLE_SCHOLAR_ID', '').strip() or config['scholar']['id']
    if not value or not all(c.isalnum() or c in '_-' for c in value):
        raise ValueError('Set scholar.id in _config.yml to the user= value from your public Scholar URL.')
    return value


def serialize_author(author):
    count = author.get('citedby')
    if type(count) is not int or count < 0:
        raise ValueError('Scholar returned no valid citation count; keeping previous published data.')
    publications = {}
    for paper in author.get('publications', []):
        paper_id = paper.get('author_pub_id')
        citations = paper.get('num_citations')
        if paper_id and type(citations) is int and citations >= 0:
            publications[paper_id] = {'num_citations': citations, 'title': paper.get('bib', {}).get('title', '')}
    return {
        'name': author['name'],
        'citedby': count,
        'updated': datetime.now(timezone.utc).isoformat(),
        'publications': publications,
    }


def main():
    from scholarly import scholarly
    scholarly.set_timeout(30)
    scholarly.set_retries(2)
    author = scholarly.search_author_id(scholar_id())
    scholarly.fill(author, sections=['basics', 'indices', 'publications'])
    data = serialize_author(author)
    output = Path(os.environ.get('OUTPUT_DIR', 'results'))
    output.mkdir(parents=True, exist_ok=True)
    (output / 'gs_data.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    badge = {'schemaVersion': 1, 'label': 'citations', 'message': str(data['citedby'])}
    (output / 'gs_data_shieldsio.json').write_text(json.dumps(badge) + '\n')
    print(f"Fetched {data['citedby']} citations and {len(data['publications'])} publications.")


if __name__ == '__main__':
    main()
