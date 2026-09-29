# Teacher OS — UX Architecture

> Rasa: tenang, profesional, modern, intelligent, ringan, fokus. Seperti Notion + Linear + Google Workspace, tapi identitas sendiri. Guru non-teknis harus paham tanpa training. Bukan cockpit pesawat.

## 1. Layout

```
Sidebar | Main Content | Contextual Right Panel (AI/Context)
```

Sidebar (sesuai spec §37):

Home; Teaching (Planning, Materials, Question Bank, Assessment); Students (Students, Classes, Progress); Productivity (Calendar, Tasks, Schedule); Knowledge (Knowledge Base, AI Workspace); Communication (Parents, Messages); Professional (Development, Portfolio); School (Classroom, School Management); AI Assistant; Profile; Settings.

Shortcut global: `Ctrl+K` command palette + AI input "Jelaskan apa yang ingin Anda kerjakan...".

## 2. Page contract (wajib tiap halaman)

1. Saya di mana? (breadcrumb + judul)
2. Apa yang bisa saya lakukan? (primary actions)
3. Apa yang perlu dilakukan berikutnya? (pending/next)
4. Apa yang sudah selesai? (status)
5. Apa saran AI? (AI Insights panel)

## 3. States

* Empty: bukan "No data". Contoh: "Belum ada lesson plan." + `[+ Buat Lesson Plan]` + `[Minta AI Membuatkan]`.
* Loading: skeleton, bukan spinner penuh.
* Error: pesan ramah + Error ID + saran recovery. Tidak tampilkan stack trace.
* AI: `Suggestion → Context → Preview → Confirmation → Result`. Contoh: "Kelas 5 belum punya assessment ekosistem. [Generate Assessment]".

## 4. Design system

Tokens: colors (light/dark), typography, spacing, radius, shadows. Komponen reusable: Button, Input, Select, Modal, Drawer, Tabs, Card, Table/DataGrid (virtualized), Calendar, Timeline, Kanban, RichText, AI Chat, CommandBar, DocPreview, FileUpload, StudentCard, Gradebook, Chart, Empty/Loading/Error.

Aksesibilitas: target WCAG 2.2 AA — keyboard nav, semantic HTML, ARIA, kontras, focus ring, scalable type.

## 5. Responsive

Desktop/laptop prioritas (administrasi). Tablet/mobile tetap usable: sidebar → drawer, tabel → cards, right panel → bottom sheet.
