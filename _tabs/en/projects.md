---
title: Open Source
description: Open-source infrastructure in progress, plus a few meaningful waypoints.
lang: en
page_id: projects
permalink: /projects/
icon: fas fa-code-branch
order: 1.5
---

{% assign projects = site.data.projects %}

<div class="project-shelf">
  <header class="project-shelf__intro">
    <p class="project-shelf__eyebrow">BUILD LOG / OPEN SOURCE</p>
    <p class="project-shelf__lead">Essays record the judgment; repositories make it executable. This shelf is curated by meaning and momentum, not star count.</p>
    <a class="project-shelf__profile" href="https://github.com/cognirail" target="_blank" rel="noopener noreferrer">
      Explore Cognirail on GitHub <span aria-hidden="true">↗</span>
    </a>
  </header>

  <section class="project-group" aria-labelledby="building-title-en">
    <div class="project-group__heading">
      <span>01</span>
      <div>
        <h2 id="building-title-en">Now building</h2>
        <p>The clearest code-level expressions of my current work.</p>
      </div>
    </div>
    <div class="project-grid">
      {% for project in projects %}
        {% if project.group == 'building' %}
          {% assign locale = project.locales.en %}
          <a class="project-card" href="{{ project.url }}" target="_blank" rel="noopener noreferrer">
            <div class="project-card__topline">
              <span>{{ project.language }}</span>
              <span class="project-card__status project-card__status--{{ project.status }}">{{ project.status }}</span>
            </div>
            <h3>{{ project.repo }}</h3>
            <p class="project-card__summary">{{ locale.summary }}</p>
            <p class="project-card__note">{{ locale.note }}</p>
            <span class="project-card__cta">View repository <span aria-hidden="true">↗</span></span>
          </a>
        {% endif %}
      {% endfor %}
    </div>
  </section>

  <section class="project-group" aria-labelledby="meaningful-title-en">
    <div class="project-group__heading">
      <span>02</span>
      <div>
        <h2 id="meaningful-title-en">Meaningful waypoints</h2>
        <p>Not necessarily the loudest work, but part of the path that led here.</p>
      </div>
    </div>
    <div class="project-grid project-grid--compact">
      {% for project in projects %}
        {% if project.group == 'meaningful' %}
          {% assign locale = project.locales.en %}
          <a class="project-card" href="{{ project.url }}" target="_blank" rel="noopener noreferrer">
            <div class="project-card__topline">
              <span>{{ project.language }}</span>
              <span class="project-card__status project-card__status--{{ project.status }}">{{ project.status }}</span>
            </div>
            <h3>{{ project.repo }}</h3>
            <p class="project-card__summary">{{ locale.summary }}</p>
            <p class="project-card__note">{{ locale.note }}</p>
            <span class="project-card__cta">View repository <span aria-hidden="true">↗</span></span>
          </a>
        {% endif %}
      {% endfor %}
    </div>
  </section>
</div>
