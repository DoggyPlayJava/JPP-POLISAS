const fs = require('fs');
let text = fs.readFileSync('DEV_GUIDELINE.md', 'utf-8');
const search = `## 13. Modul Keusahawanan — Program CRUD

\`src/pages/keusahawanan/KeusahawananProgram.tsx\` kini adalah **real CRUD** (bukan demo data).

### Jadual Database`;

const replace = `## 13. Modul Keusahawanan — Program CRUD & Pengurusan Perniagaan

\`src/pages/keusahawanan/KeusahawananProgram.tsx\` kini adalah **real CRUD** (bukan demo data).

### Pendaftaran Perniagaan & Mentor
Pelajar boleh mendaftar perniagaan dengan 2 jenis pendaftaran (diuruskan dalam \`KeusahawananOnboarding.tsx\` dan disunting dalam \`UrusPerniagaanPage.tsx\`):
1. **SSM**: Nombor pendaftaran rasmi SSM (contoh: 202101000001).
2. **PUSKEP-POLISAS**: Nombor auto-jana bermula dengan "P-" (contoh: P-001) yang dihasilkan menggunakan database RPC \`generate_puskep_reg_number()\` jika pelajar mengosongkan ruangan SSM.

Mentor: Terdapat dua field baharu, iaitu \`mentor_name\` dan \`mentor_department\`, membolehkan pemantauan dan bimbingan pensyarah direkodkan untuk setiap perniagaan.

Dashboard Exco Keusahawanan (\`KeusahawananUnitDashboard.tsx\`) juga memaparkan statistik pecah-kiraan perniagaan mengikut jenis pendaftaran (SSM vs PUSKEP).

### Jadual Database`;

if (text.includes(search)) {
    fs.writeFileSync('DEV_GUIDELINE.md', text.replace(search, replace));
    console.log('Success');
} else {
    console.log('Search not found');
}
