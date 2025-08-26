import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(md: string): string {
  // Very small, safe-ish renderer: escape, then apply minimal formatting
  // Handle code fences first
  const parts = md.split(/```/);
  let html = '';
  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i];
    if (i % 2 === 1) {
      // code block
      html += `<pre class="bg-[#1e1e1e] text-[#eaeaea] p-3 rounded overflow-auto"><code>${escapeHtml(segment)}</code></pre>`;
    } else {
      // normal text: process line by line
      const lines = segment.split(/\r?\n/);
      let inList = false;
      for (const line of lines) {
        if (line.startsWith('### ')) {
          if (inList) { html += '</ul>'; inList = false; }
          html += `<h3 class="text-sm font-semibold mt-3">${escapeHtml(line.slice(4))}</h3>`;
        } else if (line.startsWith('## ')) {
          if (inList) { html += '</ul>'; inList = false; }
          html += `<h2 class="text-base font-semibold mt-4">${escapeHtml(line.slice(3))}</h2>`;
        } else if (line.startsWith('# ')) {
          if (inList) { html += '</ul>'; inList = false; }
          html += `<h1 class="text-lg font-bold mt-4">${escapeHtml(line.slice(2))}</h1>`;
        } else if (line.startsWith('- ')) {
          if (!inList) { html += '<ul class="list-disc list-inside my-2">'; inList = true; }
          html += `<li>${escapeHtml(line.slice(2))}</li>`;
        } else if (line.trim() === '') {
          if (inList) { html += '</ul>'; inList = false; }
          html += '<div class="h-2"></div>';
        } else {
          html += `<p class="my-1">${escapeHtml(line)}</p>`;
        }
      }
      if (inList) { html += '</ul>'; }
    }
  }
  return html;
}

export default async function DocsPage({ searchParams }: { searchParams?: { file?: string } }) {
  const docsDir = path.join(process.cwd(), 'docs');
  let files: string[] = [];
  try {
    files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'));
  } catch {
    files = [];
  }

  const file = (searchParams?.file && files.includes(searchParams.file)) ? searchParams.file : (files.includes('README.md') ? 'README.md' : files[0]);

  let content = '# No docs found\n\nGenerate docs via Command Palette → Regenerate Docs.';
  if (file) {
    try {
      content = fs.readFileSync(path.join(docsDir, file), 'utf8');
    } catch {}
  }

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
      <aside className="md:col-span-1 border rounded p-3 h-max">
        <div className="text-sm font-medium mb-2">Documentation</div>
        <ul className="space-y-1 text-sm">
          {files.map((f) => {
            const href = `/docs?file=${encodeURIComponent(f)}`;
            const active = f === file;
            return (
              <li key={f}>
                <a href={href} className={active ? 'font-semibold' : 'text-muted-foreground hover:underline'}>
                  {f}
                </a>
              </li>
            );
          })}
          {files.length === 0 && <li className="text-muted-foreground">No .md files in docs/</li>}
        </ul>
      </aside>
      <main className="md:col-span-3 border rounded p-3 bg-background overflow-auto prose prose-invert max-w-none text-sm">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
      </main>
    </div>
  );
}
