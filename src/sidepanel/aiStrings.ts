import type { AiErrorCode, AiProviderId } from '../shared/ai/providers';
import type { AiPurpose } from '../shared/ai/prompt';
import type { Locale } from '../shared/types';

const aiStrings = {
  en: {
    aiProvider: 'AI provider (bring your own key)',
    aiProviderHint:
      'AI study is optional. Moodlens has no server: requests go straight from this browser to the provider you choose, with your own key, only after you confirm each one.',
    aiProviderNone: 'Off',
    aiModel: 'Model',
    aiModelSave: 'Save model',
    aiKey: 'API key',
    aiKeyPlaceholder: 'Paste your key',
    aiKeySave: 'Save for this session',
    aiKeyHeld: 'A key is held for this browser session.',
    aiKeyMissing: 'No key saved.',
    aiForgetKey: 'Forget key',
    aiKeyForgotten: 'Keys forgotten.',
    aiKeyStorage:
      'The key is kept in Chrome session storage until you close the browser or press Forget key. Session storage is not encryption. It is never synced, backed up or sent anywhere except to the provider.',
    aiSettingsSaved: 'AI settings saved.',
    aiPermissionRequest: 'Chrome will ask for access to the provider address the first time you send a request.',
    aiProviderTerms: "The provider's own terms, logging and retention apply to whatever you send.",
    aiStudy: 'AI study',
    aiStudyHint:
      'Pick a PDF from your course. Moodlens reads it on this device; only the excerpts you approve are sent.',
    aiChoosePdf: 'Choose PDF',
    aiReading: 'Reading PDF…',
    aiForgetDoc: 'Close document',
    aiPages: 'pages',
    aiDocKept: 'The document stays in this panel only and is gone when you close it or the panel.',
    aiScannedAll: 'This PDF has no readable text. It is probably scanned images; AI study needs a text PDF.',
    aiScannedPartial: 'Some pages have no readable text (probably scanned) and are skipped:',
    aiFailedPages: 'Some pages could not be read and are skipped:',
    aiPdfError: 'This file could not be read as a PDF.',
    aiPdfPassword: 'This PDF is password protected. Open it, save an unprotected copy, and try again.',
    aiPdfTooLarge: 'The PDF is too large (max 30 MB, 400 pages).',
    aiTask: 'What do you want?',
    aiPurpose_summary: 'Summary',
    aiPurpose_question: 'Ask a question',
    aiPurpose_flashcards: 'Flashcards',
    aiPurpose_practice: 'Practice questions',
    aiPurpose_outline: 'Forum idea outline',
    aiQuestion: 'Your question',
    aiTopic: 'Forum topic',
    aiOutlineHint: 'You get ideas only. Write and post your forum reply yourself, in your own words.',
    aiFromPage: 'From page',
    aiToPage: 'To page',
    aiPrepare: 'Review what will be sent',
    aiNoMatch: 'Insufficient evidence: no part of this document matches your question. Nothing was sent.',
    aiConsentTitle: 'Send to AI provider?',
    aiConsentProvider: 'Provider',
    aiConsentDestination: 'Destination',
    aiConsentPurpose: 'Purpose',
    aiConsentText: 'Exact text that will be sent (your key is sent only as a header)',
    aiConsentTokens:
      'About {n} input tokens. Your provider bills this to your account; Moodlens has no cost of its own.',
    aiCancel: 'Cancel',
    aiContinue: 'Continue and send',
    aiSending: 'Waiting for the provider…',
    aiInsufficient:
      'Insufficient evidence: the selected pages do not answer this. Try other pages or another question.',
    aiSources: 'Sources',
    aiPage: 'p.',
    aiDisclaimer: 'AI output can be wrong. Check it against the cited pages.',
    aiCardsTitle: 'Generated cards',
    aiCardsHint: 'Keep the cards you checked and want to study.',
    aiCardsSave: 'Save selected to deck',
    aiCardsSaved: 'Cards saved to the deck.',
    aiCardsNeedDeck: 'Create a deck below first, then save the cards.',
    aiNeedsProvider: 'Choose an AI provider and save a key in Settings to use AI study.',
    aiGuardPaused: 'AI study is paused while an assessment page is open.',
    aiPrivacy:
      'AI study sends the excerpts shown on the consent screen to the provider you chose. Nothing is sent before you press Continue.'
  },
  id: {
    aiProvider: 'Penyedia AI (pakai kunci sendiri)',
    aiProviderHint:
      'Belajar dengan AI bersifat opsional. Moodlens tidak punya server: permintaan langsung dikirim dari browser ini ke penyedia pilihanmu, dengan kuncimu sendiri, hanya setelah kamu menyetujui setiap permintaan.',
    aiProviderNone: 'Mati',
    aiModel: 'Model',
    aiModelSave: 'Simpan model',
    aiKey: 'Kunci API',
    aiKeyPlaceholder: 'Tempel kuncimu',
    aiKeySave: 'Simpan untuk sesi ini',
    aiKeyHeld: 'Ada kunci tersimpan untuk sesi browser ini.',
    aiKeyMissing: 'Belum ada kunci tersimpan.',
    aiForgetKey: 'Lupakan kunci',
    aiKeyForgotten: 'Kunci sudah dilupakan.',
    aiKeyStorage:
      'Kunci disimpan di penyimpanan sesi Chrome sampai kamu menutup browser atau menekan Lupakan kunci. Penyimpanan sesi bukan enkripsi. Kunci tidak pernah disinkronkan, dicadangkan, atau dikirim ke mana pun selain ke penyedia.',
    aiSettingsSaved: 'Pengaturan AI disimpan.',
    aiPermissionRequest: 'Chrome akan meminta akses ke alamat penyedia saat kamu pertama kali mengirim permintaan.',
    aiProviderTerms: 'Ketentuan, pencatatan, dan penyimpanan data milik penyedia berlaku untuk semua yang kamu kirim.',
    aiStudy: 'Belajar dengan AI',
    aiStudyHint:
      'Pilih PDF dari mata kuliahmu. Moodlens membacanya di perangkat ini; hanya kutipan yang kamu setujui yang dikirim.',
    aiChoosePdf: 'Pilih PDF',
    aiReading: 'Membaca PDF…',
    aiForgetDoc: 'Tutup dokumen',
    aiPages: 'halaman',
    aiDocKept: 'Dokumen hanya ada di panel ini dan hilang saat kamu menutupnya atau menutup panel.',
    aiScannedAll:
      'PDF ini tidak punya teks yang bisa dibaca. Kemungkinan berupa hasil pindaian; fitur AI butuh PDF berisi teks.',
    aiScannedPartial: 'Beberapa halaman tidak punya teks yang bisa dibaca (kemungkinan hasil pindaian) dan dilewati:',
    aiFailedPages: 'Beberapa halaman gagal dibaca dan dilewati:',
    aiPdfError: 'Berkas ini tidak bisa dibaca sebagai PDF.',
    aiPdfPassword: 'PDF ini dilindungi kata sandi. Buka, simpan salinan tanpa kata sandi, lalu coba lagi.',
    aiPdfTooLarge: 'PDF terlalu besar (maks. 30 MB, 400 halaman).',
    aiTask: 'Apa yang kamu perlukan?',
    aiPurpose_summary: 'Ringkasan',
    aiPurpose_question: 'Ajukan pertanyaan',
    aiPurpose_flashcards: 'Kartu belajar',
    aiPurpose_practice: 'Soal latihan',
    aiPurpose_outline: 'Kerangka ide forum',
    aiQuestion: 'Pertanyaanmu',
    aiTopic: 'Topik forum',
    aiOutlineHint: 'Kamu hanya mendapat ide. Tulis dan kirim balasan forum sendiri, dengan kata-katamu sendiri.',
    aiFromPage: 'Dari halaman',
    aiToPage: 'Sampai halaman',
    aiPrepare: 'Tinjau yang akan dikirim',
    aiNoMatch:
      'Bukti tidak cukup: tidak ada bagian dokumen ini yang cocok dengan pertanyaanmu. Tidak ada yang dikirim.',
    aiConsentTitle: 'Kirim ke penyedia AI?',
    aiConsentProvider: 'Penyedia',
    aiConsentDestination: 'Tujuan',
    aiConsentPurpose: 'Tujuan penggunaan',
    aiConsentText: 'Teks persis yang akan dikirim (kuncimu hanya dikirim sebagai header)',
    aiConsentTokens: 'Sekitar {n} token masukan. Biaya ditagihkan penyedia ke akunmu; Moodlens tidak memungut biaya.',
    aiCancel: 'Batal',
    aiContinue: 'Lanjutkan dan kirim',
    aiSending: 'Menunggu penyedia…',
    aiInsufficient:
      'Bukti tidak cukup: halaman yang dipilih tidak menjawab ini. Coba halaman lain atau pertanyaan lain.',
    aiSources: 'Sumber',
    aiPage: 'hlm.',
    aiDisclaimer: 'Hasil AI bisa salah. Periksa dengan halaman yang dikutip.',
    aiCardsTitle: 'Kartu yang dibuat',
    aiCardsHint: 'Simpan kartu yang sudah kamu periksa dan ingin kamu pelajari.',
    aiCardsSave: 'Simpan pilihan ke dek',
    aiCardsSaved: 'Kartu disimpan ke dek.',
    aiCardsNeedDeck: 'Buat dek di bawah dulu, lalu simpan kartunya.',
    aiNeedsProvider: 'Pilih penyedia AI dan simpan kunci di Pengaturan untuk memakai fitur AI.',
    aiGuardPaused: 'Fitur AI dijeda selama halaman penilaian terbuka.',
    aiPrivacy:
      'Fitur AI mengirim kutipan yang tampil di layar persetujuan ke penyedia pilihanmu. Tidak ada yang dikirim sebelum kamu menekan Lanjutkan.'
  }
} as const;

const errorStrings: Record<Locale, Record<AiErrorCode, string>> = {
  en: {
    disabled: 'AI study is not available in this build.',
    'no-provider': 'Choose an AI provider in Settings first.',
    'no-key': 'Save your API key in Settings first.',
    permission: 'Chrome access to the provider was not granted, so nothing was sent.',
    guard: 'An assessment page is open, so nothing was sent.',
    expired: 'This confirmation expired. Review the text again before sending.',
    invalid: 'The selection is too large or empty. Choose fewer pages.',
    'too-many': 'Too many requests in a minute. Wait a moment and try again.',
    'bad-key': 'The provider rejected the key or model. Check both in Settings.',
    'rate-limit': 'The provider is rate limiting your key or your quota is used up. Try again later.',
    'provider-down': 'The provider could not be reached. Check your connection or try again later.',
    'bad-response': 'The provider reply could not be used. Try again or choose another model.'
  },
  id: {
    disabled: 'Fitur AI tidak tersedia di versi ini.',
    'no-provider': 'Pilih penyedia AI di Pengaturan dulu.',
    'no-key': 'Simpan kunci API di Pengaturan dulu.',
    permission: 'Akses Chrome ke penyedia tidak diberikan, jadi tidak ada yang dikirim.',
    guard: 'Halaman penilaian sedang terbuka, jadi tidak ada yang dikirim.',
    expired: 'Persetujuan ini kedaluwarsa. Tinjau lagi teksnya sebelum mengirim.',
    invalid: 'Pilihan terlalu besar atau kosong. Pilih lebih sedikit halaman.',
    'too-many': 'Terlalu banyak permintaan dalam semenit. Tunggu sebentar lalu coba lagi.',
    'bad-key': 'Penyedia menolak kunci atau model. Periksa keduanya di Pengaturan.',
    'rate-limit': 'Penyedia membatasi kuncimu atau kuotamu habis. Coba lagi nanti.',
    'provider-down': 'Penyedia tidak bisa dihubungi. Periksa koneksi atau coba lagi nanti.',
    'bad-response': 'Balasan penyedia tidak bisa dipakai. Coba lagi atau pilih model lain.'
  }
};

export type AiStringKey = keyof (typeof aiStrings)['en'];
export function aiText(locale: Locale, key: AiStringKey): string {
  return aiStrings[locale][key];
}
export function aiPurposeText(locale: Locale, purpose: AiPurpose): string {
  return aiStrings[locale][`aiPurpose_${purpose}`];
}
export function aiErrorText(locale: Locale, error: AiErrorCode): string {
  return errorStrings[locale][error];
}
export const AI_PROVIDER_ORDER: readonly AiProviderId[] = ['openai', 'gemini'];
