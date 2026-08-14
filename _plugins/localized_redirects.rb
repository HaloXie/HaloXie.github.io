# frozen_string_literal: true

require "cgi"
require "json"

module Halo
  class LocalizedRedirectPage < Jekyll::PageWithoutAFile
    def initialize(site:, alias_path:, target_path:, language:)
      directory = alias_path.delete_prefix("/").delete_suffix("/")
      super(site, site.source, directory, "index.html")

      prefix = language == site.default_lang ? "" : "/#{language}"
      baseurl = site.config.fetch("baseurl", "")
      target_url = "#{site.config.fetch('url')}#{baseurl}#{prefix}#{target_path}"
      escaped_target = CGI.escapeHTML(target_url)

      self.data = {
        "layout" => nil,
        "permalink" => alias_path,
        "sitemap" => false,
        "lang-exclusive" => [language]
      }
      self.content = <<~HTML
        <!doctype html>
        <html lang="#{CGI.escapeHTML(language)}">
          <head>
            <meta charset="utf-8">
            <title>Redirecting…</title>
            <link rel="canonical" href="#{escaped_target}">
            <meta name="robots" content="noindex,follow">
            <meta http-equiv="refresh" content="0; url=#{escaped_target}">
            <script>location.replace(#{target_url.to_json} + location.search + location.hash)</script>
          </head>
          <body>
            <p><a href="#{escaped_target}">Continue to the current page</a></p>
          </body>
        </html>
      HTML
    end
  end

  class LocalizedRedirectGenerator < Jekyll::Generator
    safe true
    priority :lowest

    def generate(site)
      language = site.active_lang
      redirects = {}

      site.posts.docs.each do |post|
        next unless post.data["lang"] == language

        target_path = post.data.fetch("permalink", "").to_s
        Array(post.data["redirect_from"]).each do |alias_path|
          if language != site.default_lang && alias_path.start_with?("/#{language}/")
            alias_path = alias_path.delete_prefix("/#{language}")
          end
          validate_path!(site, post, alias_path, target_path, redirects)
          redirects[alias_path] = target_path
        end
      end

      redirects.each do |alias_path, target_path|
        site.pages << LocalizedRedirectPage.new(
          site: site,
          alias_path: alias_path,
          target_path: target_path,
          language: language
        )
      end
    end

    private

    def validate_path!(site, post, alias_path, target_path, redirects)
      unless alias_path.is_a?(String) && alias_path.match?(%r{\A/[^?#]+/\z})
        raise Jekyll::Errors::FatalException,
              "#{post.relative_path}: redirect_from must be a root-relative directory path, got #{alias_path.inspect}"
      end
      if target_path.empty? || !target_path.match?(%r{\A/[^?#]+/\z})
        raise Jekyll::Errors::FatalException,
              "#{post.relative_path}: permalink must be a root-relative directory path before adding redirects"
      end
      if alias_path == target_path
        raise Jekyll::Errors::FatalException,
              "#{post.relative_path}: redirect_from duplicates the current permalink #{target_path.inspect}"
      end
      if redirects.key?(alias_path)
        raise Jekyll::Errors::FatalException,
              "#{post.relative_path}: duplicate redirect_from #{alias_path.inspect} for #{site.active_lang}"
      end
    end
  end
end
