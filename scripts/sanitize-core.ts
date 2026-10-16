// Sanitizes a saved Moodle page so it can be committed as a test fixture.
// Pure DOM logic (no jsdom import) so tests can run it with the vitest DOM.
//
// Strategy: (1) collect every course-specific name from the whole page, (2) crop to the
// course content, (3) remove personal blocks, (4) replace all names in one pass.

export interface SanitizeReport {
  html: string;
  activities: number;
  sections: number;
  removed: number;
  warnings: string[];
}

const TEXT_NODE = 3;
const KEEP_ROOTS = ['#page-header', '#region-main'];
const FALLBACK_ROOTS = ['#page-content', 'body'];
const REMOVE = [
  'script', 'noscript', 'style', 'link', 'meta', 'iframe', 'object', 'embed', 'template', 'video', 'audio',
  '.usermenu', '.userbutton', '#user-action-menu', '[data-region="user-menu"]', '.logininfo',
  '.userpicture', '.userinitials', '.avatars', '.block_online_users', '.block_recent_activity', '.block_myprofile',
  '.instructor-info', '.instructor-info-wrapper', '.course-contacts', '.coursecontacts', '.teachers',
  '.block_edwiseradvancedblock', '.block_html', 'nav.navbar', '#page-footer', 'footer'
].join(',');
const DESCRIPTION = [
  '.activity-altcontent', '.activity-description', '.contentafterlink', '.summary', '.summarytext',
  '.course-description-item', '.description', '.no-overflow'
].join(',');
const SECTION_NAME = '.sectionname, [data-for="section_title"]';
const ACTIVITY = 'li.activity';
const ACTIVITY_NAME = '.instancename';
const PERSON_LINK_SELECTOR = 'a[href*="/user/profile.php"], a[href*="/user/view.php"], a[href^="mailto:"]';
const PERSON_LINK = /\/(user\/(profile|view)\.php|message\/|blog\/|badges\/user)|^mailto:/;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const SESSKEY = /sesskey=[^&"'\s<>]+/gi;
const STATUS_TEXT = /^(not completed|completed|submitted|not attempted|attempted|passed|failed|expected by|due|selesai|belum)/i;
const LONG_NUMBER = /\b\d{8,}\b/g; // student numbers (NIM) in visible text
const PHONE = /(\+62|\b0)\s?8\d[\d\s.-]{6,}\d/g; // Indonesian mobile numbers

const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === TEXT_NODE) out.push(node as Text);
    node.childNodes.forEach(walk);
  };
  walk(root);
  return out;
}

/** Visible name of an element, without `.accesshide` text (Moodle UI strings such as " File"). */
function ownName(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('.accesshide').forEach((e) => e.remove());
  return clean(copy.textContent);
}

/** Collects course-specific names from the whole page, mapped to synthetic labels. */
function collectNames(doc: Document): { names: Map<string, string>; sections: number; activities: number } {
  const names = new Map<string, string>();
  const add = (original: string, label: string) => {
    if (original.length > 2 && !names.has(original)) names.set(original, label);
  };
  // On /my/ pages the heading is a Moodle UI string ("Dashboard", "My courses"); keep it.
  if (!/^page-my-/.test(doc.body?.id ?? '')) {
    const heading = doc.querySelector('#page-header h1, .page-header-headings h1, h1');
    if (heading) add(ownName(heading), 'Sample Course');
    const title = clean(doc.title).split('|')[0]?.replace(/^Course:\s*/i, '').trim();
    if (title) add(title, 'Sample Course');
  }

  let sections = 0;
  doc.querySelectorAll(SECTION_NAME).forEach((el) => {
    const name = ownName(el);
    if (name && !names.has(name)) add(name, `Section ${++sections}`);
  });
  doc.querySelectorAll('[data-sectionname]').forEach((el) => {
    const name = clean(el.getAttribute('data-sectionname'));
    if (name && !names.has(name)) add(name, `Section ${++sections}`);
  });

  let activities = 0;
  doc.querySelectorAll(ACTIVITY).forEach((item) => {
    const label = `Activity ${++activities}`;
    const nameEl = item.querySelector(ACTIVITY_NAME);
    if (nameEl) add(ownName(nameEl), label);
    item.querySelectorAll('[data-activityname]').forEach((el) => add(clean(el.getAttribute('data-activityname')), label));
  });
  doc.querySelectorAll('[data-activityname]').forEach((el) => add(clean(el.getAttribute('data-activityname')), 'Activity'));

  // Dashboard (/my/): course cards, category names, Completion Progress block.
  let courses = 0;
  doc.querySelectorAll('.coursename, [data-region="course-content"] .multiline').forEach((el) => {
    const name = ownName(el).replace(/^Course name\s*/i, '');
    if (name && !names.has(name)) add(name, `Sample Course ${++courses}`);
  });
  doc.querySelectorAll('.categoryname').forEach((el) => add(ownName(el).replace(/^Course category\s*/i, ''), 'Sample Category'));
  doc.querySelectorAll('.block_completion_progress h3').forEach((el) => add(ownName(el), `COURSE-${++courses}`));

  doc.querySelectorAll(PERSON_LINK_SELECTOR).forEach((el) => add(clean(el.textContent), 'Person'));
  return { names, sections, activities };
}

export function sanitizeDocument(doc: Document): SanitizeReport {
  const { names, sections, activities } = collectNames(doc);

  let roots = KEEP_ROOTS.map((s) => doc.querySelector(s)).filter((e): e is Element => Boolean(e));
  if (!roots.some((r) => r.matches('#region-main'))) {
    const fallback = FALLBACK_ROOTS.map((s) => doc.querySelector(s)).find(Boolean);
    roots = fallback ? [fallback] : [];
  }

  let removed = 0;
  for (const root of roots) {
    root.querySelectorAll(REMOVE).forEach((el) => { el.remove(); removed++; });
    root.querySelectorAll(DESCRIPTION).forEach((el) => { el.innerHTML = '<p>Sample description.</p>'; });
    // Bulk-edit labels copy label text; restriction notes hold shortened ("...") activity names.
    root.querySelectorAll('label[for*="Checkbox"]').forEach((el) => { el.textContent = 'Select item'; });
    // Completion Progress info: keep status lines, replace activity names.
    root.querySelectorAll('.progressEventInfo').forEach((info) => {
      for (const node of textNodes(info)) {
        if (node.data.trim() && !STATUS_TEXT.test(node.data.trim())) node.data = 'Activity';
      }
    });
    root.querySelectorAll('.availabilityinfo strong, .availabilityinfo a, [data-region="availabilityinfo"] strong')
      .forEach((el) => { el.textContent = 'Activity'; });
    // Any element whose text shows an email likely shows a person next to it.
    for (const node of textNodes(root)) {
      EMAIL.lastIndex = 0;
      if (EMAIL.test(node.data) && node.parentElement) node.parentElement.textContent = 'Person student@example.com';
    }
  }

  // One alternation, longest names first, so replacements never chain or overlap.
  const ordered = [...names.keys()].sort((a, b) => b.length - a.length);
  const nameRe = ordered.length ? new RegExp(ordered.map(escapeRe).join('|'), 'g') : null;
  const scrub = (value: string, isText: boolean) => {
    let out = value.replace(SESSKEY, 'sesskey=REDACTED').replace(EMAIL, 'student@example.com');
    if (isText) out = out.replace(PHONE, '080000000000').replace(LONG_NUMBER, '00000000');
    if (nameRe) out = out.replace(nameRe, (match) => names.get(match) ?? match);
    return out;
  };

  for (const root of roots) {
    for (const node of textNodes(root)) node.data = scrub(node.data.replace(/\s+/g, " "), true);
    for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || /user|email|avatar|token/.test(name)) { el.removeAttribute(attr.name); continue; }
        if (name === 'src' || name === 'srcset') { el.removeAttribute(attr.name); continue; }
        el.setAttribute(attr.name, scrub(clean(attr.value), false));
      }
      if (el.tagName === 'INPUT' && el.getAttribute('type') !== 'checkbox') {
        el.setAttribute('value', el.getAttribute('name') === 'sesskey' ? 'REDACTED' : '');
      }
      if (el.tagName === 'A' && PERSON_LINK.test(el.getAttribute('href') ?? '')) {
        el.setAttribute('href', '#redacted');
        el.textContent = 'Person';
      }
    }
  }

  const body = doc.body;
  const bodyAttrs = body ? ` id="${body.id}" class="${scrub(body.className, false)}"` : '';
  const html = `<!doctype html>\n<html><body${bodyAttrs}>\n${roots.map((r) => r.outerHTML).join('\n')}\n</body></html>\n`;

  const warnings: string[] = [];
  const emailCheck = new RegExp(EMAIL.source, 'i');
  if (emailCheck.test(html.replace(/student@example\.com/g, ''))) warnings.push('Email-like text remains.');
  if (/sesskey=(?!REDACTED)/i.test(html)) warnings.push('Unredacted sesskey remains.');
  if (/\/user\/(profile|view)\.php/.test(html)) warnings.push('Profile link remains.');
  if (/logged in as|anda masuk sebagai/i.test(html)) warnings.push('"Logged in as" text remains.');
  const leaked = ordered.filter((n) => n.length > 3 && html.includes(n));
  if (leaked.length) warnings.push(`${leaked.length} collected name(s) still present.`);
  if (activities === 0 && /page-course-view/.test(body?.id ?? '')) warnings.push('No li.activity found: copy from a course page, or the theme uses other markup.');

  return { html, activities, sections, removed, warnings };
}
