#!/usr/bin/env ruby
# frozen_string_literal: true

require "date"
require "pathname"
require "rexml/document"
require "yaml"

ROOT = Pathname.new(__dir__).parent
POSTS = ROOT.join("_posts")
ASSETS = ROOT.join("assets", "img")
EXCEPTIONS_PATH = ROOT.join("scripts", "content-image-exceptions.yml")
TARGET_DIMENSIONS = [1200, 675].freeze
MAX_WEBP_BYTES = 150 * 1024
COVER_ALT_REQUIRED_FROM = Date.new(2026, 8, 14)
CJK = /[\p{Han}\p{Hiragana}\p{Katakana}\p{Hangul}]/
WEAK_ALT = /\A(?:image|img|photo|picture|screenshot|illustration|diagram|figure|cover|图|图片|插图|截图|封面)\z/i
MARKDOWN_IMAGE = /!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/

# This immutable inventory prevents the historical exception mechanism from
# accepting new paths. The YAML list can only become a subset of these paths.
FROZEN_LEGACY_DIMENSION_PATHS = %w[
  /assets/img/chezmoi-secure-dotfiles/cover.webp
  /assets/img/harness-engineering/chart_codex.webp
  /assets/img/harness-engineering/chart_harness.webp
  /assets/img/harness-engineering/cover.webp
  /assets/img/harness-engineering/six-components-v2.webp
  /assets/img/harness-engineering/strategy.webp
  /assets/img/language-choose/1_K5zaMYb0AdjThQxhjmOMqQ.webp
  /assets/img/language-choose/1_QtV2WfXGaxAWv_Vy-GMxiA.webp
  /assets/img/language-choose/1_Zmsk5VDsQV5KfZ4wK8T_bw.webp
  /assets/img/language-choose/1_dAheT-s0FRXM4CcVEF2_nA.webp
  /assets/img/language-choose/1_iull2CFhbPktG_aFiya9lA.webp
  /assets/img/language-choose/1_lC2fbQkrpijlyta1KnH7nw.webp
  /assets/img/language-choose/1_tWq2MX20eWInNDu61WAUdw.webp
  /assets/img/language-choose/1_vOZL0UKIE3TZxyrPaVX9IA.webp
  /assets/img/language-choose/Programming-languages-in-blockchain-industry.webp
].freeze
NON_ARTICLE_WEBP_PATHS = %w[/assets/img/avatar.webp].freeze

def load_yaml(path, source)
  YAML.safe_load(source, permitted_classes: [Date, Time], aliases: true) || {}
rescue Psych::SyntaxError => e
  abort "#{path.relative_path_from(ROOT)}: invalid YAML: #{e.message}"
end

def split_front_matter(path)
  source = path.read
  match = source.match(/\A---\s*\n(.*?)\n---\s*\n/m)
  return [nil, source, 0] unless match

  [load_yaml(path, match[1]), source, match[0].count("\n")]
end

def lines_outside_fences(source)
  fence = nil
  source.each_line.with_index(1).each_with_object([]) do |(line, number), result|
    marker = line.match(/^ {0,3}(`{3,}|~{3,})/)&.[](1)
    if fence
      fence = nil if marker && marker[0] == fence[0] && marker.length >= fence.length
      next
    end
    if marker
      fence = marker
      next
    end
    result << [number, line]
  end
end

def local_asset_path(reference)
  clean = reference.to_s.split(/[?#]/, 2).first
  return nil unless clean.start_with?("/")

  ROOT.join(clean.delete_prefix("/"))
end

def webp_dimensions(path)
  data = path.binread
  raise "not a RIFF WebP file" unless data.byteslice(0, 4) == "RIFF" && data.byteslice(8, 4) == "WEBP"

  offset = 12
  while offset + 8 <= data.bytesize
    type = data.byteslice(offset, 4)
    size = data.byteslice(offset + 4, 4).unpack1("V")
    chunk = data.byteslice(offset + 8, size)
    raise "truncated #{type.inspect} chunk" unless chunk&.bytesize == size

    case type
    when "VP8X"
      raise "invalid VP8X chunk" if size < 10
      width = 1 + chunk.byteslice(4, 3).unpack("C3").each_with_index.sum { |byte, index| byte << (8 * index) }
      height = 1 + chunk.byteslice(7, 3).unpack("C3").each_with_index.sum { |byte, index| byte << (8 * index) }
      return [width, height]
    when "VP8 "
      signature = chunk.index("\x9d\x01\x2a".b)
      raise "invalid VP8 frame header" unless signature && signature + 7 <= chunk.bytesize
      width, height = chunk.byteslice(signature + 3, 4).unpack("v2").map { |value| value & 0x3fff }
      return [width, height]
    when "VP8L"
      raise "invalid VP8L chunk" if size < 5 || chunk.getbyte(0) != 0x2f
      bits = chunk.byteslice(1, 4).unpack1("V")
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1]
    end

    offset += 8 + size + (size.odd? ? 1 : 0)
  end
  raise "missing VP8/VP8L/VP8X dimensions"
end

errors = []
exceptions = load_yaml(EXCEPTIONS_PATH, EXCEPTIONS_PATH.read)
errors << "scripts/content-image-exceptions.yml: version must be 1" unless exceptions["version"] == 1

cjk_allowlist = Array(exceptions["english_cjk_allowlist"])
cjk_keys = cjk_allowlist.each_with_object([]) do |entry, result|
  unless entry.is_a?(Hash) && entry.keys.sort == %w[line path text]
    errors << "english_cjk_allowlist: each entry must contain only path, line, and exact text"
    next
  end
  path = entry["path"].to_s
  line = entry["line"]
  text = entry["text"].to_s
  errors << "english_cjk_allowlist: path must be under _posts/en: #{path.inspect}" unless path.start_with?("_posts/en/")
  errors << "english_cjk_allowlist: line must be a positive integer for #{path}" unless line.is_a?(Integer) && line.positive?
  errors << "english_cjk_allowlist: text must contain CJK for #{path}:#{line}" unless text.match?(CJK)
  result << [path, line, text]
end
errors << "english_cjk_allowlist: duplicate entries" unless cjk_keys.uniq.length == cjk_keys.length
unused_cjk_allowlist = cjk_keys.dup

legacy_entries = Array(exceptions["legacy_image_dimensions"])
legacy_by_path = {}
legacy_entries.each do |entry|
  unless entry.is_a?(Hash) && entry.keys.sort == %w[height path width]
    errors << "legacy_image_dimensions: each entry must contain only path, width, and height"
    next
  end
  reference = entry["path"].to_s
  errors << "legacy_image_dimensions: duplicate path #{reference}" if legacy_by_path.key?(reference)
  errors << "legacy_image_dimensions: new exceptions are forbidden: #{reference}" unless FROZEN_LEGACY_DIMENSION_PATHS.include?(reference)
  legacy_by_path[reference] = [entry["width"], entry["height"]]
end
errors << "legacy_image_dimensions: cannot exceed the frozen 15-image inventory" if legacy_entries.length > FROZEN_LEGACY_DIMENSION_PATHS.length

references = Hash.new { |hash, key| hash[key] = [] }

POSTS.glob("**/*.md").sort.each do |path|
  relative = path.relative_path_from(ROOT).to_s
  front_matter, source, = split_front_matter(path)
  unless front_matter
    errors << "#{relative}: missing YAML front matter"
    next
  end

  lines = lines_outside_fences(source)
  if relative.start_with?("_posts/en/")
    lines.each do |number, line|
      remaining = line.dup
      cjk_keys.select { |candidate| candidate[0] == relative && candidate[1] == number }.each do |key|
        next unless remaining.sub!(key[2], "")

        unused_cjk_allowlist.delete(key)
      end
      errors << "#{relative}:#{number}: CJK is not allowed outside fenced code" if remaining.match?(CJK)
    end
  end

  image_data = front_matter["image"]
  cover = image_data.is_a?(Hash) ? image_data["path"] : image_data
  cover_alt = image_data.is_a?(Hash) ? image_data["alt"].to_s.strip : ""
  published_date = front_matter["date"]&.to_date
  if published_date && published_date >= COVER_ALT_REQUIRED_FROM
    if cover_alt.empty? || cover_alt.match?(WEAK_ALT)
      errors << "#{relative}: front matter image.alt must be descriptive"
    elsif relative.start_with?("_posts/zh-CN/") && !cover_alt.match?(CJK)
      errors << "#{relative}: Chinese front matter image.alt must be localized"
    end
  end
  references[cover.to_s] << "#{relative}:front matter" unless cover.to_s.empty?

  lines.each do |number, line|
    matches = line.to_enum(:scan, MARKDOWN_IMAGE).map { Regexp.last_match }
    if line.scan(/!\[/).length != matches.length
      errors << "#{relative}:#{number}: unsupported or malformed Markdown image syntax"
    end
    matches.each do |match|
      alt = match[1].to_s.strip
      reference = match[2] || match[3]
      errors << "#{relative}:#{number}: Markdown image alt text must be descriptive" if alt.empty? || alt.match?(WEAK_ALT)
      references[reference] << "#{relative}:#{number}"
    end
  end
end

unused_cjk_allowlist.each do |path, line, text|
  errors << "english_cjk_allowlist: stale entry #{path}:#{line} #{text.inspect}"
end

references.each do |reference, locations|
  unless reference.match?(/\.webp(?:[?#].*)?\z/i)
    errors << "#{locations.join(', ')}: published image must be WebP: #{reference.inspect}"
    next
  end
  asset = local_asset_path(reference)
  unless asset && asset.to_s.start_with?(ASSETS.to_s + File::SEPARATOR)
    errors << "#{locations.join(', ')}: image must use a root-relative /assets/img/ path: #{reference.inspect}"
    next
  end
  unless asset.file?
    errors << "#{locations.join(', ')}: referenced image does not exist: #{reference}"
    next
  end
  next unless locations.any? { |location| location.start_with?("_posts/en/") }

  stem = reference.sub(/\.webp(?:[?#].*)?\z/i, "")
  unless stem.end_with?("-en")
    localized_webp = ROOT.join("#{stem.delete_prefix('/')}-en.webp")
    source_svg = ROOT.join("#{stem.delete_prefix('/')}.svg")
    localized_svg = ROOT.join("#{stem.delete_prefix('/')}-en.svg")
    if localized_webp.file? || localized_svg.file? || (source_svg.file? && source_svg.read.match?(CJK))
      errors << "#{locations.join(', ')}: English text-bearing image must use the -en.webp derivative: #{reference}"
    end
  end
end

# Dimension-check every article asset, including a newly added file that has
# not been referenced yet. The site avatar is UI chrome, not a blog image.
ASSETS.glob("**/*.webp").sort.each do |asset|
  reference = "/#{asset.relative_path_from(ROOT)}"
  next if NON_ARTICLE_WEBP_PATHS.include?(reference)

  errors << "#{reference}: #{asset.size} bytes exceeds 150 KiB" if asset.size > MAX_WEBP_BYTES
  begin
    dimensions = webp_dimensions(asset)
    if dimensions != TARGET_DIMENSIONS && legacy_by_path[reference] != dimensions
      errors << "#{reference}: expected 1200x675, got #{dimensions.join('x')} (not an approved historical exception)"
    end
  rescue StandardError => e
    errors << "#{reference}: cannot read WebP dimensions: #{e.message}"
  end
end

legacy_by_path.each do |reference, declared_dimensions|
  asset = local_asset_path(reference)
  unless references.key?(reference)
    errors << "legacy_image_dimensions: stale unreferenced exception #{reference}"
    next
  end
  unless asset&.file?
    errors << "legacy_image_dimensions: missing file #{reference}"
    next
  end
  begin
    actual_dimensions = webp_dimensions(asset)
    errors << "legacy_image_dimensions: #{reference} declares #{declared_dimensions.join('x')}, actual #{actual_dimensions.join('x')}" unless declared_dimensions == actual_dimensions
    errors << "legacy_image_dimensions: remove compliant exception #{reference}" if actual_dimensions == TARGET_DIMENSIONS
  rescue StandardError => e
    errors << "legacy_image_dimensions: cannot inspect #{reference}: #{e.message}"
  end
end

ASSETS.glob("**/*-en.svg").sort.each do |path|
  relative = path.relative_path_from(ROOT)
  source = path.read
  errors << "#{relative}: English SVG contains CJK" if source.match?(CJK)
  begin
    document = REXML::Document.new(source)
    errors << "#{relative}: SVG has no document root" unless document.root
  rescue REXML::ParseException => e
    errors << "#{relative}: invalid XML: #{e.message.lines.first.strip}"
  end
end

if errors.empty?
  puts "Content/image check passed: #{references.length} published WebP asset(s), " \
       "#{legacy_by_path.length} frozen dimension exception(s), no English CJK leaks."
else
  warn "Content/image check failed with #{errors.length} error(s):"
  errors.each { |error| warn "- #{error}" }
  exit 1
end
