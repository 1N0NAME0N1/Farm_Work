# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person tracking their own paid game-farming jobs.

## Product Purpose

Record and update farming jobs for Genshin Impact and Wuthering Waves, then review completed-job income by month. The most frequent task is recording daily progress.

## Operating Context

The user creates jobs with a customer, agreed price, duration, and customer conditions; updates jobs as work is done; and reviews each job's history. Gem-farming jobs track accumulated gems toward a target. Genshin ore jobs track selected ore types and a separate target for each. Genshin world and Archon/character quest jobs track a target quest count. Account-care jobs use daily checklists and a calendar of reported days.

## Capabilities and Constraints

- Separate job views for Genshin Impact and Wuthering Waves.
- Create, edit, and delete job records; the agreed price is set when a job is created and cannot be edited later.
- Record daily progress for jobs, including gem totals, ore counts, quest counts, or account-care checklists as appropriate.
- Automatically complete gem and quest jobs at their target, ore jobs when every selected ore reaches its target, and account-care jobs after the configured number of distinct report days.
- Count income only when a job is completed, grouped by completion month.
- Persist account and job data with Supabase Auth and Supabase Database.
- Existing implementation uses React, Vite, Tailwind CSS, and GitHub Pages.
- Preserve all existing workflows and data behavior during visual redesign.

## Product Principles

- Make daily progress entry quick to reach.
- Keep job status, history, and customer terms easy to review.
- Keep income totals tied to completed work.
- Keep the two game categories distinct and easy to navigate.
