---
title: 开源项目
description: 正在建设的开源基础设施，以及值得保留的成长坐标。
lang: zh-CN
page_id: projects
permalink: /projects/
icon: fas fa-code-branch
order: 1.5
---

{% assign projects = site.data.projects %}

<div class="project-shelf">
  <header class="project-shelf__intro">
    <p class="project-shelf__eyebrow">BUILD LOG / OPEN SOURCE</p>
    <p class="project-shelf__lead">文章记录判断，仓库负责让判断落地。这里不按 star 排名，只收录仍在生长的项目和对我有意义的工程坐标。</p>
    <a class="project-shelf__profile" href="https://github.com/cognirail" target="_blank" rel="noopener noreferrer">
      浏览 Cognirail on GitHub <span aria-hidden="true">↗</span>
    </a>
  </header>

  <section class="project-group" aria-labelledby="building-title-zh">
    <div class="project-group__heading">
      <span>01</span>
      <div>
        <h2 id="building-title-zh">正在建设</h2>
        <p>当前工作与思考最直接的代码出口。</p>
      </div>
    </div>
    <div class="project-grid">
      {% for project in projects %}
        {% if project.group == 'building' %}
          {% assign locale = project.locales['zh-CN'] %}
          <a class="project-card" href="{{ project.url }}" target="_blank" rel="noopener noreferrer">
            <div class="project-card__topline">
              <span>{{ project.language }}</span>
              <span class="project-card__status project-card__status--{{ project.status }}">{{ project.status }}</span>
            </div>
            <h3>{{ project.repo }}</h3>
            <p class="project-card__summary">{{ locale.summary }}</p>
            <p class="project-card__note">{{ locale.note }}</p>
            <span class="project-card__cta">查看仓库 <span aria-hidden="true">↗</span></span>
          </a>
        {% endif %}
      {% endfor %}
    </div>
  </section>

  <section class="project-group" aria-labelledby="meaningful-title-zh">
    <div class="project-group__heading">
      <span>02</span>
      <div>
        <h2 id="meaningful-title-zh">有意义的坐标</h2>
        <p>不一定最耀眼，但它们解释了我从哪里走来。</p>
      </div>
    </div>
    <div class="project-grid project-grid--compact">
      {% for project in projects %}
        {% if project.group == 'meaningful' %}
          {% assign locale = project.locales['zh-CN'] %}
          <a class="project-card" href="{{ project.url }}" target="_blank" rel="noopener noreferrer">
            <div class="project-card__topline">
              <span>{{ project.language }}</span>
              <span class="project-card__status project-card__status--{{ project.status }}">{{ project.status }}</span>
            </div>
            <h3>{{ project.repo }}</h3>
            <p class="project-card__summary">{{ locale.summary }}</p>
            <p class="project-card__note">{{ locale.note }}</p>
            <span class="project-card__cta">查看仓库 <span aria-hidden="true">↗</span></span>
          </a>
        {% endif %}
      {% endfor %}
    </div>
  </section>
</div>
