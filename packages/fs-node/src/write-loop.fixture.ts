// Child process for the crash test (run directly by Node): writes two large, recognisable versions
// of a file in turn, forever, until the test kills it.
import { writeAtomically } from './atomic-write.ts'

const target = process.argv[2] ?? ''
const version = (letter: string): Uint8Array => new TextEncoder().encode(`BEGIN ${letter}\n${letter.repeat(2_000_000)}\nEND ${letter}\n`)
const versions = [version('A'), version('B')]

for (let i = 0; ; i++) await writeAtomically(target, versions[i % 2] ?? new Uint8Array())
