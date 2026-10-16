import { describe, expect, it } from 'vitest';
import { sanitizeDocument } from '../scripts/sanitize-core';

const RAW = `<body id="page-course-view-topics" class="course-42 pagelayout-course">
  <nav class="navbar"><div class="usermenu"><span class="usertext">Budi Santoso</span></div></nav>
  <div id="page-header"><h1>Basis Data Lanjut</h1></div>
  <div id="region-main">
    <script>M.cfg = { sesskey: "abc123" };</script>
    <a href="https://solusi.sibermu.ac.id/login/logout.php?sesskey=abc123">Log out</a>
    <input type="hidden" name="sesskey" value="abc123">
    <li class="section"><h3 class="sectionname">Pertemuan 1</h3>
      <ul>
        <li class="activity" data-userid="77">
          <a href="https://solusi.sibermu.ac.id/mod/resource/view.php?id=11">
            <span class="instancename">Materi Normalisasi<span class="accesshide"> File</span></span></a>
          <button data-action="toggle-manual-completion" aria-label="Mark Materi Normalisasi as done">Mark as done</button>
          <div class="activity-altcontent">Dosen: budi@sibermu.ac.id, NIM 2023010001</div>
        </li>
      </ul>
    </li>
    <div class="instructor-info"><span class="titles">Siti Aminah siti@sibermu.ac.id</span></div>
    <p>Hubungi 0812-3456-7890 atau +62 813 1111 2222</p>
    <li class="activity modtype_label"><div class="activity-item" data-activityname="Assalamualaikum   rekan
      semua"><label class="sr-only" for="cmCheckbox9">Select activity Assalamualaikum rekan semua</label></div></li>
    <div class="availabilityinfo">Not available unless: The activity <strong>Materi Normal...</strong> is marked complete</div>
    <a href="https://solusi.sibermu.ac.id/user/profile.php?id=77">Budi Santoso</a>
    <img src="https://solusi.sibermu.ac.id/pluginfile.php/1/user/icon.png">
  </div>
</body>`;

describe('fixture sanitizer', () => {
  const report = sanitizeDocument(new DOMParser().parseFromString(RAW, 'text/html'));

  it('removes personal data, secrets and scripts', () => {
    for (const leak of [
      'Budi',
      'budi@',
      'abc123',
      '2023010001',
      '<script',
      'profile.php',
      'data-userid',
      'icon.png',
      'Siti',
      'Assalamualaikum',
      'Normal...',
      '3456',
      '1111 2222'
    ]) {
      expect(report.html).not.toContain(leak);
    }
    expect(report.warnings).toEqual([]);
  });

  it('replaces course text with synthetic labels and keeps Moodle structure', () => {
    expect(report.html).toContain('Sample Course');
    expect(report.html).toContain('Section 1');
    expect(report.html).toContain('Activity 1<span class="accesshide"> File</span>');
    expect(report.html).toContain('aria-label="Mark Activity 1 as done"');
    expect(report.html).toContain('/mod/resource/view.php?id=11');
    expect(report.html).toContain('class="course-42 pagelayout-course"');
    expect(report.activities).toBe(2);
  });
});
