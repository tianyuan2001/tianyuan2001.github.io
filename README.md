# Tianyuan Zhang — Academic Homepage

Jekyll website for [tianyuan2001.github.io](https://tianyuan2001.github.io).

## Update content

- Publications: `_data/publications.yml`
- News: `_data/news.yml`
- Biography, education and honors: `_pages/about.md`
- Profile, Scholar ID and visitor-map widget ID: `_config.yml`
- Navigation and contact links: `_data/navigation.yml`, `_data/social.yml`

See [维护说明](docs/maintenance.md) for citation troubleshooting, visitor-map setup, previews and checks.

## Preview

```sh
bundle install
bundle exec jekyll serve
```

Push to the configured GitHub Pages source branch to publish. The **Get Citation Data** workflow updates a separate `google-scholar-stats` branch daily and supports manual runs.

## Credits

Based on [AcadHomepage](https://github.com/RayeRen/acad-homepage.github.io) and the Minimal Mistakes theme. See [LICENSE](LICENSE).
