/* global document, location */
// Paste into DevTools Console on a Moodle course page (course/view.php?id=...).
// Prints selector counts and completion markup shapes only: no names, titles, URLs or text content.
(() => {
  const count = (selector) => document.querySelectorAll(selector).length;
  const shape = (el, depth = 0) =>
    depth > 4 || !el
      ? ''
      : `${'  '.repeat(depth)}<${el.tagName.toLowerCase()}${el.className ? ` class="${String(el.className).replace(/\d+/g, '#')}"` : ''}${[
          'data-region',
          'data-action',
          'data-toggletype',
          'data-for',
          'data-value'
        ]
          .filter((a) => el.hasAttribute(a))
          .map((a) => ` ${a}="${el.getAttribute(a)}"`)
          .join('')}>\n${Array.from(el.children)
          .slice(0, 4)
          .map((c) => shape(c, depth + 1))
          .join('')}`;
  const report = {
    url: location.pathname,
    'li.activity': count('li.activity'),
    '.activity-item': count('.activity-item'),
    '.activity-completion': count('.activity-completion'),
    '[data-region="activity-information"]': count('[data-region="activity-information"]'),
    '[data-region="completion-info"]': count('[data-region="completion-info"]'),
    '.completion-dropdown': count('.completion-dropdown'),
    'button[data-action="toggle-manual-completion"]': count('button[data-action="toggle-manual-completion"]'),
    'toggletype manual:undo': count('[data-toggletype="manual:undo"]'),
    'toggletype manual:mark-done': count('[data-toggletype="manual:mark-done"]'),
    '.badge (inside activities)': count('li.activity .badge'),
    'courseindex items': count('[data-for="cm"]'),
    'courseindex completion icons': count('[data-for="cm_completion"]'),
    'courseindex completion data-value=1': count('[data-for="cm_completion"][data-value="1"]'),
    'courseindex completion data-value=2': count('[data-for="cm_completion"][data-value="2"]')
  };
  console.table(report);
  const first =
    document.querySelector('li.activity .activity-completion') ??
    document.querySelector('li.activity [data-region="activity-information"]') ??
    document.querySelector('[data-for="cm_completion"]')?.parentElement;
  console.log(first ? shape(first) : 'No completion markup found on this page.');
})();
