

# Build a Fresh Group Discussion Module

## Overview
A completely new GD experience -- not the category-then-level drill-down used by Aptitude/Technical. Instead, a modern study-guide style page with YouTube videos, personal notes, self-confidence ratings, and a "Random Topic" surprise feature.

## New Design Concept

The page will be a single scrollable view with:
- A **search + filter bar** at the top (filter by category, level)
- **Rich topic cards** in a masonry/grid layout (not expandable accordions)
- Clicking a card opens a **full detail view** (slide-in panel or dedicated section)
- Each topic has an **embedded YouTube video** link
- Users can **rate their confidence** (1-5 stars) on each topic
- Users can **add personal notes** to any topic
- A **"Surprise Me"** button that picks a random topic

## Database Changes

### 1. Add `youtube_url` column to `gd_topics`
A new nullable text column so admins can attach a YouTube link to each topic.

### 2. Create `gd_user_notes` table
Stores personal notes and confidence ratings per user per topic:

```text
gd_user_notes
+------------------+--------+------------------------------+
| Column           | Type   | Details                      |
+------------------+--------+------------------------------+
| id               | uuid   | PK, auto-generated           |
| user_id          | uuid   | NOT NULL                     |
| topic_id         | uuid   | NOT NULL, FK to gd_topics.id |
| notes            | text   | default ''                   |
| confidence_level | int    | 1-5, default NULL            |
| created_at       | timestamptz | default now()           |
| updated_at       | timestamptz | default now()           |
+------------------+--------+------------------------------+
```

RLS policies:
- Users can SELECT/INSERT/UPDATE/DELETE only their own rows (`auth.uid() = user_id`)

## Page Layout (GroupDiscussion.tsx -- full rewrite)

### Header
- Back button + "Group Discussion Prep" title
- **"Surprise Me"** button that scrolls to a random topic and highlights it

### Filter Bar
- Category pills: All | Technology | Business | Social | Finance
- Search input to filter by title/description
- Sort: Newest / A-Z

### Topic Cards Grid (2 columns on desktop, 1 on mobile)
Each card shows:
- Category badge + confidence stars (if rated)
- Topic title + short description
- YouTube thumbnail/link button (if available)
- "Read" checkmark if already tracked in user_progress
- Click to expand into **Detail View**

### Detail View (opens below or replaces list)
When a topic card is clicked, it expands into a rich detail section:
- **YouTube Video** -- embedded iframe or "Watch on YouTube" button with thumbnail
- **Points For** -- green-themed list
- **Points Against** -- red-themed list
- **Discussion Tips** -- numbered tips
- **Model Conclusion** -- highlighted box
- **My Notes** -- editable textarea (auto-saves to `gd_user_notes`)
- **Confidence Rating** -- clickable 1-5 stars (auto-saves)
- **Mark as Studied** button -- tracks in `user_progress`

### Bottom Section
- General GD Tips card (kept from current design)

## Files to Create/Edit

1. **Database migration** -- Add `youtube_url` to `gd_topics`, create `gd_user_notes` table with RLS
2. **`src/pages/GroupDiscussion.tsx`** -- Complete rewrite with the new design
3. **`src/App.tsx`** -- Add `/group-discussion` route (currently missing)
4. **`src/pages/Dashboard.tsx`** -- Add GD card to the categories array

## Technical Notes

- YouTube embed: Extract video ID from URL and render as an iframe, or show a "Watch on YouTube" button with external link
- Notes auto-save: Debounce textarea changes (500ms) and upsert to `gd_user_notes`
- Confidence rating: Immediate save on star click via upsert
- "Surprise Me": Pick a random topic from the filtered list, scroll it into view with a highlight animation
- Progress tracking: "Mark as Studied" button inserts into `user_progress` with `question_type = 'gd'`
- Icon visibility: Use `text-primary` for all icons (matching the fix applied to Coding page)

