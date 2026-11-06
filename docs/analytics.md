# Analytics events

Page views come from the self-hosted [Rybbit](https://www.rybbit.io/docs/track-events) script in `Base.astro`.
Custom events go through `src/lib/analytics.ts`, which calls `window.rybbit.event(name, properties)`.

If Rybbit is blocked or `window.rybbit` is missing, the helper does nothing. Slider and number fields
(leave days, shortest break) are debounced so a burst of clicks becomes one event. Events never include
names, exact dates, plan titles, or other personal data. Country and region values are public codes
(`DE`, `BY`), not names.

`page` is one of `home`, `planner`, `compare`, `ranking`, `together`, `plans`, `about`, `contact`,
`privacy`, `other`. `locale` is `en` or a full code such as `de-DE`. `days` is the leave-day budget.

| Event | When | Properties |
| --- | --- | --- |
| `country_change` | Country picker | `country`, `year`, `locale`, `days`, `page` |
| `region_change` | Region select. `region` is the code, or `all` for the whole country | `country`, `region`, `year`, `locale`, `days`, `page` |
| `year_change` | Year choice | `country`, `year`, `locale`, `days`, `page` |
| `leave_days_change` | Leave-day stepper or number field (debounced) | `country`, `year`, `locale`, `days`, `page` |
| `planner_setting` | Style, shortest break, longest break, favourite month, work day, leave-year start, or clearing marked days | `country`, `year`, `locale`, `days`, `page`, `setting`, `value` |
| `break_select` | A day in a suggested break is opened | `country`, `year`, `locale`, `days`, `page`, `length`, `leave` |
| `day_edit` | Keep, block, mark, or clear a day. No date | `country`, `year`, `locale`, `days`, `page`, `action` |
| `share_open` | Share dialog | `country`, `year`, `locale`, `days`, `page` |
| `share_copy` | Copy the plan link | `country`, `year`, `locale`, `days`, `page` |
| `share_link` | Share the link | `country`, `year`, `locale`, `days`, `page` |
| `share_image` | Save or share the image | `country`, `year`, `locale`, `days`, `page` |
| `calendar_export` | Open calendar export, download `.ics`, or open Google Calendar | `country`, `year`, `locale`, `days`, `page`, `format` (`open`, `ics`, or `google`). Google clicks also send `length` |
| `plan_save` | Save a plan in this browser. The name is not sent | `country`, `year`, `locale`, `days`, `page` |
| `language_change` | Language switcher | `locale` (page language), `page`, `to` (chosen language) |
| `outbound_click` | A link to another site. Host only, not the full URL | `host`, `page`, `locale` |
| `privacy_settings` | Privacy settings | `page`, `locale` |
| `together_create` | A Together group is created | none |
| `together_join` | Someone joins a Together group | none |

Compare uses the same country, year, leave-day, and style events with `page: "compare"`. Shared controls
there omit `country`, because the comparison is not a single country. Country and region changes on a
card include that card's `country`.
