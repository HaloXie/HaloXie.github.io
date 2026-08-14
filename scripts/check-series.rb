#!/usr/bin/env ruby
# frozen_string_literal: true

require "date"
require "pathname"
require "yaml"

ROOT = Pathname.new(__dir__).parent
LANGUAGES = %w[zh-CN en].freeze
SERIES_STATUSES = %w[planned active complete].freeze
LESSON_STATUSES = %w[planned draft published].freeze

errors = []

def front_matter(path)
  source = path.read
  match = source.match(/\A---\s*\n(.*?)\n---\s*\n/m)
  raise "missing front matter" unless match

  YAML.safe_load(match[1], permitted_classes: [Date, Time], aliases: true)
end

posts = Hash.new { |hash, key| hash[key] = {} }
post_categories = Hash.new { |hash, key| hash[key] = Hash.new(0) }
ROOT.glob("_posts/{zh-CN,en}/*.md").each do |path|
  data = front_matter(path)
  page_id = data["page_id"]
  language = data["lang"]
  if page_id.to_s.empty? || !LANGUAGES.include?(language)
    errors << "#{path.relative_path_from(ROOT)}: missing valid page_id/lang"
    next
  end
  errors << "duplicate post #{page_id}/#{language}" if posts[page_id].key?(language)
  posts[page_id][language] = { "path" => path, "data" => data }
  Array(data["categories"]).each { |category| post_categories[language][category] += 1 }
rescue StandardError => e
  errors << "#{path.relative_path_from(ROOT)}: #{e.message}"
end

series_data = YAML.safe_load(ROOT.join("_data/series.yml").read)
series_list = series_data.fetch("series")
series_ids = series_list.map { |series| series["id"] }
errors << "duplicate series ids" unless series_ids.uniq.length == series_ids.length

series_list.each do |series|
  series_id = series.fetch("id")
  errors << "#{series_id}: invalid status #{series['status'].inspect}" unless SERIES_STATUSES.include?(series["status"])
  errors << "#{series_id}: path must live under /learn/" unless series["path"].to_s.match?(%r{\A/learn/[^/]+/\z})

  LANGUAGES.each do |language|
    locale = series.fetch("locales", {}).fetch(language, {})
    %w[title eyebrow description audience outcome].each do |field|
      errors << "#{series_id}/#{language}: missing #{field}" if locale[field].to_s.strip.empty?
    end
    if series["status"] == "planned" && locale["planned_note"].to_s.strip.empty?
      errors << "#{series_id}/#{language}: planned series missing planned_note"
    end
  end

  stage_numbers = series.fetch("stages").map { |stage| stage["number"] }
  expected_stage_numbers = (1..stage_numbers.length).map { |number| format("%02d", number) }
  errors << "#{series_id}: stage numbers must be continuous #{expected_stage_numbers.inspect}" unless stage_numbers == expected_stage_numbers

  lessons = series.fetch("stages").flat_map do |stage|
    LANGUAGES.each do |language|
      locale = stage.fetch("locales", {}).fetch(language, {})
      %w[title description].each do |field|
        errors << "#{series_id}/stage-#{stage['number']}/#{language}: missing #{field}" if locale[field].to_s.strip.empty?
      end
    end
    stage.fetch("lessons")
  end

  lesson_numbers = lessons.map { |lesson| lesson["number"] }
  expected_lesson_numbers = (1..lessons.length).map { |number| format("%02d", number) }
  errors << "#{series_id}: lesson numbers must be continuous #{expected_lesson_numbers.inspect}" unless lesson_numbers == expected_lesson_numbers

  page_ids = lessons.map { |lesson| lesson["page_id"] }
  errors << "#{series_id}: duplicate lesson page_id" unless page_ids.uniq.length == page_ids.length

  lessons.each do |lesson|
    lesson_id = lesson.fetch("page_id")
    default_status = lesson["status"]
    errors << "#{series_id}/#{lesson_id}: invalid status #{default_status.inspect}" unless LESSON_STATUSES.include?(default_status)
    localized_statuses = lesson.fetch("statuses", {})
    unknown_status_languages = localized_statuses.keys - LANGUAGES
    errors << "#{series_id}/#{lesson_id}: unknown status languages #{unknown_status_languages.inspect}" unless unknown_status_languages.empty?
    localized_statuses.each do |language, status|
      errors << "#{series_id}/#{lesson_id}/#{language}: invalid status #{status.inspect}" unless LESSON_STATUSES.include?(status)
    end

    LANGUAGES.each do |language|
      locale = lesson.fetch("locales", {}).fetch(language, {})
      %w[title description].each do |field|
        errors << "#{series_id}/#{lesson_id}/#{language}: missing #{field}" if locale[field].to_s.strip.empty?
      end
      status = localized_statuses.fetch(language, default_status)
      expected_path = lesson.fetch("paths", {})[language]
      if status == "published"
        post = posts.dig(lesson_id, language)
        unless post
          errors << "#{series_id}/#{lesson_id}/#{language}: published lesson missing post"
          next
        end
        errors << "#{series_id}/#{lesson_id}/#{language}: missing published path" if expected_path.to_s.empty?
        actual_path = post.fetch("data")["permalink"]
        errors << "#{series_id}/#{lesson_id}/#{language}: path #{expected_path.inspect} != post permalink #{actual_path.inspect}" unless expected_path == actual_path
      elsif !expected_path.to_s.empty?
        errors << "#{series_id}/#{lesson_id}/#{language}: #{status} lesson must not expose a link"
      end
    end
  end
end

catalog = YAML.safe_load(ROOT.join("_data/category-catalog.yml").read)
taxonomy_map = YAML.safe_load(ROOT.join("_data/taxonomies.yml").read).fetch("categories")
catalog_categories = Hash.new { |hash, key| hash[key] = [] }
catalog.fetch("groups").each do |group|
  LANGUAGES.each do |language|
    locale = group.fetch("locales", {}).fetch(language, {})
    %w[title description].each do |field|
      errors << "category group #{group['id']}/#{language}: missing #{field}" if locale[field].to_s.strip.empty?
    end
  end

  group.fetch("items").each do |item|
    taxonomy_id = item.fetch("taxonomy_id")
    errors << "category catalog references unknown taxonomy #{taxonomy_id}" unless taxonomy_map.key?(taxonomy_id)
    LANGUAGES.each do |language|
      locale = item.fetch("locales", {}).fetch(language, {})
      %w[name description].each do |field|
        errors << "category #{taxonomy_id}/#{language}: missing #{field}" if locale[field].to_s.strip.empty?
      end
      category_name = locale["name"]
      if !category_name.to_s.strip.empty? && post_categories[language][category_name].zero?
        errors << "category #{taxonomy_id}/#{language}: #{category_name.inspect} has no matching posts"
      end
      catalog_categories[language] << category_name unless category_name.to_s.strip.empty?
    end
  end
end

LANGUAGES.each do |language|
  declared_categories = catalog_categories[language]
  errors << "category catalog/#{language}: duplicate names" unless declared_categories.uniq.length == declared_categories.length

  post_categories[language].each_key do |category_name|
    next if declared_categories.include?(category_name)

    errors << "post category #{language}/#{category_name.inspect}: missing from category catalog"
  end
end

expected_tabs = { "learn" => "/learn/" }
series_list.reject { |series| series["status"] == "planned" }.each do |series|
  expected_tabs[series.fetch("id")] = series.fetch("path")
end
expected_tabs.each do |page_id, permalink|
  LANGUAGES.each do |language|
    path = ROOT.join("_tabs", language, "#{page_id}.md")
    unless path.file?
      errors << "missing tab source #{path.relative_path_from(ROOT)}"
      next
    end
    data = front_matter(path)
    errors << "#{path.relative_path_from(ROOT)}: wrong lang" unless data["lang"] == language
    errors << "#{path.relative_path_from(ROOT)}: wrong page_id" unless data["page_id"] == page_id
    errors << "#{path.relative_path_from(ROOT)}: wrong permalink" unless data["permalink"] == permalink
  end
end

if errors.empty?
  lesson_total = series_list.sum { |series| series.fetch("stages").sum { |stage| stage.fetch("lessons").length } }
  puts "Series source check passed: #{series_list.length} series, #{lesson_total} lessons, bilingual catalog metadata."
else
  warn "Series source check failed with #{errors.length} error(s):"
  errors.each { |error| warn "- #{error}" }
  exit 1
end
