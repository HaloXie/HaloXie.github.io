# frozen_string_literal: true

source "https://rubygems.org"

ruby "~> 3.4.0"

gem "jekyll-theme-chirpy", "~> 7.6"

group :jekyll_plugins do
  gem "jekyll-polyglot", "~> 1.13"
end

gem "html-proofer", "~> 5.0", group: :test

platforms :windows, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

gem "wdm", "~> 0.2.0", platforms: [:windows]
