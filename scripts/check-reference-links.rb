#!/usr/bin/env ruby
# frozen_string_literal: true

require "pathname"

ROOT = Pathname.new(__dir__).parent
REFERENCE_HEADING = /^## (参考资料|References)\s*$/
NEXT_SECTION = /^##\s+/
MARKDOWN_LINK = /\[[^\]]+\]\((?:https?:\/\/|\/)[^)]+\)/

errors = []
sections = 0
references = 0

ROOT.glob("_posts/{zh-CN,en}/*.md").sort.each do |path|
  in_references = false

  path.each_line.with_index(1) do |line, line_number|
    if line.match?(REFERENCE_HEADING)
      in_references = true
      sections += 1
      next
    end

    if in_references && line.match?(NEXT_SECTION)
      in_references = false
      next
    end

    next unless in_references && line.start_with?("- ")

    references += 1
    next if line.match?(MARKDOWN_LINK)

    errors << "#{path.relative_path_from(ROOT)}:#{line_number}: reference item must contain a direct Markdown link"
  end
end

if errors.empty?
  puts "Reference link check passed: #{references} linked references across #{sections} sections."
else
  warn "Reference link check failed with #{errors.length} error(s):"
  errors.each { |error| warn "- #{error}" }
  exit 1
end
