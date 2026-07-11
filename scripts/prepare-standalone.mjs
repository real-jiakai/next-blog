#!/usr/bin/env node

import { cp, mkdir, readdir, readlink, rm, stat, symlink } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const standaloneRoot = path.resolve(root, '.next', 'standalone')
const copies = [
	{
		source: path.resolve(root, 'public'),
		destination: path.resolve(standaloneRoot, 'public'),
	},
	{
		source: path.resolve(root, '.next', 'static'),
		destination: path.resolve(standaloneRoot, '.next', 'static'),
	},
]

function assertGeneratedDestination(destination) {
	if (!destination.startsWith(`${standaloneRoot}${path.sep}`)) {
		throw new Error(`Refusing to replace path outside standalone output: ${destination}`)
	}
}

async function repairWindowsSymlinks(directory) {
	const entries = await readdir(directory, { withFileTypes: true })
	for (const entry of entries) {
		const source = path.join(directory, entry.name)
		if (entry.isSymbolicLink()) {
			const target = path.resolve(directory, await readlink(source))
			assertGeneratedDestination(target)
			const targetStats = await stat(target)
			await rm(source, { recursive: false, force: true })
			await symlink(
				target,
				source,
				targetStats.isDirectory() ? 'junction' : 'file'
			)
		} else if (entry.isDirectory()) {
			await repairWindowsSymlinks(source)
		}
	}
}

await stat(path.join(standaloneRoot, 'server.js'))

// Next's Windows file tracer can emit directory symlinks without the directory
// reparse flag, which Node cannot stat at runtime. Recreate those links as
// directory junctions; Linux/Docker keeps the original lean symlink tree.
if (process.platform === 'win32') {
	await repairWindowsSymlinks(path.join(standaloneRoot, 'node_modules'))
}

for (const { source, destination } of copies) {
	assertGeneratedDestination(destination)
	await rm(destination, { recursive: true, force: true })
	await mkdir(path.dirname(destination), { recursive: true })
	await cp(source, destination, { recursive: true, force: true })
}

console.log('Prepared standalone server with public and Next.js static assets')
