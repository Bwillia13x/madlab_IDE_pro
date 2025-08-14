import fs from 'node:fs'
import path from 'node:path'

const distCjs = path.join(process.cwd(), 'dist-cjs')

function renameIfExists(file, fromExt, toExt) {
  const src = path.join(distCjs, file + fromExt)
  const dst = path.join(distCjs, file + toExt)
  if (fs.existsSync(src)) {
    fs.renameSync(src, dst)
  }
}

renameIfExists('index', '.js', '.cjs')
renameIfExists('schemas', '.js', '.cjs')
renameIfExists('adapters/compute', '.js', '.cjs')


