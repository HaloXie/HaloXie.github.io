#!/usr/bin/env ruby
# frozen_string_literal: true

require "date"
require "json"
require "nokogiri"
require "pathname"
require "set"
require "uri"
require "yaml"
require "zlib"

ROOT = Pathname.new(__dir__).parent
SITE = ROOT.join("_site")
ORIGIN = "https://halo.xin"
LANGUAGES = { "zh-CN" => "", "en" => "/en" }.freeze

def source_front_matter(path)
  source = path.read
  match = source.match(/\A---\s*\n(.*?)\n---\s*\n/m)
  raise "#{path}: missing front matter" unless match

  YAML.safe_load(match[1], permitted_classes: [Date, Time], aliases: true) || {}
end

POSTS_BY_LANG = LANGUAGES.to_h do |language, _prefix|
  posts = ROOT.glob("_posts/#{language}/*.md").sort.map do |path|
    data = source_front_matter(path)
    {
      "page_id" => data.fetch("page_id"),
      "permalink" => data.fetch("permalink"),
      "redirect_from" => Array(data["redirect_from"])
    }
  end
  [language, posts]
end.freeze
PAIRED_POST_IDS = POSTS_BY_LANG.values.map { |posts| posts.map { |post| post.fetch("page_id") } }.reduce(:&).freeze
POST_PATHS_BY_LANG = LANGUAGES.to_h do |language, prefix|
  paths = POSTS_BY_LANG.fetch(language).map { |post| "#{prefix}#{post.fetch('permalink')}" }.to_set
  [language, paths]
end.freeze
POSTS_BY_RENDERED_PATH = LANGUAGES.each_with_object({}) do |(language, prefix), result|
  POSTS_BY_LANG.fetch(language).each do |post|
    result["#{prefix}#{post.fetch('permalink')}"] = post.merge("language" => language)
  end
end.freeze
CURRENT_POST_PATHS = POSTS_BY_RENDERED_PATH.keys.to_set.freeze
ROUTE_HISTORY = YAML.safe_load(ROOT.join("scripts/content-route-history.yml").read).fetch("redirects").freeze
LEGACY_REDIRECTS_BY_LANG = LANGUAGES.to_h do |language, prefix|
  redirects = ROUTE_HISTORY.each_with_object({}) do |entry, result|
    next unless Array(entry.fetch("languages")).include?(language)

    result["#{prefix}#{entry.fetch('from')}"] = "#{prefix}#{entry.fetch('to')}"
  end
  [language, redirects.freeze]
end.freeze
LEGACY_REDIRECTS = LEGACY_REDIRECTS_BY_LANG.values.reduce({}, :merge).freeze
LEGACY_REDIRECT_PATHS = LEGACY_REDIRECTS.keys.to_set.freeze
SITE_LOCALES = YAML.safe_load(ROOT.join("_data/site-locales.yml").read).freeze
TAXONOMIES = YAML.safe_load(ROOT.join("_data/taxonomies.yml").read).freeze
SERIES = YAML.safe_load(ROOT.join("_data/series.yml").read).fetch("series").freeze
SERIES_POSTS = LANGUAGES.each_with_object({}) do |(language, prefix), posts|
  SERIES.reject { |series| series["status"] == "planned" }.each do |series|
    lessons = series.fetch("stages").flat_map { |stage| stage.fetch("lessons") }
    published_count = lessons.count do |lesson|
      status = lesson.fetch("statuses", {}).fetch(language, lesson.fetch("status"))
      status == "published"
    end

    lessons.each do |lesson|
      lesson_status = lesson.fetch("statuses", {}).fetch(language, lesson.fetch("status"))
      next unless lesson_status == "published"

      lesson_path = lesson.fetch("paths", {})[language]
      next unless lesson_path

      posts["#{prefix}#{lesson_path}"] = {
        "series_path" => "#{prefix}#{series.fetch('path')}",
        "series_title" => series.fetch("locales").fetch(language).fetch("title"),
        "lesson_number" => lesson.fetch("number"),
        "published_count" => published_count,
        "total_count" => lessons.length,
        "language" => language
      }
    end
  end
end.freeze
PAGE_DESCRIPTIONS = {
  "/learn/" => {
    "zh-CN" => "按阶段学习完整主题，从基础概念走到可运行、可验证的项目。",
    "en" => "Follow staged learning paths from first principles to runnable, verifiable projects."
  },
  "/projects/" => {
    "zh-CN" => "正在建设的开源基础设施，以及值得保留的成长坐标。",
    "en" => "Open-source infrastructure in progress, plus a few meaningful waypoints."
  },
  "/learn/agent-zero-to-one/" => {
    "zh-CN" => "用 28 篇短课建立 Agent 的正确心智模型，并用 Pi 完成一个证据优先的技术研究 Agent。",
    "en" => "Build the right agent engineering mental model in 28 short lessons, then ship an evidence-first research agent with Pi."
  }
}.freeze
errors = []

# The design system has one source of truth. Page-level Sass may consume or
# alias semantic tokens, but must not grow another palette beside Base.
style_entry = ROOT.join("assets/css/jekyll-theme-chirpy.scss").read
base_style = ROOT.join("_sass/custom/_base.scss").read
reading_highlights_style = ROOT.join("plugins/reading-highlights/reading-highlights.css").read
post_layout = ROOT.join("_layouts/post.html").read
required_base_tokens = %w[
  --font-display
  --font-heading
  --font-ui
  --font-prose
  --font-mono
  --canvas
  --surface
  --ink
  --border
  --accent
  --highlight
  --highlight-soft
  --radius-md
  --motion-fast
  --media-aspect
]

errors << "style entry must load custom/base" unless style_entry.include?("@use 'custom/base';")
required_base_tokens.each do |token|
  errors << "base style missing #{token}" unless base_style.include?(token)
end
override_styles = {
  "page override Sass" => style_entry,
  "reading highlights component CSS" => reading_highlights_style
}
override_styles.each do |label, source|
  if source.match?(/#[0-9a-f]{3,8}\b|rgba?\(/i)
    errors << "#{label} contains raw color values; move them to custom/base"
  end
end
unless post_layout.include?('w="1200" h="675"')
  errors << "post cover dimensions must follow the Base 1200x675 media contract"
end

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

def content_post_links(doc)
  doc.css("a[href]")
    .reject { |node| node.ancestors.any? { |ancestor| ancestor["class"].to_s.split.include?("language-switcher") } }
    .map { |node| internal_path(node["href"]) }
    .select { |href| CURRENT_POST_PATHS.include?(href) || LEGACY_REDIRECT_PATHS.include?(href) }
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

def lesson_status(lesson, language)
  lesson.fetch("statuses", {}).fetch(language, lesson.fetch("status"))
end

def assert_discovery_links(doc, url, alternates, switch_paths, errors)
  rendered_alternates = doc.css('link[rel="alternate"][hreflang]').to_h { |node| [node["hreflang"], node["href"]] }
  errors << "#{url}: wrong hreflang set #{rendered_alternates.inspect}" unless rendered_alternates == alternates

  switcher_navs = doc.css("#topbar nav.language-switcher")
  errors << "#{url}: expected one language switcher, got #{switcher_navs.length}" unless switcher_navs.length == 1
  errors << "#{url}: sidebar must not contain a language switcher" unless doc.css("#sidebar .language-switcher").empty?
  trigger = switcher_navs.at_css("a.language-trigger[data-bs-toggle='dropdown']")
  errors << "#{url}: missing topbar language dropdown trigger" unless trigger
  errors << "#{url}: language trigger must use fa-language" unless trigger&.at_css("i.fa-language")
  errors << "#{url}: language trigger must expose collapsed state" unless trigger&.[]("aria-expanded") == "false"
  switcher = switcher_navs.css("a.language-link")
  rendered_switch_paths = switcher.map { |node| internal_path(node["href"]) }.sort
  errors << "#{url}: wrong switcher targets #{rendered_switch_paths.inspect}" unless rendered_switch_paths == switch_paths.sort
  errors << "#{url}: switcher contains a template placeholder" if switcher.any? { |node| node["href"].match?(/[:{}]/) }

  switcher_contract = switcher.to_h do |node|
    [node["data-language-preference"], {
      "text" => node.at_css("span")&.text&.strip,
      "lang" => node["lang"],
      "hreflang" => node["hreflang"],
      "aria-label" => node["aria-label"],
      "check" => !node.at_css("i.language-check.fa-check").nil?
    }]
  end
  expected_switcher_contract = {
    "zh" => { "text" => "中文", "lang" => "zh-CN", "hreflang" => "zh-CN", "aria-label" => "切换到中文", "check" => true },
    "en" => { "text" => "English", "lang" => "en", "hreflang" => "en", "aria-label" => "Switch to English", "check" => true }
  }
  errors << "#{url}: wrong language switcher contract #{switcher_contract.inspect}" unless switcher_contract == expected_switcher_contract

  current_links = switcher.select { |node| node["aria-current"] == "page" }
  errors << "#{url}: expected one current language, got #{current_links.length}" unless current_links.length == 1
  expected_preference = url.start_with?("/en/") ? "en" : "zh"
  if current_links.first && current_links.first["data-language-preference"] != expected_preference
    errors << "#{url}: wrong current language #{current_links.first['data-language-preference'].inspect}"
  end

  counterpart_path = switch_paths.find { |path| path != url }
  rendered_trigger_path = internal_path(trigger&.[]("href"))
  unless rendered_trigger_path == counterpart_path
    errors << "#{url}: language trigger must fall back to counterpart #{counterpart_path.inspect}, got #{rendered_trigger_path.inspect}"
  end

  (alternates.values + switch_paths).uniq.each do |target|
    errors << "#{url}: discovery target does not exist #{target}" unless site_file(target).file?
  end
end

expected_pages = {}
LANGUAGES.each do |lang, prefix|
  expected_pages["#{prefix}/"] = lang
  expected_pages["#{prefix}/learn/"] = lang
  expected_pages["#{prefix}/projects/"] = lang
  SERIES.reject { |series| series["status"] == "planned" }.each do |series|
    expected_pages["#{prefix}#{series.fetch('path')}"] = lang
  end
  POST_PATHS_BY_LANG.fetch(lang).each { |path| expected_pages[path] = lang }
end

# The public message page is localized but intentionally absent from the primary tabs.
LANGUAGES.each do |lang, prefix|
  url = "#{prefix}/message/"
  doc = document(site_file(url), errors)
  next unless doc

  expected_description = if lang == "en"
                           "Leave Halo a public message to discuss an article or share feedback."
                         else
                           "在 Halo 的博客留言，与我讨论文章内容或分享建议。"
                         end
  assert_metadata(doc, url, errors, expected_description)
  assert_discovery_links(doc, url, expected_alternates("/message/"), ["/message/", "/en/message/"], errors)
  errors << "#{url}: html lang must be #{lang}" unless doc.at("html")&.[]("lang") == lang

  source = doc.to_html
  errors << "#{url}: missing Giscus client" unless source.include?("https://giscus.app/client.js")
  errors << "#{url}: Giscus must map discussions by pathname" unless source.include?("'data-mapping': 'pathname'")
  errors << "#{url}: Giscus must use HaloXie/HaloXie.github.io" unless source.include?("'data-repo': 'HaloXie/HaloXie.github.io'")
end

expected_pages.each do |url, lang|
  doc = document(site_file(url), errors)
  next unless doc

  prefix = LANGUAGES.fetch(lang)
  base_path = url.sub(%r{\A/en}, "")
  assert_metadata(doc, url, errors, PAGE_DESCRIPTIONS.dig(base_path, lang))
  errors << "#{url}: html lang must be #{lang}" unless doc.at("html")&.[]("lang") == lang

  post = POSTS_BY_RENDERED_PATH[url]
  if post && !PAIRED_POST_IDS.include?(post.fetch("page_id"))
    rendered_alternates = doc.css('link[rel="alternate"][hreflang]').to_h { |node| [node["hreflang"], node["href"]] }
    expected_single_language_alternates = {
      "zh-CN" => "#{ORIGIN}#{base_path}",
      "x-default" => "#{ORIGIN}#{base_path}"
    }
    errors << "#{url}: wrong pending-translation hreflang set #{rendered_alternates.inspect}" unless rendered_alternates == expected_single_language_alternates
    switcher_navs = doc.css("#topbar-actions nav.language-switcher")
    errors << "#{url}: pending-translation post must expose one topbar language switcher" unless switcher_navs.length == 1
    switch_links = switcher_navs.css("a.language-link")
    errors << "#{url}: pending-translation switcher must contain only the current language" unless switch_links.length == 1
    current_link = switch_links.first
    errors << "#{url}: pending-translation switcher points away from the current post" unless internal_path(current_link&.[]("href")) == base_path
    errors << "#{url}: pending-translation switcher must mark the current language" unless current_link&.[]("aria-current") == "page"
  else
    assert_discovery_links(doc, url, expected_alternates(base_path), [base_path, "/en#{base_path}"], errors)
  end

  post_links = content_post_links(doc)
  wrong_links = post_links.reject { |href| POST_PATHS_BY_LANG.fetch(lang).include?(href) }
  errors << "#{url}: cross-language post links #{wrong_links.uniq.inspect}" unless wrong_links.empty?
end

LANGUAGES.each do |lang, prefix|
  learn_url = "#{prefix}/learn/"
  learn_doc = document(site_file(learn_url), errors)
  if learn_doc
    errors << "#{learn_url}: expected #{SERIES.length} learning-path cards" unless learn_doc.css(".learning-hub .series-card").length == SERIES.length
    expected_series_paths = SERIES.reject { |series| series["status"] == "planned" }.map { |series| "#{prefix}#{series.fetch('path')}" }
    series_links = learn_doc.css(".series-card__link").map { |node| internal_path(node["href"]) }
    errors << "#{learn_url}: wrong series links #{series_links.inspect}" unless series_links == expected_series_paths
    errors << "#{learn_url}: planned series must not expose a link" unless learn_doc.css(".series-card--planned a").empty?
    errors << "#{learn_url}: expected one planned-series note" unless learn_doc.css(".series-card--planned .series-card__planned-note").length == 1
  end

  SERIES.reject { |series| series["status"] == "planned" }.each do |series|
    series_url = "#{prefix}#{series.fetch('path')}"
    series_doc = document(site_file(series_url), errors)
    next unless series_doc

    lessons = series.fetch("stages").flat_map { |stage| stage.fetch("lessons") }
    published_count = lessons.count { |lesson| lesson_status(lesson, lang) == "published" }
    planned_count = lessons.count { |lesson| lesson_status(lesson, lang) == "planned" }
    errors << "#{series_url}: expected #{series.fetch('stages').length} stages" unless series_doc.css(".series-stage").length == series.fetch("stages").length
    errors << "#{series_url}: expected #{lessons.length} lessons" unless series_doc.css(".series-lesson").length == lessons.length
    errors << "#{series_url}: expected #{published_count} published lessons" unless series_doc.css(".series-lesson--published a").length == published_count
    errors << "#{series_url}: expected #{planned_count} planned lessons" unless series_doc.css(".series-lesson--planned > div").length == planned_count
    breadcrumb_parent = series_doc.at_css("#breadcrumb a[href='#{prefix}/learn/']")
    errors << "#{series_url}: missing learning-path breadcrumb" unless breadcrumb_parent
  end

  categories_url = "#{prefix}/categories/"
  categories_doc = document(site_file(categories_url), errors)
  if categories_doc
    errors << "#{categories_url}: expected 4 curated category tiles" unless categories_doc.css(".category-catalog .category-tile").length == 4
    errors << "#{categories_url}: legacy folder cards remain" unless categories_doc.css(".card.categories").empty?
  end
end

# Reading highlights are an article-only progressive enhancement. The rendered
# contract protects resource scoping and the accessible bilingual toggle.
SITE.glob("**/*.html").each do |path|
  relative = path.relative_path_from(SITE).to_s
  rendered_url = "/#{relative.sub(%r{index\.html\z}, '')}"
  next if LEGACY_REDIRECT_PATHS.include?(rendered_url)

  doc = Nokogiri::HTML(path.read)
  is_post = CURRENT_POST_PATHS.include?(rendered_url)
  bootstraps = doc.css("script[data-reading-highlights-bootstrap]")
  styles = doc.css('link[rel="stylesheet"][href$="/plugins/reading-highlights/reading-highlights.css"]')
  scripts = doc.css('script[src$="/plugins/reading-highlights/reading-highlights.js"][defer]')
  toggles = doc.css("#reading-highlights-toggle[data-reading-highlights-toggle]")

  unless is_post
    errors << "#{relative}: non-post page contains reading highlights bootstrap" unless bootstraps.empty?
    errors << "#{relative}: non-post page loads reading highlights stylesheet" unless styles.empty?
    errors << "#{relative}: non-post page loads reading highlights script" unless scripts.empty?
    errors << "#{relative}: non-post page exposes reading highlights toggle" unless toggles.empty?
    next
  end

  post_url = rendered_url
  series_contract = SERIES_POSTS[post_url]
  series_kickers = doc.css("article > header .post-series-kicker")
  series_returns = doc.css(".post-tail-wrapper .post-series-return")

  if series_contract
    errors << "#{relative}: expected one series header link" unless series_kickers.length == 1
    errors << "#{relative}: expected one series return link" unless series_returns.length == 1

    expected_series_path = series_contract.fetch("series_path")
    expected_series_title = series_contract.fetch("series_title")
    expected_lesson_label = if series_contract.fetch("language") == "en"
                              "Lesson #{series_contract.fetch('lesson_number')}"
                            else
                              "第 #{series_contract.fetch('lesson_number')} 课"
                            end
    expected_progress = "#{series_contract.fetch('published_count')}/#{series_contract.fetch('total_count')}"
    header_link = series_kickers.at_css("a.post-series-link")
    return_link = series_returns.first

    errors << "#{relative}: wrong series header target" unless internal_path(header_link&.[]("href")) == expected_series_path
    errors << "#{relative}: wrong series return target" unless internal_path(return_link&.[]("href")) == expected_series_path
    errors << "#{relative}: missing series title" unless header_link&.text&.include?(expected_series_title)
    errors << "#{relative}: missing lesson label" unless header_link&.text&.include?(expected_lesson_label)
    errors << "#{relative}: missing series progress" unless header_link&.text&.include?(expected_progress)
  else
    errors << "#{relative}: ordinary post contains a series header" unless series_kickers.empty?
    errors << "#{relative}: ordinary post contains a series return link" unless series_returns.empty?
  end

  errors << "#{relative}: expected header taxonomy navigation" unless doc.css("article > header .post-taxonomy").length == 1
  errors << "#{relative}: category links remain in the post tail" unless doc.css('.post-tail-wrapper a[href*="/categories/"]').empty?
  errors << "#{relative}: tag links remain in the post tail" unless doc.css('.post-tail-wrapper a[href*="/tags/"]').empty?

  errors << "#{relative}: expected one reading highlights bootstrap, got #{bootstraps.length}" unless bootstraps.length == 1
  errors << "#{relative}: expected one reading highlights stylesheet, got #{styles.length}" unless styles.length == 1
  errors << "#{relative}: expected one deferred reading highlights script, got #{scripts.length}" unless scripts.length == 1
  errors << "#{relative}: expected one reading highlights toggle, got #{toggles.length}" unless toggles.length == 1

  toggle = toggles.first
  expected_enabled_label = relative.start_with?("en/") ? "Turn off reading highlights" : "关闭重点高亮"
  expected_disabled_label = relative.start_with?("en/") ? "Turn on reading highlights" : "开启重点高亮"
  errors << "#{relative}: reading highlights toggle must be a button" unless toggle&.name == "button"
  errors << "#{relative}: reading highlights toggle must stay hidden before runtime sync" unless toggle&.key?("hidden")
  errors << "#{relative}: reading highlights toggle exposes stale aria-pressed" if toggle&.key?("aria-pressed")
  errors << "#{relative}: reading highlights toggle exposes stale aria-label" if toggle&.key?("aria-label")
  errors << "#{relative}: reading highlights toggle exposes stale title" if toggle&.key?("title")
  errors << "#{relative}: wrong enabled label contract" unless toggle&.[]("data-enabled-label") == expected_enabled_label
  errors << "#{relative}: wrong disabled label contract" unless toggle&.[]("data-disabled-label") == expected_disabled_label
  errors << "#{relative}: reading highlights toggle must stay in topbar-actions" unless toggle&.ancestors&.any? { |node| node["id"] == "topbar-actions" }

  bootstrap_source = bootstraps.first&.text.to_s
  bootstrap_contract = [
    "localStorage.getItem('halo:reading-highlights')",
    "['disabled', 'off', 'false', '0']",
    "enabled = true",
    "document.documentElement.dataset.readingHighlights = enabled ? 'on' : 'off'"
  ]
  missing_bootstrap_contract = bootstrap_contract.reject { |fragment| bootstrap_source.include?(fragment) }
  errors << "#{relative}: incomplete reading highlights bootstrap #{missing_bootstrap_contract.inspect}" unless missing_bootstrap_contract.empty?

  source = path.read
  bootstrap_position = source.index("data-reading-highlights-bootstrap")
  stylesheet_position = source.index("/plugins/reading-highlights/reading-highlights.css")
  errors << "#{relative}: reading highlights bootstrap must precede stylesheet" unless bootstrap_position && stylesheet_position && bootstrap_position < stylesheet_position
end

highlights_script = ROOT.join("plugins/reading-highlights/reading-highlights.js").read
highlights_script_contract = [
  "const STORAGE_KEY = 'halo:reading-highlights'",
  "article[data-toc] > .content",
  "Math.floor(proseBlockCount * DENSITY)",
  "usedSections.has(item.candidate.section)",
  "classList.add(HIGHLIGHT_CLASS)",
  "aria-pressed",
  "data-reading-highlights-ready",
  "button.hidden = false",
  "localStorage"
]
missing_highlights_script_contract = highlights_script_contract.reject { |fragment| highlights_script.include?(fragment) }
errors << "reading highlights runtime contract incomplete #{missing_highlights_script_contract.inspect}" unless missing_highlights_script_contract.empty?

highlights_styles = ROOT.join("plugins/reading-highlights/reading-highlights.css").read
highlights_style_contract = [
  "html[data-reading-highlights='on'] .reading-highlight",
  "--reading-highlight-bg: var(--highlight-soft)",
  "--reading-highlight-mark: var(--highlight)",
  "box-shadow: inset",
  "text-decoration-line: underline",
  "#reading-highlights-toggle:not([data-reading-highlights-ready])",
  "var(--motion-fast)",
  "var(--focus-width)",
  "prefers-reduced-motion: reduce",
  "forced-colors: active",
  "focus-visible"
]
missing_highlights_style_contract = highlights_style_contract.reject { |fragment| highlights_styles.include?(fragment) }
errors << "reading highlights style contract incomplete #{missing_highlights_style_contract.inspect}" unless missing_highlights_style_contract.empty?

package_scripts = JSON.parse(ROOT.join("package.json").read).fetch("scripts")
errors << "default npm test must run reading highlights tests" unless package_scripts["test"] == "npm run test:reading-highlights"

workflow_source = ROOT.join(".github/workflows/pages-deploy.yml").read
npm_test_position = workflow_source.index("run: npm test")
build_position = workflow_source.index("run: bundle exec jekyll b")
errors << "Pages workflow must run npm test before build" unless npm_test_position && build_position && npm_test_position < build_position

# Metadata identity is a site-wide contract, including tabs, archives and 404s.
SITE.glob("**/*.html").each do |path|
  relative = path.relative_path_from(SITE).to_s
  url = "/#{relative.sub(%r{index\.html\z}, '')}"
  url = URI::DEFAULT_PARSER.escape(url)
  next if LEGACY_REDIRECT_PATHS.include?(url)

  language = url.start_with?("/en/") ? "en" : "zh-CN"
  base_path = url.sub(%r{\A/en}, "")
  expected_description = PAGE_DESCRIPTIONS.dig(base_path, language)
  expected_description ||= SITE_LOCALES.fetch(language).fetch("description") unless CURRENT_POST_PATHS.include?(url) || url.end_with?("/message/")
  assert_metadata(Nokogiri::HTML(path.read), url, errors, expected_description)
end

# Every rendered page must expose one Pagefind command palette and its keyboard contract.
SITE.glob("**/*.html").each do |path|
  source = path.read
  relative = path.relative_path_from(SITE).to_s
  rendered_url = "/#{relative.sub(%r{index\.html\z}, '')}"
  next if LEGACY_REDIRECT_PATHS.include?(rendered_url)

  doc = Nokogiri::HTML(source)
  dialogs = doc.css("dialog#command-search-dialog")
  errors << "#{relative}: expected one command search dialog, got #{dialogs.length}" unless dialogs.length == 1
  expected_search_label = relative.start_with?("en/") ? "Search" : "搜索"
  errors << "#{relative}: command search dialog lacks localized aria-label" unless dialogs.first&.[]("aria-label") == expected_search_label
  errors << "#{relative}: obsolete command search title remains" if doc.at_css("#command-search-title")
  errors << "#{relative}: missing command search trigger" unless doc.at_css("#search-trigger[aria-controls='command-search-dialog'][aria-haspopup='dialog']")
  placeholder = doc.at_css("#search-trigger .command-search-placeholder")&.text&.strip
  errors << "#{relative}: wrong command search placeholder #{placeholder.inspect}" unless placeholder == expected_search_label
  errors << "#{relative}: missing Pagefind search input" unless doc.at_css("#command-search-dialog #search-input[aria-controls='search-results']")
  errors << "#{relative}: search close lacks localized aria-label" unless doc.at_css("#command-search-dialog #search-cancel[aria-label='#{relative.start_with?("en/") ? "Cancel" : "取消"}']")
  errors << "#{relative}: missing accessible search results" unless doc.at_css("#command-search-dialog #search-results[aria-live='polite']")
  errors << "#{relative}: search result template must use div listitems" unless doc.at_css("template#command-search-result-template > div.command-search-result[role='listitem']")
  errors << "#{relative}: search result template must not use direct article results" if doc.at_css("template#command-search-result-template > article.command-search-result")

  search_contract = [
    "const pagefindUrl = \"/pagefind/pagefind.js\"",
    "await import(pagefindUrl)",
    "await pagefind.init()",
    "const SEARCH_DEBOUNCE_MS = 300",
    "window.clearTimeout(searchTimer)",
    "scheduleSearch()",
    "}, SEARCH_DEBOUNCE_MS)",
    "event.metaKey || event.ctrlKey",
    "event.key.toLowerCase() === 'k'",
    "dialog.showModal()",
    "if (event.key === 'Escape')",
    "event.stopImmediatePropagation()",
    "closeSearch()",
    "dialog.addEventListener('close'",
    "activeElement?.focus()",
    "currentLanguage === 'en' ? pathname.startsWith('/en/') : !pathname.startsWith('/en/')"
  ]
  missing_search_contract = search_contract.reject { |fragment| source.include?(fragment) }
  errors << "#{relative}: incomplete command search contract #{missing_search_contract.inspect}" unless missing_search_contract.empty?
  errors << "#{relative}: legacy SimpleJekyllSearch found" if source.match?(/SimpleJekyllSearch|simple-jekyll-search/i)
end

search_styles = ROOT.join("assets/css/jekyll-theme-chirpy.scss").read
search_style_contract = [
  "width: clamp(13rem, 18vw, 18rem)",
  "width: min(42rem, calc(100vw - 3rem))",
  "max-height: min(38rem, calc(100dvh - 3rem))",
  "#search-result-wrapper.command-search-results-wrapper",
  "flex: 1 1 auto",
  "min-height: 0",
  "overflow-y: auto",
  "#search-results.command-search-results > .command-search-result",
  "text-align: left"
]
missing_search_styles = search_style_contract.reject { |fragment| search_styles.include?(fragment) }
errors << "search layout contract incomplete #{missing_search_styles.inspect}" unless missing_search_styles.empty?

pagefind_entry_path = SITE.join("pagefind/pagefind-entry.json")
unless pagefind_entry_path.file?
  errors << "missing Pagefind entry: #{pagefind_entry_path.relative_path_from(ROOT)}"
else
  pagefind_entry = JSON.parse(pagefind_entry_path.read)
  expected_page_counts = {
    "zh-cn" => ROOT.glob("_posts/zh-CN/*.md").length,
    "en" => ROOT.glob("_posts/en/*.md").length
  }
  actual_page_counts = pagefind_entry.fetch("languages").transform_values { |language| language.fetch("page_count") }
  errors << "Pagefind language indexes drifted: #{actual_page_counts.inspect}" unless actual_page_counts == expected_page_counts
  errors << "Pagefind version must be 1.5.2" unless pagefind_entry["version"] == "1.5.2"

  pagefind_languages = { "zh-CN" => "zh-cn", "en" => "en" }
  pagefind_languages.each do |language, pagefind_language|
    actual_urls = SITE.glob("pagefind/fragment/#{pagefind_language}_*.pf_fragment").map do |fragment_path|
      payload = Zlib::GzipReader.open(fragment_path, &:read)
      unless payload.start_with?("pagefind_dcd")
        errors << "#{fragment_path.relative_path_from(SITE)}: unknown Pagefind fragment header"
        next
      end
      JSON.parse(payload.delete_prefix("pagefind_dcd")).fetch("url")
    rescue JSON::ParserError, Zlib::GzipFile::Error => e
      errors << "#{fragment_path.relative_path_from(SITE)}: invalid Pagefind fragment: #{e.message}"
      nil
    end.compact.to_set
    expected_urls = POST_PATHS_BY_LANG.fetch(language).map { |path| "#{path}index.html" }.to_set
    errors << "Pagefind #{pagefind_language} URL set drifted: #{actual_urls.inspect}" unless actual_urls == expected_urls
  end
end

errors << "legacy root search.json must not exist" if SITE.join("search.json").exist?
errors << "legacy English search.json must not exist" if SITE.join("en/search.json").exist?
errors << "legacy Chirpy search index must not exist" if SITE.join("assets/js/data/search.json").exist?
errors << "localized legacy Chirpy search index must not exist" if SITE.join("en/assets/js/data/search.json").exist?

LANGUAGES.each do |lang, prefix|

  %w[archives categories tags].each do |section|
    url = "#{prefix}/#{section}/"
    doc = document(site_file(url), errors)
    next unless doc
    links = content_post_links(doc)
    wrong = links.reject { |href| POST_PATHS_BY_LANG.fetch(lang).include?(href) }
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

# Tags keep stable names, but a Chinese-first post may introduce a tag before
# its English counterpart exists.
tag_paths_by_lang = LANGUAGES.to_h do |lang, prefix|
  directory = SITE.join(prefix.delete_prefix("/"), "tags")
  paths = directory.glob("*/index.html").map { |path| "/tags/#{path.parent.basename}/" }.sort
  [lang, paths]
end

tag_paths_by_lang.values.flatten.uniq.each do |tag_path|
  present_languages = LANGUAGES.keys.select { |lang| tag_paths_by_lang.fetch(lang).include?(tag_path) }
  present_languages.each do |lang|
    prefix = LANGUAGES.fetch(lang)
    url = "#{prefix}#{tag_path}"
    doc = document(site_file(url), errors)
    next unless doc
    assert_metadata(doc, url, errors)

    if present_languages.sort == LANGUAGES.keys.sort
      assert_discovery_links(doc, url, expected_alternates(tag_path), [tag_path, "/en#{tag_path}"], errors)
    else
      expected_single_language_alternates = {
        "zh-CN" => "#{ORIGIN}#{tag_path}",
        "x-default" => "#{ORIGIN}#{tag_path}"
      }
      rendered_alternates = doc.css('link[rel="alternate"][hreflang]').to_h { |node| [node["hreflang"], node["href"]] }
      errors << "#{url}: wrong single-language tag hreflang set #{rendered_alternates.inspect}" unless rendered_alternates == expected_single_language_alternates
      errors << "#{url}: single-language tag must not expose a language switcher" unless doc.css("#topbar nav.language-switcher").empty?
    end
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
  POST_PATHS_BY_LANG.fetch(lang).each do |post_path|
    expected = "#{ORIGIN}#{post_path}"
    errors << "#{prefix}/sitemap.xml: missing #{expected}" unless locations.include?(expected)
  end
  legacy_locations = LEGACY_REDIRECTS_BY_LANG.fetch(lang).keys.map { |path| "#{ORIGIN}#{path}" }
  leaked_legacy_locations = locations & legacy_locations
  errors << "#{prefix}/sitemap.xml: legacy redirects must not be indexed #{leaked_legacy_locations.inspect}" unless leaked_legacy_locations.empty?
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
  expected_entry_urls = POST_PATHS_BY_LANG.fetch(lang).map { |path| "#{ORIGIN}#{path}" }.to_set
  feed.xpath("//a:entry", namespace).each do |entry|
    id = entry.at_xpath("a:id", namespace)&.text
    content_src = entry.at_xpath("a:content", namespace)&.[]("src")
    link_href = entry.at_xpath("a:link[@rel='alternate']", namespace)&.[]("href")
    [id, content_src, link_href].each do |url|
      errors << "#{prefix}/feed.xml: entry URL is not a current #{lang} post #{url.inspect}" unless expected_entry_urls.include?(url)
    end
  end
rescue Nokogiri::XML::SyntaxError => e
  errors << "#{prefix}/feed.xml: invalid XML: #{e.message}"
end

errors << "localized assets directory must not exist" if SITE.join("en/assets").exist?
SITE.glob("**/*.html").each do |path|
  source = path.read
  relative = path.relative_path_from(SITE)
  rendered_url = "/#{relative.to_s.sub(%r{index\.html\z}, '')}"
  next if LEGACY_REDIRECT_PATHS.include?(rendered_url)

  doc = Nokogiri::HTML(source)

  errors << "#{relative}: sidebar must not contain a language switcher" unless doc.css("#sidebar .language-switcher").empty?

  preference_scripts = doc.css("script[data-language-preference-controller]")
  errors << "#{relative}: expected one language preference controller, got #{preference_scripts.length}" unless preference_scripts.length == 1
  preference_source = preference_scripts.first&.text.to_s
  preference_contract = [
    "const storageKey = 'halo.language-preference'",
    "const rootPath = \"/\"",
    "const englishRootPath = \"/en/\"",
    "event.target.closest('a[data-language-preference]')",
    "window.location.pathname !== rootPath",
    "navigator.languages?.[0] || navigator.language",
    "/^zh(?:-|$)/i.test(browserLanguage)",
    "window.location.replace(englishRootPath + window.location.search + window.location.hash)"
  ]
  missing_preference_contract = preference_contract.reject { |fragment| preference_source.include?(fragment) }
  unless missing_preference_contract.empty?
    errors << "#{relative}: incomplete language preference contract #{missing_preference_contract.inspect}"
  end
  errors << "#{relative}: language preference script contains a template placeholder" if preference_source.match?(/{{|{%|:THEME/)

  prefix = relative.to_s.start_with?("en/") ? "/en" : ""
  expected_message_path = "#{prefix}/message/"
  rendered_message_paths = doc.css('#sidebar a[aria-label="message"]').map { |node| internal_path(node["href"]) }
  errors << "#{relative}: wrong message contact link #{rendered_message_paths.inspect}" unless rendered_message_paths == [expected_message_path]

  nav_paths = doc.css("#sidebar .nav-item > a").map { |node| internal_path(node["href"]) }
  errors << "#{relative}: hidden message page appears in primary tabs" if nav_paths.include?(expected_message_path)
  expected_nav_paths = [
    "#{prefix}/",
    "#{prefix}/learn/",
    "#{prefix}/projects/",
    "#{prefix}/categories/",
    "#{prefix}/tags/",
    "#{prefix}/archives/",
    "#{prefix}/about/"
  ]
  errors << "#{relative}: wrong primary navigation order #{nav_paths.inspect}" unless nav_paths == expected_nav_paths
  hidden_series_path = "#{prefix}/learn/agent-zero-to-one/"
  errors << "#{relative}: hidden series detail appears in primary tabs" if nav_paths.include?(hidden_series_path)

  github_targets = doc.css('#sidebar a[aria-label="github"]').map { |node| node["href"] }
  errors << "#{relative}: wrong GitHub contact link #{github_targets.inspect}" unless github_targets == ["https://github.com/HaloXie"]
  errors << "#{relative}: public mailto link found" if source.match?(/mailto:/i)
  errors << "#{relative}: private email address found" if source.match?(/minghao\.xie@ddit\.ai/i)
end
errors << "AGENTS.md must not be published at the root" if SITE.join("AGENTS.md").exist?
errors << "AGENTS.md must not be published under /en" if SITE.join("en/AGENTS.md").exist?
cname_files = SITE.glob("**/CNAME").map { |path| path.relative_path_from(SITE).to_s }
errors << "expected only root CNAME, got #{cname_files.inspect}" unless cname_files == ["CNAME"]

LEGACY_REDIRECTS.each do |legacy_path, target_path|
  redirect_file = site_file(legacy_path)
  unless redirect_file.file?
    errors << "legacy redirect missing: #{legacy_path}"
    next
  end

  doc = Nokogiri::HTML(redirect_file.read)
  expected_target = "#{ORIGIN}#{target_path}"
  errors << "#{legacy_path}: wrong redirect canonical" unless doc.at_css('link[rel="canonical"]')&.[]("href") == expected_target
  errors << "#{legacy_path}: redirect must be noindex" unless doc.at_css('meta[name="robots"]')&.[]("content").to_s.split(",").include?("noindex")
  refresh = doc.at_css('meta[http-equiv="refresh"]')&.[]("content")
  errors << "#{legacy_path}: wrong meta refresh #{refresh.inspect}" unless refresh == "0; url=#{expected_target}"
  errors << "#{legacy_path}: redirect fallback link missing" unless doc.at_css("a[href='#{expected_target}']")
  errors << "#{legacy_path}: redirect target does not exist #{target_path}" unless site_file(target_path).file?
end

if errors.empty?
  puts "Rendered localization check passed: language-aware metadata, reading highlights, Pagefind command search, sitemaps, feeds and shared assets."
else
  warn "Rendered localization check failed with #{errors.length} error(s):"
  errors.each { |error| warn "- #{error}" }
  exit 1
end
