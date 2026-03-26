#!/usr/bin/env npx tsx

/// <reference types="node" />

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { add, complete, cycle, save, suite } from 'benny'
import { atom } from '../src/vanilla/atom.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const main = async () => {
  await suite(
    'atom-creation',
    add('create 10k primitive atoms', () => {
      return () => {
        for (let i = 0; i < 10_000; i++) {
          atom(i)
        }
      }
    }),
    add('create 10k derived atoms', () => {
      const base = atom(0)
      return () => {
        for (let i = 0; i < 10_000; i++) {
          atom((get) => get(base) + i)
        }
      }
    }),
    cycle(),
    complete(),
    save({
      folder: __dirname,
      file: 'atom-creation',
      format: 'json',
    }),
    save({
      folder: __dirname,
      file: 'atom-creation',
      format: 'chart.html',
    }),
  )
}

main()
