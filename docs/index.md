---
layout: page
sidebar: false
title: Write the novel. Keep the files.
description: A quiet writing desk and a clearer view of your story. Your novel stays a folder of plain Markdown files.
---

<script setup>
import { withBase } from 'vitepress'
import { data as release } from './release.data'
</script>

<div class="field-guide">
  <div class="masthead">
    <div>
      <p class="edition">Plot Device / A writer's field guide</p>
      <h1>Write the novel.<br><em>Keep the files.</em></h1>
    </div>
    <div>
      <p class="introduction">A quiet desk for the words. A wider view of the story. Plot Device brings your chapters, characters, and threads together without taking your novel away from you.</p>
      <div class="actions">
        <a :href="withBase('/guide/start.html')">Start with the guide</a>
        <a :href="withBase('/download.html')">Get Plot Device</a>
      </div>
      <p class="caption">Linux x64 · Windows qualification pending · Plain Markdown<br>
        <span v-if="release.source === 'preview'">Offline site preview. Published-release discovery is not enabled.</span>
        <span v-else-if="release.stable">Latest stable: <a :href="release.stable.releaseUrl">{{ release.stable.version }}</a></span>
        <span v-else>No stable installer has been published yet.</span>
      </p>
    </div>
  </div>
  <figure>
    <img class="desk" src="./images/editor.png" alt="Plot Device's dark writing desk, with manuscript parts on the left, an open chapter in the middle, and chapter properties on the right." width="1200" height="771">
    <figcaption class="caption">The writing desk, with the bundled sample novel. Your prose in the middle; everything else within reach.</figcaption>
  </figure>
  <div class="chapters">
    <section>
      <p class="section-number">01 / Make room for the words</p>
      <h2>One chapter at a time.</h2>
      <p>Write, arrange parts, and keep an outline beside the draft. Bring Hebrew, English, or a little of both.</p>
      <a :href="withBase('/guide/writing.html')">Find your writing rhythm</a>
    </section>
    <section>
      <p class="section-number">02 / Follow the thread</p>
      <h2>See what connects.</h2>
      <p>Keep characters and places close. Step back to the overview, follow story dates, and notice who shares a chapter.</p>
      <a :href="withBase('/guide/story.html')">See the shape of the story</a>
    </section>
    <section>
      <p class="section-number">03 / Leave the door open</p>
      <h2>Your folder. Your novel.</h2>
      <p>Open the same Markdown in Obsidian, a text editor, or git. The app is a lens on the files, not a place that locks them in.</p>
      <a :href="withBase('/guide/safety.html')">Know where your work lives</a>
    </section>
  </div>
  <p class="colophon">Made for the long work of a novel, by Moriel Schottlender.<br>Open-source software. No account required. No manuscript uploads.</p>
</div>
