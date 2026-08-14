#!/usr/bin/env ruby
# frozen_string_literal: true

require "date"
require "pathname"
require "yaml"

ROOT = Pathname.new(__dir__).parent
CONFIG_PATH = ROOT.join("_config.yml")
POSTS_PATH = ROOT.join("_posts")
TABS_PATH = ROOT.join("_tabs")
POST_NAME = /\A(?<date>\d{4}-\d{2}-\d{2})-(?<slug>.+)\.md\z/

Post = Struct.new(
  :path,
  :lang,
  :page_id,
  :date,
  :slug,
  :permalink,
  :redirect_from,
  :body,
  :translation_status,
  keyword_init: true
)

def load_yaml(path, source)
  YAML.safe_load(source, permitted_classes: [Date, Time], aliases: true) || {}
rescue Psych::SyntaxError => e
  abort "#{path}: invalid YAML: #{e.message}"
end

def split_front_matter(path)
  source = path.read
  match = source.match(/\A---\s*\n(.*?)\n---\s*\n/m)
  return [nil, nil] unless match

  [load_yaml(path, match[1]), source[match.end(0)..]]
end

config = load_yaml(CONFIG_PATH, CONFIG_PATH.read)
languages = Array(config.fetch("languages"))
errors = []

series_data = load_yaml(ROOT.join("_data/series.yml"), ROOT.join("_data/series.yml").read)
route_history = load_yaml(ROOT.join("scripts/content-route-history.yml"), ROOT.join("scripts/content-route-history.yml").read)
series_paths_by_page_id = {}
series_data.fetch("series").each do |series|
  series.fetch("stages").each do |stage|
    stage.fetch("lessons").each do |lesson|
      page_id = lesson.fetch("page_id")
      series_paths_by_page_id[page_id] = "#{series.fetch('path')}#{page_id}/"
    end
  end
end

errors << "_config.yml: languages must contain exactly zh-CN and en" unless languages.sort == %w[en zh-CN].sort
errors << "_config.yml: default_lang must be zh-CN to preserve existing root URLs" unless config["default_lang"] == "zh-CN"

posts = POSTS_PATH.glob("**/*.md").sort.each_with_object([]) do |path, result|
  relative = path.relative_path_from(ROOT)
  parts = path.relative_path_from(POSTS_PATH).each_filename.to_a
  data, body = split_front_matter(path)

  if data.nil?
    errors << "#{relative}: missing YAML front matter"
    next
  end

  if parts.length != 2 || !languages.include?(parts.first)
    errors << "#{relative}: posts must live directly under _posts/<lang>/"
    next
  end

  match = POST_NAME.match(parts.last)
  unless match
    errors << "#{relative}: expected YYYY-MM-DD-<slug>.md"
    next
  end

  lang = data["lang"]
  page_id = data["page_id"].to_s
  permalink = data["permalink"].to_s
  date = data["date"]
  translation_status = data["translation_status"]
  exclusive_languages = Array(data["lang-exclusive"])
  slug = match[:slug]
  expected_permalink = series_paths_by_page_id.fetch(page_id, "/posts/general/#{slug}/")
  redirect_from = Array(data["redirect_from"])

  errors << "#{relative}: lang must match directory #{parts.first}" unless lang == parts.first
  errors << "#{relative}: page_id is required" if page_id.empty?
  errors << "#{relative}: page_id must equal filename slug #{slug.inspect}" unless page_id == slug
  errors << "#{relative}: permalink must equal #{expected_permalink.inspect}" unless permalink == expected_permalink
  redirect_from.each do |legacy_path|
    unless legacy_path.is_a?(String) && legacy_path.match?(%r{\A/[^?#]+/\z})
      errors << "#{relative}: redirect_from must contain root-relative directory paths, got #{legacy_path.inspect}"
    end
    errors << "#{relative}: redirect_from duplicates current permalink" if legacy_path == permalink
  end
  errors << "#{relative}: duplicate redirect_from entries" unless redirect_from.uniq.length == redirect_from.length
  errors << "#{relative}: front-matter date is required" if date.nil?
  errors << "#{relative}: filename date must match front-matter date" if date && date.strftime("%Y-%m-%d") != match[:date]
  errors << "#{relative}: article body is empty" if body.to_s.strip.length < 200
  unless translation_status.nil? || translation_status == "pending"
    errors << "#{relative}: translation_status must be pending when present"
  end
  if lang == "en" && translation_status
    errors << "#{relative}: English posts must not declare translation_status"
  end
  if translation_status == "pending" && exclusive_languages != ["zh-CN"]
    errors << "#{relative}: pending Chinese posts must declare lang-exclusive: [zh-CN]"
  elsif translation_status.nil? && !exclusive_languages.empty?
    errors << "#{relative}: lang-exclusive is only allowed while translation_status is pending"
  end

  result << Post.new(
    path: relative.to_s,
    lang: lang,
    page_id: page_id,
    date: date,
    slug: slug,
    permalink: permalink,
    redirect_from: redirect_from,
    body: body.to_s,
    translation_status: translation_status
  )
end

posts.group_by(&:page_id).each do |page_id, translations|
  next if page_id.empty?

  by_lang = translations.group_by(&:lang)
  duplicates = by_lang.select { |_lang, entries| entries.length > 1 }.keys
  errors << "#{page_id}: duplicate translations for #{duplicates.join(', ')}" unless duplicates.empty?

  missing = languages - by_lang.keys
  if missing == ["en"] && by_lang["zh-CN"]&.one? && by_lang["zh-CN"].first.translation_status == "pending"
    next
  end
  errors << "#{page_id}: missing translations for #{missing.join(', ')}" unless missing.empty?
  next unless missing.empty? && duplicates.empty?

  pending = translations.select { |post| post.translation_status == "pending" }
  errors << "#{page_id}: remove stale translation_status after English is added" unless pending.empty?

  dates = translations.map { |post| post.date.to_s }.uniq
  slugs = translations.map(&:slug).uniq
  permalinks = translations.map(&:permalink).uniq
  errors << "#{page_id}: translation dates differ" unless dates.length == 1
  errors << "#{page_id}: translation slugs differ" unless slugs.length == 1
  errors << "#{page_id}: translation permalinks differ" unless permalinks.length == 1

  normalized_bodies = translations.map { |post| post.body.gsub(/\s+/, " ").strip }
  errors << "#{page_id}: translated bodies are identical" if normalized_bodies.uniq.length == 1
end

languages.each do |language|
  localized_posts = posts.select { |post| post.lang == language }
  active_paths = localized_posts.map(&:permalink)
  errors << "#{language}: duplicate post permalinks" unless active_paths.uniq.length == active_paths.length

  redirects = localized_posts.flat_map do |post|
    post.redirect_from.map { |legacy_path| [legacy_path, post.permalink, post.path] }
  end
  duplicate_redirects = redirects.group_by(&:first).select { |_path, entries| entries.length > 1 }
  duplicate_redirects.each_key { |path| errors << "#{language}: duplicate redirect_from #{path.inspect}" }
  redirects.each do |legacy_path, _target, source_path|
    errors << "#{source_path}: redirect_from collides with an active post #{legacy_path.inspect}" if active_paths.include?(legacy_path)
  end
end

declared_route_history = route_history.fetch("redirects").flat_map do |redirect|
  Array(redirect.fetch("languages")).map do |language|
    [language, redirect.fetch("page_id"), redirect.fetch("from"), redirect.fetch("to")]
  end
end
errors << "content route history contains duplicate language/page/from entries" unless declared_route_history.uniq.length == declared_route_history.length

actual_route_history = posts.flat_map do |post|
  post.redirect_from.map { |legacy_path| [post.lang, post.page_id, legacy_path, post.permalink] }
end
missing_history = declared_route_history - actual_route_history
unregistered_history = actual_route_history - declared_route_history
missing_history.each { |entry| errors << "route history missing from post front matter #{entry.inspect}" }
unregistered_history.each { |entry| errors << "post redirect_from missing from route history #{entry.inspect}" }

tabs = TABS_PATH.glob("**/*.md").sort.each_with_object({}) do |path, result|
  relative = path.relative_path_from(ROOT)
  parts = path.relative_path_from(TABS_PATH).each_filename.to_a
  data, = split_front_matter(path)

  if data.nil?
    errors << "#{relative}: missing YAML front matter"
    next
  end

  if parts.length != 2 || !languages.include?(parts.first)
    errors << "#{relative}: tabs must live directly under _tabs/<lang>/"
    next
  end

  lang = data["lang"]
  page_id = data["page_id"].to_s
  permalink = data["permalink"].to_s
  errors << "#{relative}: lang must match directory #{parts.first}" unless lang == parts.first
  errors << "#{relative}: page_id is required" if page_id.empty?
  errors << "#{relative}: permalink is required" if permalink.empty?
  result[page_id] ||= []
  result[page_id] << [lang, permalink, relative.to_s]
end

tabs.each do |page_id, translations|
  by_lang = translations.group_by(&:first)
  missing = languages - by_lang.keys
  duplicates = by_lang.select { |_lang, entries| entries.length > 1 }.keys
  errors << "tab #{page_id}: missing translations for #{missing.join(', ')}" unless missing.empty?
  errors << "tab #{page_id}: duplicate translations for #{duplicates.join(', ')}" unless duplicates.empty?
  errors << "tab #{page_id}: translation permalinks differ" unless translations.map { |entry| entry[1] }.uniq.length == 1
end

if errors.empty?
  complete_pairs = posts.group_by(&:page_id).count { |_page_id, entries| entries.map(&:lang).uniq.sort == languages.sort }
  pending_translations = posts.count { |post| post.lang == "zh-CN" && post.translation_status == "pending" }
  puts "Translation check passed: #{complete_pairs} complete post pair(s), " \
       "#{pending_translations} Chinese post(s) pending series-level translation, " \
       "#{tabs.length} complete tab pair(s) (#{languages.join(', ')})."
else
  warn "Translation check failed with #{errors.length} error(s):"
  errors.each { |error| warn "- #{error}" }
  exit 1
end
