/**
 * This file is used to throw an error when the library is imported inside a react-server environment.
 *
 * For example, in Next.js
 * ```ts
 * 'use server';
 * import 'jotai/react';
 */
throw new Error('This file cannot be used inside a react-server environment.')
