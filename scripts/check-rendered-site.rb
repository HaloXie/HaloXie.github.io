#!/usr/bin/env ruby
# frozen_string_literal: true

require "date"
require "json"
require "nokogiri"
require "pathname"
require "uri"
require "yaml"

ROOT = Pathname.new(__dir__).parent
SITE = ROOT.join("_site")
ORIGIN = "https://halo.xin"
LANGUAGES = { "zh-CN" => "", "en" => "/en" }.freeze
SLUGS = ROOT.glob("_posts/zh-CN/*.md").map { |path| path.basename(".md").to_s.sub(/^\d{4}-\d{2}-\d{2}-/, "") }.sort.freeze
SITE_LOCALES = YAML.safe_load(ROOT.join("_data/site-locales.yml").read).freeze
TAXONOMIES = YAML.safe_load(ROOT.join("_data/taxonomies.yml").read).freeze
errors = []

def document(path, errors)
  unless path.file?
    errors << "missing rendered file: #{path.relative_path_from(ROOT)}"
    return nil
  end

  Nokogiri::HTML(path.read)
end

def internal_path(href)
  href.to_s.sub(%r{\Ahttps://halo\.xin}, "")
end

def site_file(url)
  path = URI::DEFAULT_PARSER.unescape(internal_path(url)).delete_prefix("/")
  path = "index.html" if path.empty?
  path = "#{path}index.html" if path.end_with?("/")
  SITE.join(path)
end

def assert_metadata(doc, url, errors, expected_description = nil)
  absolute_url = "#{ORIGIN}#{url}"
  canonicals = doc.css('link[rel="canonical"]')
  errors << "#{url}: expected one canonical, got #{canonicals.length}" unless canonicals.length == 1
  errors << "#{url}: wrong canonical #{canonicals.first&.[]('href').inspect}" unless canonicals.first&.[]("href") == absolute_url

  og_url = doc.at_css('meta[property="og:url"]')&.[]("content")
  errors << "#{url}: wrong og:url #{og_url.inspect}" unless og_url == absolute_url

  json_ld = doc.at_css('script[type="application/ld+json"]')
  unless json_ld
    errors << "#{url}: missing JSON-LD"
    return
  end

  data = JSON.parse(json_ld.text)
  errors << "#{url}: wrong JSON-LD url #{data['url'].inspect}" unless data["url"] == absolute_url
  main_entity = data["mainEntityOfPage"]
  if main_entity && main_entity["@id"] != absolute_url
    errors << "#{url}: wrong JSON-LD mainEntityOfPage #{main_entity['@id'].inspect}"
  end

  return unless expected_description

  descriptions = {
    "meta description" => doc.at_css('meta[name="description"]')&.[]("content"),
    "Twitter description" => doc.at_css('meta[name="twitter:description"]')&.[]("content"),
    "Open Graph description" => doc.at_css('meta[property="og:description"]')&.[]("content"),
    "JSON-LD description" => data["description"]
  }
  descriptions.each do |source, actual|
    errors << "#{url}: wrong #{source} #{actual.inspect}" unless actual == expected_description
  end
rescue JSON::ParserError => e
  errors << "#{url}: invalid JSON-LD: #{e.message}"
end

def expected_alternates(base_path)
  {
    "zh-CN" => "#{ORIGIN}#{base_path}",
    "en" => "#{ORIGIN}/en#{base_path}",
    "x-default" => "#{ORIGIN}#{base_path}"
  }
end

def assert_discovery_links(doc, url, alternates, switch_paths, errors)
  rendered_alternates = doc.css('link[rel="alternate"][hreflang]').to_h { |node| [node["hreflang"], node["href"]] }
  errors << "#{url}: wrong hreflang set #{rendered_alternates.inspect}" unless rendered_alternates == alternates

  switcher = doc.css(".language-switcher a")
  rendered_switch_paths = switcher.map { |node| internal_path(node["href"]) }.sort
  errors << "#{url}: wrong switcher targets #{rendered_switch_paths.inspect}" unless rendered_switch_paths == switch_paths.sort
  errors << "#{url}: switcher contains a template placeholder" if switcher.any? { |node| node["href"].match?(/[:{}]/) }

  (alternates.values + switch_paths).uniq.each do |target|
    errors << "#{url}: discovery target does not exist #{target}" unless site_file(target).file?
  end
end

expected_pages = {}
LANGUAGES.each do |lang, prefix|
  expected_pages["#{prefix}/"] = lang
  SLUGS.each { |slug| expected_pages["#{prefix}/posts/#{slug}/"] = lang }
end

expected_pages.each do |url, lang|
  doc = document(site_file(url), errors)
  next unless doc

  prefix = LANGUAGES.fetch(lang)
  assert_metadata(doc, url, errors)
  errors << "#{url}: html lang must be #{lang}" unless doc.at("html")&.[]("lang") == lang

  base_path = url.sub(%r{\A/en}, "")
  assert_discovery_links(doc, url, expected_alternates(base_path), [base_path, "/en#{base_path}"], errors)

  post_links = doc.css('a[href*="/posts/"]:not(.language-link)').map { |node| internal_path(node["href"]) }.select { |href| href.start_with?("/") }
  wrong_links = post_links.reject { |href| href.start_with?("#{prefix}/posts/") }
  errors << "#{url}: cross-language post links #{wrong_links.uniq.inspect}" unless wrong_links.empty?
end

# Metadata identity is a site-wide contract, including tabs, archives and 404s.
SITE.glob("**/*.html").each do |path|
  relative = path.relative_path_from(SITE).to_s
  url = "/#{relative.sub(%r{index\.html\z}, '')}"
  url = URI::DEFAULT_PARSER.escape(url)
  language = url.start_with?("/en/") ? "en" : "zh-CN"
  expected_description = SITE_LOCALES.fetch(language).fetch("description") unless url.include?("/posts/")
  assert_metadata(Nokogiri::HTML(path.read), url, errors, expected_description)
end

# Every rendered page that loads search must use the index belonging to its URL language.
SITE.glob("**/*.html").each do |path|
  source = path.read
  next unless source.include?("SimpleJekyllSearch")

  relative = path.relative_path_from(SITE).to_s
  prefix = relative.start_with?("en/") ? "/en" : ""
  expected_search = "json: '#{prefix}/search.json'"
  errors << "#{relative}: search loader must use #{prefix}/search.json" unless source.include?(expected_search)
end

LANGUAGES.each do |lang, prefix|
  source_titles = ROOT.glob("_posts/#{lang}/*.md").map do |path|
    front_matter = path.read.match(/\A---\s*\n(.*?)\n---\s*\n/m)&.[](1)
    YAML.safe_load(front_matter, permitted_classes: [Date, Time], aliases: true).fetch("title")
  end.sort
  search_path = SITE.join(prefix.delete_prefix("/"), "search.json")
  unless search_path.file?
    errors << "missing rendered search index: #{search_path.relative_path_from(ROOT)}"
    next
  end
  search = JSON.parse(search_path.read)
  errors << "#{prefix}/search.json: wrong titles or post count" unless search.map { |entry| entry.fetch("title") }.sort == source_titles
  wrong_urls = search.filter_map do |entry|
    url = entry.fetch("url")
    url unless url.start_with?("#{prefix}/posts/")
  end
  errors << "#{prefix}/search.json: cross-language URLs #{wrong_urls.inspect}" unless wrong_urls.empty?

  %w[archives categories tags].each do |section|
    url = "#{prefix}/#{section}/"
    doc = document(site_file(url), errors)
    next unless doc
    links = doc.css('a[href*="/posts/"]').map { |node| internal_path(node["href"]) }.select { |href| href.start_with?("/") }
    wrong = links.reject { |href| href.start_with?("#{prefix}/posts/") }
    errors << "#{url}: cross-language post links #{wrong.uniq.inspect}" unless wrong.empty?
  end
end

# Localized category names are joined through the authoritative path map.
mapped_category_paths = { "zh-CN" => [], "en" => [] }
TAXONOMIES.fetch("categories").each_value do |paths|
  LANGUAGES.each do |lang, prefix|
    path = paths.fetch(lang)
    mapped_category_paths.fetch(lang) << path
    url = "#{prefix}#{path}"
    doc = document(site_file(url), errors)
    next unless doc

    alternates = {
      "zh-CN" => "#{ORIGIN}#{paths.fetch('zh-CN')}",
      "en" => "#{ORIGIN}/en#{paths.fetch('en')}",
      "x-default" => "#{ORIGIN}#{paths.fetch('zh-CN')}"
    }
    switch_paths = [paths.fetch("zh-CN"), "/en#{paths.fetch('en')}"]
    assert_metadata(doc, url, errors)
    assert_discovery_links(doc, url, alternates, switch_paths, errors)
  end
end

LANGUAGES.each do |lang, prefix|
  directory = SITE.join(prefix.delete_prefix("/"), "categories")
  rendered = directory.glob("*/index.html").map do |path|
    relative = path.relative_path_from(directory).dirname.to_s
    "/categories/#{URI::DEFAULT_PARSER.escape(relative)}/"
  end.sort
  expected = mapped_category_paths.fetch(lang).sort
  errors << "#{prefix}/categories: taxonomy map drift; rendered=#{rendered.inspect}, mapped=#{expected.inspect}" unless rendered == expected
end

# Tags currently have language-neutral stable names, so their counterpart path is identical.
SITE.join("tags").glob("*/index.html").each do |path|
  tag_path = "/tags/#{path.parent.basename}/"
  alternates = expected_alternates(tag_path)
  switch_paths = [tag_path, "/en#{tag_path}"]
  LANGUAGES.each_value do |prefix|
    url = "#{prefix}#{tag_path}"
    doc = document(site_file(url), errors)
    next unless doc
    assert_metadata(doc, url, errors)
    assert_discovery_links(doc, url, alternates, switch_paths, errors)
  end
end

LANGUAGES.each do |lang, prefix|
  sitemap_path = SITE.join(prefix.delete_prefix("/"), "sitemap.xml")
  unless sitemap_path.file?
    errors << "missing sitemap: #{prefix}/sitemap.xml"
    next
  end
  sitemap = Nokogiri::XML(sitemap_path.read) { |config| config.strict }
  namespace = { "s" => "http://www.sitemaps.org/schemas/sitemap/0.9" }
  locations = sitemap.xpath("//s:loc", namespace).map(&:text)
  errors << "#{prefix}/sitemap.xml: empty sitemap" if locations.empty?
  errors << "#{prefix}/sitemap.xml: duplicate loc entries" unless locations.uniq.length == locations.length
  if lang == "en"
    wrong = locations.reject { |location| location.start_with?("#{ORIGIN}/en/") }
  else
    wrong = locations.select { |location| location.start_with?("#{ORIGIN}/en/") }
  end
  errors << "#{prefix}/sitemap.xml: cross-language loc entries #{wrong.inspect}" unless wrong.empty?
  SLUGS.each do |slug|
    expected = "#{ORIGIN}#{prefix}/posts/#{slug}/"
    errors << "#{prefix}/sitemap.xml: missing #{expected}" unless locations.include?(expected)
  end
rescue Nokogiri::XML::SyntaxError => e
  errors << "#{prefix}/sitemap.xml: invalid XML: #{e.message}"
end

LANGUAGES.each do |lang, prefix|
  feed_path = SITE.join(prefix.delete_prefix("/"), "feed.xml")
  unless feed_path.file?
    errors << "missing feed: #{prefix}/feed.xml"
    next
  end
  feed = Nokogiri::XML(feed_path.read) { |config| config.strict }
  namespace = { "a" => "http://www.w3.org/2005/Atom" }
  home_url = "#{ORIGIN}#{prefix}/"
  errors << "#{prefix}/feed.xml: wrong id" unless feed.at_xpath("/a:feed/a:id", namespace)&.text == home_url
  expected_subtitle = SITE_LOCALES.fetch(lang).fetch("description")
  errors << "#{prefix}/feed.xml: wrong subtitle" unless feed.at_xpath("/a:feed/a:subtitle", namespace)&.text == expected_subtitle
  feed.xpath("//a:entry", namespace).each do |entry|
    id = entry.at_xpath("a:id", namespace)&.text
    content_src = entry.at_xpath("a:content", namespace)&.[]("src")
    link_href = entry.at_xpath("a:link[@rel='alternate']", namespace)&.[]("href")
    [id, content_src, link_href].each do |url|
      errors << "#{prefix}/feed.xml: entry URL has wrong language identity #{url.inspect}" unless url&.start_with?("#{ORIGIN}#{prefix}/posts/")
    end
  end
rescue Nokogiri::XML::SyntaxError => e
  errors << "#{prefix}/feed.xml: invalid XML: #{e.message}"
end

errors << "localized assets directory must not exist" if SITE.join("en/assets").exist?
errors << "AGENTS.md must not be published at the root" if SITE.join("AGENTS.md").exist?
errors << "AGENTS.md must not be published under /en" if SITE.join("en/AGENTS.md").exist?
cname_files = SITE.glob("**/CNAME").map { |path| path.relative_path_from(SITE).to_s }
errors << "expected only root CNAME, got #{cname_files.inspect}" unless cname_files == ["CNAME"]

SLUGS.each do |slug|
  errors << "original Chinese URL missing: /posts/#{slug}/" unless SITE.join("posts", slug, "index.html").file?
end

if errors.empty?
  puts "Rendered localization check passed: language-aware metadata, discovery links, search, sitemaps, feeds and shared assets."
else
  warn "Rendered localization check failed with #{errors.length} error(s):"
  errors.each { |error| warn "- #{error}" }
  exit 1
end
