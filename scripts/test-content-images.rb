#!/usr/bin/env ruby
# frozen_string_literal: true

require "fileutils"
require "open3"
require "pathname"
require "rbconfig"
require "tmpdir"

ROOT = Pathname.new(__dir__).parent

def fixture
  Dir.mktmpdir("content-image-gate-") do |directory|
    root = Pathname.new(directory)
    %w[_posts assets].each { |entry| FileUtils.cp_r(ROOT.join(entry), root.join(entry)) }
    root.join("scripts").mkpath
    %w[check-content-images.rb content-image-exceptions.yml].each do |file|
      FileUtils.cp(ROOT.join("scripts", file), root.join("scripts", file))
    end
    yield root
  end
end

def replace_once(path, before, after)
  source = path.read
  raise "fixture anchor not found in #{path}: #{before.inspect}" unless source.include?(before)

  path.write(source.sub(before, after))
end

def run_gate(root)
  Open3.capture3(RbConfig.ruby, root.join("scripts", "check-content-images.rb").to_s, chdir: root.to_s)
end

def assert_failure(name, expected)
  fixture do |root|
    yield root
    _stdout, stderr, status = run_gate(root)
    raise "#{name}: gate unexpectedly passed" if status.success?
    missing = Array(expected).reject { |message| stderr.include?(message) }
    raise "#{name}: missing #{missing.inspect}\n#{stderr}" unless missing.empty?
    puts "PASS #{name}"
  end
end

fixture do |root|
  stdout, stderr, status = run_gate(root)
  raise "baseline: #{stderr}" unless status.success? && stdout.include?("Content/image check passed")
  puts "PASS baseline"
end

assert_failure("English CJK leak", "CJK is not allowed outside fenced code") do |root|
  path = root.join("_posts/en/2026-07-25-thinking-on-by-default.md")
  replace_once(path, "When Models Start Thinking for Themselves", "When Models 默认 Start Thinking for Themselves")
end

assert_failure("weak Markdown alt", "Markdown image alt text must be descriptive") do |root|
  path = root.join("_posts/en/2026-07-25-thinking-on-by-default.md")
  replace_once(
    path,
    "![Replay the complete thinking history within one model session, and start a new session when switching models]",
    "![image]"
  )
end

assert_failure("non-WebP publication reference", "published image must be WebP") do |root|
  path = root.join("_posts/en/2026-07-25-thinking-on-by-default.md")
  replace_once(path, "preserved-thinking-en.webp", "preserved-thinking-en.svg")
end

assert_failure("missing publication asset", "referenced image does not exist") do |root|
  path = root.join("_posts/en/2026-07-25-thinking-on-by-default.md")
  replace_once(path, "preserved-thinking-en.webp", "missing-en.webp")
end

assert_failure("oversized referenced WebP", "exceeds 150 KiB") do |root|
  path = root.join("assets/img/thinking-on-by-default/cover-en.webp")
  path.open("ab") { |file| file.write("\0" * (151 * 1024)) }
end

assert_failure("new dimension exception", "new exceptions are forbidden") do |root|
  path = root.join("scripts/content-image-exceptions.yml")
  path.open("a") do |file|
    file.write("  - path: /assets/img/not-historical.webp\n    width: 1\n    height: 1\n")
  end
end

assert_failure("unapproved new dimensions", "not an approved historical exception") do |root|
  FileUtils.cp(
    root.join("assets/img/chezmoi-secure-dotfiles/cover.webp"),
    root.join("assets/img/invalid-new.webp")
  )
end

assert_failure("English SVG CJK and invalid XML", ["English SVG contains CJK", "invalid XML"]) do |root|
  path = root.join("assets/img/thinking-on-by-default/cover-en.svg")
  path.write("<svg><text>中文</svg>")
end

assert_failure("English text derivative convention", "English text-bearing image must use the -en.webp derivative") do |root|
  path = root.join("_posts/en/2026-07-25-thinking-on-by-default.md")
  replace_once(path, "preserved-thinking-en.webp", "preserved-thinking.webp")
end

puts "Content/image negative fixtures passed."
