# frozen_string_literal: true

# Chirpy 7.6 injects its SimpleJekyllSearch JSON page from the theme gem even
# when the project-level source is deleted. Pagefind owns search indexing now,
# so remove that inherited page from Jekyll's render set at the source boundary.
Jekyll::Hooks.register :site, :post_read do |site|
  site.pages.reject! { |page| page.path == "assets/js/data/search.json" }
end
