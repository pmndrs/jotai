import path from 'path'
import glob from 'glob'

export const README_PATH = path.join(process.cwd(), '../readme.md')

export const DOCS_PATH = path.join(process.cwd(), '../docs')

export const docFilePaths = glob
  .sync(`${DOCS_PATH}/**/*.{md,mdx}`)
  .map((path) => path.slice(DOCS_PATH.length + 1))
