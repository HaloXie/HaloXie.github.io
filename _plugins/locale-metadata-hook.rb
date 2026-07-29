# frozen_string_literal: true

# Compile locale-aware fallback descriptions before jekyll-seo-tag renders.
# Explicit page/post descriptions remain authoritative; pages without one use
# `_data/site-locales.yml` for the language currently built by Polyglot.
Jekyll::Hooks.register :site, :pre_render do |site, _payload|
  language = site.active_lang || site.config.fetch("lang")
  locale = site.data.fetch("site-locales").fetch(language)
  description = locale.fetch("description")

  site.config["description"] = description

  pages = site.pages.dup
  tabs = site.collections["tabs"]
  pages.concat(tabs.docs) if tabs

  pages.each do |page|
    injected = page.data["locale_description"]
    next unless injected || page.data["description"].to_s.strip.empty?

    page.data["description"] = description
    page.data["locale_description"] = true
  end
end
